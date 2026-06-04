---
name: sentry-and-observability
description: >
  Actúa como el Observability Specialist para Virtud Gym. Úsalo para capturar excepciones
  e instrumentar telemetría con Sentry en Next.js, y diseñar registros de logs estructurados
  en base de datos para auditoría.
---

# 📊 Sentry & Observability - Virtud Gym

## Overview
Esta skill define los estándares para monitorear errores y registrar eventos críticos de negocio en Virtud Gym, facilitando el diagnóstico rápido de incidentes en producción mediante la captura de excepciones con **Sentry** y logs estructurados en base de datos.

---

## 🔒 Monitoreo de Excepciones con Sentry

Sentry está configurado para capturar fallos en los tres entornos de Next.js: Cliente, Servidor (APIs y Server Actions), y Edge.

### 1. Captura de Errores Manual con Contexto
Evita usar simplemente `console.error` dentro de bloques catch en procesos críticos. Adjunta tags y contextos que ayuden a depurar:
```typescript
import * as Sentry from '@sentry/nextjs';

async function procesarPagoMercadoPago(payload: any) {
  try {
    // Lógica crítica de pagos...
  } catch (error: any) {
    Sentry.withScope((scope) => {
      // Tags para filtrar rápidamente en la consola de Sentry
      scope.setTag('transaction_type', 'mercadopago_webhook');
      scope.setTag('payment_id', payload.data?.id);
      
      // Contexto adicional estructurado
      scope.setContext('payload_info', {
        action: payload.action,
        user_id: payload.user_id,
        error_message: error.message
      });
      
      Sentry.captureException(error);
    });
    
    throw error; // Re-lanzar o manejar según corresponda
  }
}
```

---

## 🗄️ Logs Estructurados de Auditoría (`audit_logs`)

Para registrar acciones clave (como accesos de admin, cambios de rol de usuarios, borrado de videos), utilizamos la tabla `audit_logs` en Supabase con estructura relacional + campo JSONB:

### 1. Estructura de la Tabla en PostgreSQL
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  usuario_id UUID REFERENCES perfiles(id) ON DELETE SET NULL,
  accion VARCHAR(100) NOT NULL, -- Ej: 'cambio_rol', 'reserva_eliminada'
  detalles JSONB NOT NULL,     -- Almacena metadatos flexibles (antes/después)
  ip_address VARCHAR(45)
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
-- Solo DevSecOps / Administradores pueden consultar logs globales
```

### 2. Escritura de Logs desde un Server Action
```typescript
import { supabase } from '@/lib/supabase/client';

async function registrarAccionDeAuditoria(accion: string, detalles: object) {
  const { data: { user } } = await supabase.auth.getUser();
  
  await supabase
    .from('audit_logs')
    .insert({
      usuario_id: user?.id,
      accion,
      detalles
    });
}

// Ejemplo de uso al cambiar el rol de un alumno:
await registrarAccionDeAuditoria('actualizar_rol_usuario', {
  alumno_id: 'alumno-123',
  rol_anterior: 'alumno',
  rol_nuevo: 'coach',
  motivo: 'Asignación de entrenador principal'
});
```

---

## Common Mistakes
1. **Captura Genérica de Errores:** Enviar excepciones a Sentry sin tags ni metadatos contextuales (como el ID del usuario o el cuerpo de la transacción), obligando al equipo a adivinar la causa de la excepción.
2. **Logs con Datos Sensibles:** Registrar contraseñas, tokens de tarjetas de crédito o información médica sin encriptar dentro del campo JSONB de `audit_logs` o de Sentry, violando regulaciones de privacidad.
3. **Ignorar Errores en Edge Functions:** No inicializar correctamente el DSN de Sentry en el archivo `sentry.edge.config.ts`, perdiendo visibilidad sobre los middleware o reescrituras de rutas que fallan en la CDN.
