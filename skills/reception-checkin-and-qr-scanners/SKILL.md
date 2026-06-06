---
name: reception-checkin-and-qr-scanners
description: >
  Actúa como el Hardware & Check-in Specialist para Virtud Gym. Úsalo para diseñar
  módulos de ingreso con lectores QR USB, mantener foco persistente en inputs ocultos,
  y generar tokens digitales auto-rotativos.
---

# 🎫 Reception Check-in & QR Scanners - Virtud Gym

## Overview
Esta skill define las pautas para integrar hardware físico de control de acceso (lectores de códigos de barra y QR USB que emulan teclado) con la interfaz de recepción de Virtud Gym, y gestionar la lógica de seguridad y visualización de ingresos del alumno en tiempo real.

---

## 🔌 Integración con Escáneres QR USB (Emulación de Teclado)

Los lectores QR físicos por USB funcionan inyectando las lecturas como una ráfaga de pulsaciones de teclas del teclado seguidas de un caracter de retorno de carro (`Enter`). 

Para capturar estas lecturas de forma transparente para el recepcionista:

### 1. Foco Persistente en Input Oculto (React)
El recepcionista no debe tener que hacer clic en un cuadro de búsqueda para escanear. El sistema debe mantener enfocado de manera invisible un campo de texto:

```tsx
import { useEffect, useRef, useState } from 'react';

export function ComponenteEscaneoRecepcion() {
  const [scanData, setScanData] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Mantener el foco de forma persistente en el input
  useEffect(() => {
    const forzarFoco = () => inputRef.current?.focus();
    
    forzarFoco();
    const interval = setInterval(forzarFoco, 2000); // Re-enfocar cada 2 segundos
    
    return () => clearInterval(interval);
  }, []);

  // Forzar foco al hacer clic en cualquier parte de la pantalla
  useEffect(() => {
    const handleWindowClick = () => inputRef.current?.focus();
    window.addEventListener('click', handleWindowClick);
    return () => window.removeEventListener('click', handleWindowClick);
  }, []);

  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanData.trim()) return;

    // Procesar el token escaneado en la API
    verificarIngresoAlumno(scanData.trim());
    setScanData(''); // Limpiar para la siguiente lectura
  };

  return (
    <form onSubmit={handleScanSubmit} className="absolute opacity-0 pointer-events-none">
      <input
        ref={inputRef}
        type="text"
        value={scanData}
        onChange={(e) => setScanData(e.target.value)}
        autoFocus
      />
    </form>
  );
}
```

---

## 🎨 Feedback Visual Instantáneo (Flash States)

La interfaz de acceso debe alertar al recepcionista mediante colores de fondo inmediatos y auto-limpiables para evitar confusiones al procesar múltiples ingresos seguidos:

```typescript
const [flashColor, setFlashColor] = useState<'neutral' | 'success' | 'error'>('neutral');

// Auto-limpieza tras 5 segundos
useEffect(() => {
  if (flashColor !== 'neutral') {
    const timer = setTimeout(() => setFlashColor('neutral'), 5000);
    return () => clearTimeout(timer);
  }
}, [flashColor]);
```

---

## 🛡️ Carnet Digital con Tokens Dinámicos Rotativos

Para evitar que los alumnos ingresen utilizando capturas de pantalla de códigos QR estáticos o carnes compartidos por chat, el código QR del alumno debe rotar de forma dinámica cada 30 segundos utilizando el reloj del dispositivo:

```typescript
import { useState, useEffect } from 'react';

export function useDynamicQRToken() {
  const [qrToken, setQrToken] = useState('generando...');
  const [timeLeft, setTimeLeft] = useState(30);

  useEffect(() => {
    const rotarToken = () => {
      // Generar token dinámico único con marca de tiempo codificada
      const marcaTiempo = Date.now().toString(36);
      const tokenAleatorio = Math.random().toString(36).substring(7);
      setQrToken(`VIRTUD-${marcaTiempo}-${tokenAleatorio}`);
      setTimeLeft(30);
    };

    rotarToken();

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          rotarToken();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return { qrToken, timeLeft };
}
```

---

## Common Mistakes
1. **Robar el Foco de Formularios Administrativos:** No desactivar el intervalo de re-enfoque automático del lector QR cuando el recepcionista abre un modal para registrar un nuevo alumno o editar un cobro, haciendo imposible escribir en otros campos de texto.
2. **Ignorar Errores de Reloj del Cliente:** Confiar ciegamente en la hora exacta del dispositivo del usuario para validar los tokens rotativos de 30s. Si el reloj del teléfono del alumno está desincronizado por más de un minuto, el lector de la recepción rechazará el acceso. Permite una ventana de tolerancia temporal en la validación del servidor (ej. ±1 minuto).
3. **No Filtrar Entradas No Numéricas:** No sanitizar el contenido del scan, permitiendo que caracteres especiales inyectados accidentalmente rompan las consultas en Supabase.
