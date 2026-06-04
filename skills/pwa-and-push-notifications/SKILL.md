---
name: pwa-and-push-notifications
description: >
  Actúa como el PWA & Push Notifications Specialist para Virtud Gym. Úsalo para
  diseñar service workers, establecer estrategias de caché (Workbox) para modo offline
  y gestionar el flujo de notificaciones push (VAPID/Web-Push).
---

# 📱 PWA & Push Notifications - Virtud Gym

## Overview
Esta skill define las pautas para mantener la experiencia móvil y offline-first en Virtud Gym, guiando la configuración de service workers, el almacenamiento en caché de activos estáticos y dinámicos (rutinas y clases) y el envío seguro de alertas push.

---

## 🏗️ Estrategia de Service Worker (`sw.ts` / Workbox)

El service worker utiliza **Workbox** para la precarga y el enrutamiento de recursos. Las estrategias de caché definidas son:

### 1. Fuentes Externas (`StaleWhileRevalidate`)
Úsalo para tipografías (Google Fonts). Sirve el recurso desde el caché inmediatamente para velocidad (LCP) y actualiza el caché en segundo plano.
```typescript
registerRoute(
    ({ url }) => url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
    new StaleWhileRevalidate({ cacheName: 'google-fonts' })
);
```

### 2. Imágenes de Gimnasio (`CacheFirst`)
Úsalo para imágenes estáticas y multimedia ligeras (logos, iconos). Guarda en caché hasta por 30 días o un máximo de 60 entradas antes de solicitar red.
```typescript
new CacheFirst({
    cacheName: 'gym-images',
    plugins: [
        new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 }),
        new CacheableResponsePlugin({ statuses: [0, 200] })
    ]
})
```

### 3. Rutas de Navegación y Dashboard (`NetworkFirst`)
Úsalo para las pantallas de rutinas y reservas. Intenta obtener los datos actualizados de internet. Si el usuario no tiene conexión (dentro del gimnasio), carga el último estado guardado en el caché para mantener la app funcional.

---

## 🔔 Notificaciones Push (Web Push Protocol)

El envío de notificaciones se divide en tres partes:

### 1. Suscripción en el Cliente
El navegador del usuario solicita permiso y registra la suscripción con la clave pública VAPID:
```typescript
const registration = await navigator.serviceWorker.ready;
const subscription = await registration.pushManager.subscribe({
  userVisibleOnly: true,
  applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY)
});
// Enviar la "subscription" (objeto JSON) al backend para guardarla en Supabase
```

### 2. Envío desde el Servidor (Web-Push)
El backend recupera la suscripción de Supabase y envía la notificación utilizando la librería `web-push`:
```typescript
import webpush from 'web-push';

webpush.setVapidDetails(
  'mailto:soporte@virtudgym.com',
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

await webpush.sendNotification(
  subscription,
  JSON.stringify({
    title: 'Nueva Rutina Asignada',
    body: 'Tu coach ha subido tu rutina para la semana. ¡A entrenar!',
    url: '/dashboard/rutinas'
  })
);
```

### 3. Recepción en el Service Worker (`push` event)
El service worker escucha el evento, parsea el JSON y muestra la alerta del sistema operativo:
```typescript
self.addEventListener('push', (event) => {
    if (!event.data) return;
    const data = event.data.json();
    event.waitUntil(
        self.registration.showNotification(data.title, {
            body: data.body,
            icon: '/icons/icon-192x192.png',
            data: { url: data.url }
        })
    );
});
```

---

## Common Mistakes
1. **Cachear Respuestas Opacas de Redes Externas:** Intentar almacenar en caché recursos de otras CDNs sin configurar `CacheableResponsePlugin` con estados `[0, 200]`, lo que causa que el almacenamiento de la PWA colapse con archivos de tamaño indeterminado.
2. **Llaves VAPID en el Repositorio:** Hardcodear las claves VAPID privadas en el código en lugar de leerlas desde variables de entorno seguras en Supabase/Vercel.
3. **No Manejar Expiración de Suscripciones (410 Gone):** Omitir el borrado en base de datos de los tokens de suscripción push que MercadoPago o el navegador marcan como expirados (error HTTP 410), acumulando registros basura y relentizando los envíos de notificaciones.
