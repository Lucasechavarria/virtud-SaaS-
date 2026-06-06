---
name: gemini-integration-tester
description: >
  Actúa como el Gemini AI Integrator & Architect para Virtud Gym. Úsalo para probar
  conexiones y prompts de Gemini, y diseñar integraciones de IA desacopladas bajo
  los principios SOLID (DIP y OCP).
---

# 🤖 Gemini Integration Tester & SOLID Architect - Virtud Gym

## Overview
Esta skill proporciona las herramientas y metodologías necesarias para integrar, probar y depurar servicios de Inteligencia Artificial (Google Gemini SDK) en Virtud Gym, aplicando arquitectura desacoplada y principios de diseño de software (**SOLID**).

---

## 🛠️ Herramientas de Pruebas de IA

Utiliza los siguientes scripts locales para simular e inspeccionar las respuestas de Gemini sin levantar el frontend:

### 1. Test de Conexión Básica e Interactions
Comprueba que tu `GEMINI_API_KEY` en `.env.local` sea válida y valida la compatibilidad con interacciones de Gemini 3.
```bash
node scripts/test-gemini.js
```

### 2. Depuración Completa del Modelo
Imprime en consola las respuestas en bruto (raw response) y los metadatos de tokens consumidos por Gemini.
```bash
node scripts/debug-gemini-full.js
```

### 3. Prueba de Prompt Específico
Envía prompts de prueba y valida si el modelo retorna un JSON válido para análisis de video o rutinas.
```bash
node scripts/test_prompt.js
```

---

## 🏗️ Arquitectura y Principios SOLID en Integración de IA

Para evitar que los modelos de IA acoplen la lógica del proyecto, debes aplicar las siguientes directrices de arquitectura:

### 1. Principio de Inversión de Dependencias (DIP - SOLID)
* **Regla:** Los módulos de alto nivel (como controladores de API o Server Actions) no deben depender directamente de módulos de bajo nivel (como el SDK de Gemini). Ambos deben depender de abstracciones.
* **Aplicación:** Nunca instancies `new GoogleGenAI` dentro de un endpoint. Toda llamada a la IA debe realizarse a través de un servicio adaptador o interfaz:

```typescript
// src/services/ai/ai.interface.ts
export interface IAIService {
  analizarVideoEntrenamiento(videoUrl: string): Promise<ResultadoAnalisisVideo>;
  generarRutinaPersonalizada(datosAtleta: DatosAtleta): Promise<RutinaGenerada>;
}

// src/services/ai/gemini-ai.service.ts
import { GoogleGenAI } from '@google/genai';
import type { IAIService } from './ai.interface';

export class GeminiAIService implements IAIService {
  private client: GoogleGenAI;
  
  constructor() {
    this.client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }

  async analizarVideoEntrenamiento(videoUrl: string) {
    // Implementación usando el SDK de Gemini
  }
  
  async generarRutinaPersonalizada(datosAtleta: DatosAtleta) {
    // Implementación
  }
}
```

### 2. Principio de Abierto/Cerrado (OCP - SOLID)
* **Regla:** El software debe estar abierto a la extensión pero cerrado a la modificación.
* **Aplicación:** Si agregas una nueva corrección física (por ejemplo: analizar la inclinación de la columna en sentadilla), no deberías modificar el analizador core del video. Diseña los prompts y validadores (Zod schemas) de forma modular para que puedas registrar nuevas reglas de análisis sin alterar el flujo principal.

### 3. Respuestas Estructuradas y Validación de Tipos (Zod)
* Toda respuesta de la IA utilizada por la aplicación debe ser validada en tiempo de ejecución.
* **Flujo obligatorio:**
  1. Definir el schema Zod (`ZodSchema`).
  2. Solicitar en el prompt al modelo que retorne obligatoriamente un JSON estructurado que cumpla con el schema.
  3. Parsear el resultado: `zodSchema.parse(JSON.parse(apiResponse))`.

---

## Common Mistakes
1. **Acoplamiento Directo (Hardcoding SDK):** Importar e inicializar el SDK de Gemini directamente en las rutas de API de Next.js, imposibilitando mockear la IA en pruebas unitarias.
2. **Confiar ciegamente en el formato de la IA:** Procesar la respuesta del modelo sin validar la presencia de propiedades con Zod, causando errores de ejecución inesperados si el modelo alucina o cambia la estructura del JSON.
3. **No Limitar el Tamaño del Input:** Enviar videos pesados o textos excesivos a la API sin validación de tamaño previa, causando timeouts y costos elevados de API.
