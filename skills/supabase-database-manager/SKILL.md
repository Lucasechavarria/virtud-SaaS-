---
name: supabase-database-manager
description: >
  Actúa como el Database Architect para Virtud Gym. Úsalo para verificar tablas
  y conexiones de Supabase, definir políticas RLS, diseñar esquemas relacionales
  en español y optimizar consultas utilizando EXPLAIN ANALYZE e índices.
---

# 🗄️ Supabase Database Manager & Data Architect - Virtud Gym

## Overview
Esta skill proporciona las herramientas y guías de arquitectura de datos para gestionar, inspeccionar y optimizar la base de datos PostgreSQL de Supabase en Virtud Gym, garantizando el máximo rendimiento de las consultas y la protección absoluta de la privacidad de los usuarios.

---

## 🛠️ Herramientas de Inspección de Base de Datos

Utiliza los siguientes scripts locales para diagnosticar el estado del esquema y la conectividad:

### 1. Verificar Conexión de Supabase
Diagnóstica la conectividad de red local o producción y verifica las credenciales del entorno.
```bash
node scripts/debug_supabase.js
```

### 2. Listar Esquema Completo
Muestra en consola un resumen de todas las tablas registradas y su cantidad de registros.
```bash
node scripts/list_tables_v2.js
```

### 3. Verificar Tablas Específicas
Compara las tablas existentes físicamente en Supabase contra el esquema requerido por las nuevas features.
```bash
node scripts/verify_tables.js
```

---

## 🏗️ Arquitectura de Datos y Buenas Prácticas de DB

Todo cambio, migración o consulta en la base de datos de Virtud Gym debe seguir estrictamente estas reglas:

### 1. Idioma Estricto en Español
* **Regla:** Todos los nombres de tablas, columnas, vistas, tipos personalizados, y triggers deben estar escritos en **español** (`perfiles`, `rutinas`, `ejercicios`, `objetivos_del_usuario`, `reservas_de_clase`). NO se permite el uso del inglés para nombrar elementos de base de datos.

### 2. Normalización de Esquemas (3NF)
* Diseña tablas siguiendo la **Tercera Forma Normal (3NF)** para evitar redundancias de datos.
* Toda tabla debe contar con una clave primaria (`id` del tipo `UUID` autogenerado por defecto).
* Utiliza restricciones de integridad referencial (`FOREIGN KEY`) explícitas, especificando acciones en cascada (`ON DELETE CASCADE` / `ON DELETE RESTRICT`) según corresponda.

### 3. Seguridad por Filas Obligatoria (RLS)
* **Regla:** Ninguna tabla en Virtud Gym debe ser accesible públicamente o sin filtros de seguridad.
* Ejecuta siempre:
  ```sql
  ALTER TABLE nombre_tabla ENABLE ROW LEVEL SECURITY;
  ```
* Define políticas claras que verifiquen que el `auth.uid()` del usuario coincida con el registro, o que el usuario tenga un rol autorizado (ej. `coach` o `admin`) en la tabla `perfiles`.

### 4. Optimización de Consultas con `EXPLAIN ANALYZE`
* Antes de agregar índices, analiza el plan de ejecución de la consulta lenta ejecutando:
  ```sql
  EXPLAIN ANALYZE SELECT ...
  ```
* **Estrategia de Indexación:**
  * Crea **índices compuestos** para consultas frecuentes que filtren por múltiples columnas (ej. `usuario_id` y `fecha`).
  * Crea **índices parciales** para acelerar filtros recurrentes que solo aplican a un subconjunto de datos (ej. `WHERE activa = true`).
  * Utiliza **vistas materializadas** para reportes estadísticos complejos que no requieran consistencia en tiempo real de milisegundos, programando refrescos nocturnos.

---

## Common Mistakes
1. **Full Table Scans en Producción:** Escribir consultas complejas con `JOINS` sobre tablas de gran tamaño sin haber creado índices en las llaves foráneas (`FK`), degradando drásticamente el rendimiento de la aplicación.
2. **Tablas Expuestas sin RLS:** Crear tablas auxiliares o de configuración y olvidar activar RLS, lo que permite que cualquier usuario autenticado (o incluso anónimo si la API está expuesta) pueda alterar o borrar datos.
3. **Mapeo Incorrecto de Nombres:** Confundir nombres de tablas traduciéndolos mentalmente al inglés (ej. consultar `routines` en vez de `rutinas`), rompiendo la sincronización con el tipado TS generado.
4. **Triggers Cíclicos:** Programar triggers de base de datos que se disparan mutuamente al actualizar tablas relacionadas, causando bloqueos infinitos y caídas del servidor.
