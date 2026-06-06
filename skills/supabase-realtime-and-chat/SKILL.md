---
name: supabase-realtime-and-chat
description: >
  Actúa como el Realtime & Chat Developer para Virtud Gym. Úsalo para configurar
  canales de WebSocket en Supabase, escuchar cambios de base de datos en tiempo real
  (postgres_changes) y sincronizar estados de chat de forma eficiente.
---

# 💬 Supabase Realtime & Chat - Virtud Gym

## Overview
Esta skill define los estándares para implementar flujos de comunicación instantánea (chats entre Coach y Alumno) y sincronización de datos en tiempo real mediante los canales de WebSocket de **Supabase Realtime**.

---

## 🏗️ Ciclo de Vida de Canales Realtime en React

Para evitar conexiones WebSocket huérfanas, fugas de memoria y llamadas redundantes al re-renderizar componentes, la suscripción y limpieza del canal debe estructurarse estrictamente dentro de un hook `useEffect`:

```typescript
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { ChatMessage } from '@/types/chat';

export function useChatChannel(recipientId: string, currentUserId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    if (!recipientId || !currentUserId) return;

    // 1. Crear y configurar canal único para la conversación
    const channel = supabase
      .channel(`chat_${recipientId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mensajes',
        },
        (payload) => {
          const nuevoMensaje = payload.new as ChatMessage;
          
          // Validar que el mensaje pertenezca a la conversación activa
          const esDeConversacion = 
            (nuevoMensaje.remitente_id === recipientId && nuevoMensaje.receptor_id === currentUserId) ||
            (nuevoMensaje.remitente_id === currentUserId && nuevoMensaje.receptor_id === recipientId);

          if (esDeConversacion) {
            setMessages((prev) => {
              // Evitar mensajes duplicados comprobando la clave primaria (id)
              if (prev.some((m) => m.id === nuevoMensaje.id)) return prev;
              return [...prev, nuevoMensaje];
            });
          }
        }
      )
      .subscribe();

    // 2. RETORNAR FUNCIÓN DE LIMPIEZA (MANDATORIO)
    // Cierra el canal WebSocket cuando el componente se desmonte o cambie el destinatario
    return () => {
      supabase.removeChannel(channel);
    };
  }, [recipientId, currentUserId]);

  return { messages, setMessages };
}
```

---

## 🚀 Desencadenamiento de Alertas Push (Flujo No Bloqueante)

Cuando un usuario envía un mensaje, el registro se inserta en la base de datos de forma asíncrona. La llamada para notificar al receptor mediante Push Notifications debe ejecutarse en segundo plano (no bloqueante) para no demorar la actualización visual de la caja de chat:

```typescript
const handleEnviarMensaje = async (contenido: string) => {
  // 1. Insertar mensaje en Supabase
  const { data, error } = await supabase
    .from('mensajes')
    .insert({
      remitente_id: currentUser.id,
      receptor_id: recipient.id,
      contenido
    })
    .select()
    .single();

  if (!error && data) {
    // 2. Disparar webhook push de manera asíncrona (no bloqueante)
    fetch('/api/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipientId: recipient.id,
        title: `💬 Mensaje de ${currentUser.nombre_completo}`,
        body: contenido,
        url: currentUser.rol === 'member' ? '/coach/students' : '/dashboard/messages'
      })
    }).catch((err) => console.error('Error silencioso enviando notificación push:', err));
  }
};
```

---

## Common Mistakes
1. **Omitir la función de limpieza (Unsubscribe):** No retornar `supabase.removeChannel(channel)` en el return de `useEffect`, provocando que cada render de componente cree un nuevo WebSocket activo, lo que satura las cuotas de conexión de Supabase y ralentiza el navegador.
2. **Falta de Validación de Mensajes en el Callback:** Agregar a la lista del chat cualquier fila insertada en la tabla `mensajes` sin validar que los campos `remitente_id` y `receptor_id` correspondan exactamente a los usuarios de la conversación activa, mostrando mensajes de otros chats privados.
3. **Duplicar Mensajes en Optimistic Updates:** Añadir un mensaje localmente (Optimistic Update) y no controlar que el mensaje recibido por el canal de WebSocket tenga el mismo ID temporal o definitivo, mostrando el mismo mensaje dos veces en pantalla.
