---
name: saas-tenancy-and-rbac
description: >
  Actúa como el SaaS & RBAC Architect para Virtud Gym. Úsalo para configurar
  el aislamiento de inquilinos (Tenancy por subdominios), analizar permisos del JWT
  y proteger rutas jerárquicas en Next.js Middleware.
---

# 🏢 SaaS Tenancy & RBAC Architect - Virtud Gym

## Overview
Esta skill define los patrones y reglas de seguridad para mantener el aislamiento de inquilinos (gimnasios multitenant) y el control de acceso basado en roles (RBAC) a nivel perimetral (Edge Middleware) y en Server Components (RSC) dentro de Virtud Gym.

---

## 🏗️ Estructura de Permisos del JWT y claims de Usuario

El sistema delega la extracción de permisos al token de sesión de Supabase. Los permisos se estructuran en `app_metadata` y representan banderas booleanas específicas:

```typescript
export interface UserPermissions {
    admin?: boolean;      // Acceso completo al panel del gimnasio (/admin)
    pos?: boolean;        // Punto de venta (/admin/recepcion/pos)
    caja?: boolean;       // Caja y balances financieros
    rutinas?: boolean;    // Creación de planes de ejercicio (/coach)
    asistencia?: boolean; // Toma de asistencia de alumnos y profesores
    nutricion?: boolean;  // Planes nutricionales
}
```

### Reglas de Aislamiento de Inquilino (Tenancy)
1. **Entorno Local (Localhost):** El gimnasio activo se identifica en el primer segmento de la URL: `http://localhost:3000/[tenantSlug]/dashboard`.
2. **Entorno Producción:** El gimnasio activo se aísla mediante subdominios: `https://[tenantSlug].virtud.fit/dashboard`.
3. **Validación Cruzada:** El middleware valida que la membresía del usuario esté asociada al `gimnasio_id` (o `gimnasio_slug`) de la URL. Si hay desajuste, se redirige inmediatamente al usuario a su subdominio legítimo.

---

## 🛡️ Tubería de Guardianes (Edge Middleware Pipeline)

El middleware ejecuta secuencialmente comprobaciones en el Edge (Chain of Responsibility) para proteger las rutas sin latencia. Si implementas un nuevo panel o módulo, asegúrate de añadirlo a las exclusiones del middleware o registrar su ruta en la constante `MODULE_ROUTES` para su respectivo Gating de Planes.

---

## ⚠️ Pitfall Crítico de Next.js: Excepciones de Redirección en RSC

Cuando utilices funciones de gating en Server Components (`checkModuleAccess` en `src/lib/gating.ts`), ten en cuenta que la función `redirect()` de Next.js funciona **lanzando un error interno de control** (`NEXT_REDIRECT`).

Si envuelves tu código en un bloque `try/catch` genérico, puedes **tragar el error de redirección** accidentalmente, bloqueando el comportamiento del framework y causando fallos silenciosos.

### Forma Correcta de Atrapar Errores en Gating
```typescript
import { redirect } from 'next/navigation';

export async function checkFeatureAccess(moduloRequerido: string, tenant: string) {
  try {
    const tieneAcceso = await verificarAcceso(moduloRequerido);
    
    if (!tieneAcceso) {
      // 1. Ejecutar redirect
      redirect(`/tenants/${tenant}/modulo-bloqueado`);
    }
  } catch (error: any) {
    // 2. IMPORTANTE: Re-lanzar los errores de control de Next.js
    if (error && error.digest && error.digest.startsWith('NEXT_REDIRECT')) {
      throw error;
    }
    
    // 3. Fail Open Seguro: Ante cualquier otra excepción de red o DB, permitir el acceso
    // y registrar el error en consola para depurar
    console.error("Excepción controlada en Gate de SaaS:", error);
    return;
  }
}
```

---

## Common Mistakes
1. **Capturar NEXT_REDIRECT:** Swallower (tragar) la excepción de redirección de Next.js en un catch de Server Action o Componente de Servidor, lo que causa pantallas blancas y bloqueos del navegador.
2. **Hardcodear Validación de Subdominios:** Asumir que la aplicación corre siempre con subdominios y no dar soporte a las rutas basadas en paths en `localhost` durante el desarrollo local, imposibilitando las pruebas de integraciones.
3. **Confiar solo en Middleware:** Omitir las reglas de políticas de base de datos RLS asumiendo que el Middleware de Next.js ya protege los datos. Si un atacante burla el middleware consumiendo la base de datos directamente con la clave anónima de Supabase, podría acceder a datos privados. El middleware protege la navegación, **RLS protege los datos**.
