---
name: api-rate-limiting-and-queues
description: >
  Actúa como el Traffic & Queue Architect para Virtud Gym. Úsalo para configurar
  rate limits en endpoints (Upstash Redis) y gestionar colas de tareas asíncronas
  en segundo plano (BullMQ).
---

# 🚦 API Rate Limiting & Queues - Virtud Gym

## Overview
Esta skill define los patrones para regular el tráfico entrante a nuestras APIs de servidor y procesar de manera eficiente tareas pesadas (como el análisis de postura en videos mediante IA) sin degradar la experiencia en tiempo real de la aplicación.

---

## 🔒 Control de Tráfico (Upstash Redis Rate Limiting)

Para proteger a la plataforma de ataques de denegación de servicio (DoS) y prevenir sobrecostos de llamadas a Gemini API, aplicamos control de flujo basado en la dirección IP o la sesión de usuario:

### Ejemplo de Implementación en Middleware / Route Handler
```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Crear limitador: Máximo 5 peticiones por ventana de 10 segundos
const rateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '10 s'),
  analytics: true,
});

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for') ?? '127.0.0.1';
  const { success, limit, remaining, reset } = await rateLimiter.limit(`api_limit_${ip}`);

  if (!success) {
    return NextResponse.json(
      { success: false, error: 'Demasiadas solicitudes. Inténtalo de nuevo más tarde.' },
      { 
        status: 429,
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': reset.toString(),
        }
      }
    );
  }
  
  // Continuar con la lógica del endpoint...
}
```

---

## ⚙️ Procesamiento en Segundo Plano (BullMQ & Redis)

El procesamiento de videos de ejercicios utiliza **BullMQ** para encolar trabajos de larga duración y procesarlos de manera asíncrona mediante workers dedicados.

### 1. Productor: Agregar Tarea a la Cola
```typescript
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis(process.env.REDIS_URL!);
const videoQueue = new Queue('video-analysis', { connection });

async function encolarAnalisisDeVideo(videoId: string) {
  await videoQueue.add('analyze', { videoId }, {
    attempts: 3, // Intentar hasta 3 veces si falla
    backoff: { type: 'exponential', delay: 5000 } // Esperar 5s con incremento exponencial
  });
}
```

### 2. Consumidor: Ejecutar el Worker
El worker corre en un proceso independiente del servidor HTTP de Next.js para evitar el bloqueo del event loop:
```typescript
import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { analizarVideoConGemini } from '@/services/ai';
import { registrarProgresoVideo } from '@/services/videos';

const connection = new IORedis(process.env.REDIS_URL!);

const videoWorker = new Worker('video-analysis', async (job) => {
  const { videoId } = job.data;
  
  // Transición: procesando
  await registrarProgresoVideo(videoId, 'procesando');

  // Llamar al adaptador de IA
  const resultado = await analizarVideoConGemini(videoId);
  
  // Guardar resultado y transición: analizado
  await registrarProgresoVideo(videoId, 'analizado', resultado);
}, { connection, concurrency: 2 }); // Concurrencia de 2 tareas paralelas máximo por worker

videoWorker.on('failed', (job, err) => {
  console.error(`🚨 Falló el trabajo ${job?.id}: ${err.message}`);
  // Aquí podemos disparar alertas a Sentry o actualizar el estado del video a 'error'
});
```

---

## Common Mistakes
1. **Conexiones Redis Frecuentes:** Instanciar `new IORedis` en cada petición API de Next.js en lugar de mantener una conexión única reutilizable (singleton pattern), agotando rápidamente los sockets libres en el servidor.
2. **Workers en Serverless Functions:** Intentar ejecutar workers de BullMQ de larga duración dentro de Vercel Serverless Functions, lo que genera interrupciones por timeouts del proveedor (límite común de 10s - 30s).
3. **Ignorar Reintentos Infinitos:** No configurar un límite máximo de intentos (`attempts`) en la cola, causando que un video corrupto vuelva a procesarse indefinidamente y sature los recursos del servidor.
