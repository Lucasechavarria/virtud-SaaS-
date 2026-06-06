---
name: project-linter-cleaner
description: >
  Actúa como el Linter & Clean Code Tool para Virtud Gym. Úsalo para ejecutar scripts
  de limpieza automática de código muerto (imports/variables) y hacer cumplir las
  directrices de Clean Code (SRP, tipado estricto, nombrado legible).
---

# 🧹 Project Linter & Clean Code Tool - Virtud Gym

## Overview
Esta skill proporciona las directrices y herramientas para limpiar y refactorizar el código de Virtud Gym, automatizando la eliminación de código muerto e imponiendo estándares de **Clean Code** y **diseño de software robusto**.

---

## 🛠️ Scripts de Limpieza Automatizada

El proyecto cuenta con scripts en Node.js que corrigen automáticamente advertencias de linter y tipos. Ejecútalos según sea necesario:

### 1. Eliminar variables no utilizadas
Busca y renombra variables no usadas agregándoles un prefijo `_` (ej. en catch blocks `catch(error)` -> `catch(_error)` o parámetros de funciones arrow) y comenta constantes muertas.
```bash
node scripts/fix-unused-vars.js
```

### 2. Eliminar importaciones no utilizadas
Analiza todos los archivos `.ts` y `.tsx` en `/src` para eliminar automáticamente los imports declarados que ya no se usan en el cuerpo del archivo.
```bash
node scripts/remove-unused-imports.js
```

### 3. Solucionar warnings seguros del linter
Corre de manera masiva y segura correcciones de linter comunes en el proyecto.
```bash
node scripts/fix-safe-warnings.js
```

---

## 📐 Directrices de Clean Code & SOLID

Cuando crees o refactorices código en Virtud Gym, debes cumplir rigurosamente los siguientes principios:

### 1. Principio de Responsabilidad Única (SRP - SOLID)
* **Regla:** Cada clase, módulo o función debe tener **una sola razón para cambiar** (hacer una sola cosa bien).
* **Aplicación:** Si un Server Action está validando datos, guardando en la BD, enviando un correo y actualizando una racha, sepáralo. Crea un servicio para la base de datos, un worker para el correo, y un trigger/servicio para la racha.

### 2. Nombres Descriptivos y Autodocumentados
* **Evita nombres genéricos:** NUNCA uses nombres de variables como `data`, `res`, `info`, `temp`, o nombres de funciones como `doStuff()`, `process()`.
* **Usa nombres legibles en español:**
  * **Clases/Interfaces:** `ReservaClase`, `HistorialMembresia`.
  * **Variables:** `usuarioAutenticado`, `limiteCapacidadSuperado`.
  * **Funciones (verbos):** `crearReserva()`, `calcularPuntosDeGamificacion()`.

### 3. Erradicación del tipo `any` (Tipado Estricto)
* **Prohibición:** El uso de `any` está prohibido. En su lugar:
  * Utiliza genéricos (`<T>`).
  * Declara interfaces detalladas (`interface PerfilAlumno { ... }`).
  * Usa `unknown` si el tipo no está definido e inspecciónalo en tiempo de ejecución mediante type guards o Zod schemas.

### 4. No Dejar Código Muerto
* **Evita el código comentado:** No dejes bloques de código comentados "por si acaso". Si no se usa, bórralo. Git se encarga de guardar el historial.

---

## Common Mistakes
1. **Ignorar Advertencias del Compilador:** Dejar advertencias de TypeScript (`Unused variable`, `Implicit any`) acumuladas pensando que "compila igual".
2. **Funciones Gigantes:** Crear funciones de más de 40 líneas que mezclan lógica de formateo, lógica de negocio y llamadas de red.
3. **Comentarios Redundantes:** Escribir comentarios que solo describen *qué* hace el código en lugar de explicar *por qué* se implementó de esa forma (ej. `// Asignar id a usuario` justo arriba de `usuario.id = id`).
