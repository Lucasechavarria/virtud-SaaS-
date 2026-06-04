---
name: test-data-seeder
description: >
  Actúa como el Test Data Architect para Virtud Gym. Úsalo para sembrar datos
  coherentes de prueba (mock/seed) en entornos de desarrollo, respetando la
  integridad referencial (LSP) y garantizando aislamiento estricto de producción.
---

# 🌾 Test Data Seeder & LSP Architect - Virtud Gym

## Overview
Esta skill proporciona las herramientas y metodologías para poblar (seed) la base de datos de desarrollo y testing con datos realistas y estructurados, garantizando que el entorno local se comporte de manera idéntica al entorno de producción sin alterar datos reales de los usuarios.

---

## 🛠️ Herramientas de Poblamiento (Seeding)

Utiliza los siguientes scripts locales para preparar tu entorno de datos:

### 1. Sembrar Usuario de Pruebas Core
Crea y configura un usuario de prueba (alumno/coach) con credenciales conocidas, asociándole perfiles y registros iniciales en la base de datos local.
```bash
node scripts/seed-test-user.js
```

### 2. Migrar y Crear Datos Mock Completos
Puebla de forma masiva tablas secundarias como clases, horarios, rutinas predeterminadas, y equipamiento del gimnasio.
```bash
node scripts/migrate-mock-data.js
```

---

## 🏗️ Directrices de Poblamiento y Principio LSP

Para asegurar que tus datos de prueba sirvan realmente para validar la aplicación, debes cumplir con las siguientes directrices:

### 1. Principio de Sustitución de Liskov (LSP - SOLID) en Datos
* **Regla:** Los objetos o datos mockeados en las pruebas deben ser completamente sustituibles por los datos reales de producción sin alterar el comportamiento de la aplicación ni romper validaciones.
* **Aplicación:** Si en producción el campo `informacion_medica` es un objeto JSON con claves específicas (`alergias`, `lesiones`, `apto_fisico`), tus datos de prueba deben modelar exactamente esa estructura JSON. No utilices strings vacíos, ni formatos alternativos, ya que eso escondería fallos del frontend que solo saltarían al pasar a producción.

### 2. Respeto de Integridad y Restricciones Físicas
* Todo registro sembrado mediante scripts debe respetar las restricciones físicas de la base de datos (`NOT NULL`, `CHECK constraints`, `UNIQUE`, `FOREIGN KEY`).
* **Secuencia de Seeding:**
  1. Primero inserta entidades independientes (ej. `usuarios` / auth).
  2. Luego inserta tablas de perfiles asociados (`perfiles`).
  3. Inserta registros con dependencias cruzadas (ej. `rutinas` -> `ejercicios`).
  4. Por último, inserta logs y métricas secundarias (`historial_ejercicios`).

### 3. Aislamiento Estricto de Producción
* **Regla de Oro:** NUNCA corras scripts destructivos o de seeding masivo apuntando al entorno de producción.
* **Mecanismo de Guardia:** Todo script de base de datos debe verificar el entorno actual antes de ejecutarse:
  ```javascript
  if (process.env.NODE_ENV === 'production' || process.env.SUPABASE_URL.includes('prod-project-id')) {
    console.error("❌ OPERACIÓN DE SEEDING BLOQUEADA: Detectado entorno de producción.");
    process.exit(1);
  }
  ```

---

## Common Mistakes
1. **Datos Mock Incompletos:** Crear datos de prueba que carecen de campos obligatorios en producción (ej. crear un usuario sin rol asignado), lo que causa que los componentes del frontend lancen excepciones de "undefined".
2. **Ejecutar en Producción:** Ejecutar scripts de limpieza o reinicio (`db-reset.ts`) sin verificar que las variables de entorno estén conectadas a la base de datos local en lugar de la remota.
3. **Hardcodear IDs en Scripts:** Insertar registros con identificadores `UUID` hardcodeados en lugar de recuperarlos dinámicamente de las relaciones, lo que provoca fallos de clave duplicada (`duplicate key value violates unique constraint`).
