---
name: resend-email-notifications
description: >
  Actúa como el Email Communications Specialist para Virtud Gym. Úsalo para diseñar
  y enviar correos electrónicos transaccionales interactivos utilizando la API de Resend
  y plantillas HTML responsivas.
---

# ✉️ Resend Email Notifications - Virtud Gym

## Overview
Esta skill define los estándares y procedimientos para estructurar, maquetar y enviar notificaciones por correo electrónico en Virtud Gym, utilizando la API de **Resend** para comunicaciones transaccionales (facturas, alertas, confirmaciones y reportes).

---

## 🛠️ Configuración de Resend SDK

El envío se realiza instanciando el cliente oficial de Resend y consumiendo su API REST de manera segura mediante variables de entorno:

```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface EmailPayload {
  to: string;
  subject: string;
  htmlContent: string;
}

export async function enviarCorreoTransaccional({ to, subject, htmlContent }: EmailPayload) {
  try {
    const data = await resend.emails.send({
      from: 'Virtud Gym <alertas@virtudgym.com>', // Debe ser un dominio verificado en Resend
      to: [to],
      subject: subject,
      html: htmlContent,
      tags: [
        { name: 'category', value: 'transactional' }
      ]
    });
    
    return { success: true, data };
  } catch (error: any) {
    console.error('❌ Error al enviar correo via Resend:', error.message);
    return { success: false, error: error.message };
  }
}
```

---

## 🎨 Maquetación de Plantilla HTML (Estilo Premium)

Toda plantilla de correo electrónico debe ser responsiva y utilizar estilos CSS en línea (inline styles) para garantizar la compatibilidad con clientes de correo clásicos (Gmail, Outlook, Apple Mail) sin perder la identidad visual de Virtud Gym:

```typescript
export function generarTemplateAltaAlumno(nombre: string, codigoAcceso: string): string {
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Bienvenido a Virtud Gym</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #0b0b0f; font-family: 'Inter', Helvetica, Arial, sans-serif; color: #ffffff;">
      <table align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="border-collapse: collapse; background-color: #12121a; margin-top: 40px; margin-bottom: 40px; border: 1px solid #1a1a24; border-radius: 12px; overflow: hidden;">
        
        <!-- Header con acento Neón -->
        <tr>
          <td align="center" style="padding: 40px 0; background-color: #12121a; border-bottom: 2px solid #00F5FF;">
            <h1 style="margin: 0; font-size: 28px; font-weight: 800; color: #00F5FF; letter-spacing: 2px; text-transform: uppercase;">VIRTUD GYM</h1>
            <p style="margin: 5px 0 0 0; font-size: 10px; color: #a1a1aa; text-transform: uppercase; letter-spacing: 3px;">Elite Training Club</p>
          </td>
        </tr>
        
        <!-- Body -->
        <tr>
          <td style="padding: 40px 30px;">
            <h2 style="font-size: 20px; font-weight: 700; margin-top: 0; color: #ffffff;">¡Hola, ${nombre}!</h2>
            <p style="font-size: 14px; line-height: 1.6; color: #d4d4d8;">
              Tu cuenta de entrenamiento ha sido creada con éxito por tu Coach. Ahora tienes acceso completo a nuestro hub de inteligencia artificial, registro de entrenamientos y analíticas.
            </p>
            
            <!-- Bloque de código de acceso -->
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0b0b0f; border: 1px solid #27272a; border-radius: 8px; margin: 30px 0;">
              <tr>
                <td align="center" style="padding: 20px;">
                  <span style="display: block; font-size: 10px; text-transform: uppercase; color: #71717a; letter-spacing: 1px; margin-bottom: 8px;">Tu código de acceso temporal</span>
                  <span style="font-family: 'Courier New', monospace; font-size: 24px; font-weight: 800; color: #FF00FF; letter-spacing: 4px;">${codigoAcceso}</span>
                </td>
              </tr>
            </table>
            
            <!-- Botón CTA -->
            <table border="0" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td align="center">
                  <a href="https://virtudgym.com/login" target="_blank" style="background-color: #00F5FF; color: #000000; text-decoration: none; padding: 15px 30px; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; border-radius: 6px; display: inline-block;">Ingresar a la Plataforma</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        
        <!-- Footer -->
        <tr>
          <td align="center" style="padding: 30px; background-color: #0b0b0f; border-top: 1px solid #1a1a24; font-size: 11px; color: #71717a;">
            <p style="margin: 0;">Este es un correo automático enviado por Virtud Gym.</p>
            <p style="margin: 5px 0 0 0;">Si tienes dudas, contáctanos en <a href="mailto:soporte@virtudgym.com" style="color: #00F5FF; text-decoration: none;">soporte@virtudgym.com</a></p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}
```

---

## Common Mistakes
1. **Dominio de Envío No Verificado:** Intentar enviar correos desde una dirección como `@virtudgym.com` antes de haber verificado las firmas SPF, DKIM y DMARC del dominio en la consola de Resend, causando que los correos sean rebotados o vayan directo a spam.
2. **Estilos CSS Externos:** Usar clases CSS de Tailwind o enlaces externos de CSS en las plantillas. La gran mayoría de clientes de correo (como Gmail) eliminan la etiqueta `<style>` y descartan estilos externos, rompiendo por completo la visualización. Los estilos deben estar escritos en línea.
3. **Enviar a través de Iteraciones Síncronas:** Enviar correos masivos iterando sobre un array de alumnos usando `await` síncrono de Resend, lo que ralentiza el endpoint API o Server Action. Usa colas de tareas (como BullMQ) para procesar envíos asíncronos.
