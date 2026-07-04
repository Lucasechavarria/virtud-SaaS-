# Arquitectura de Análisis Biomecánico: Superposición Esquelética Inteligente

## 1. Visión General del Módulo
Este documento detalla la implementación del sistema de corrección de ejercicios. El objetivo es proporcionar un feedback visual y biomecánico de alta precisión a los usuarios, minimizando los tiempos de procesamiento, anulando los costos de renderizado de video en el servidor y optimizando el consumo de tokens de IA.

El sistema utiliza un enfoque híbrido de tres capas:
1. **Extracción en el cliente** (Tracking de pose mediante visión computacional).
2. **Análisis asincrónico** (Razonamiento biomecánico vía LLM).
3. **Renderizado dinámico** (Superposición de UI/Canvas en tiempo real sobre el video original).

---

## 2. Stack Tecnológico

* **Frontend:** Next.js (React), TypeScript.
* **Visión Computacional (Tracking):** MediaPipe Pose (ejecutado en el cliente para extraer la matriz de coordenadas).
* **Backend / API:** Django o entorno Node.js, manejando colas asincrónicas.
* **Base de Datos y Almacenamiento:** PostgreSQL y Supabase Storage (para los archivos de video originales).
* **Inteligencia Artificial:** Google Gemini 1.5 Pro (API).

---

## 3. Flujo de Datos y Ejecución

### Fase 1: Ingesta y Extracción Local (Frontend)
1.  El profesor sube el video del alumno y define el **ejercicio** y los **objetivos** en la interfaz de Next.js.
2.  Antes o durante la subida a Supabase Storage, el frontend ejecuta **MediaPipe Pose** sobre el video.
3.  MediaPipe genera un array de datos espaciales (coordenadas X, Y, Z de las articulaciones principales por cada frame o conjunto de frames clave).
4.  Se envía al backend un payload conteniendo: URL del video, contexto del profesor y el JSON con la telemetría del esqueleto.

### Fase 2: Procesamiento y Razonamiento (Backend & IA)
1.  El backend recibe la solicitud y la encola (estado `procesando`).
2.  Se estructura un prompt para la API de Gemini que incluye el contexto en texto y la matriz de datos biomecánicos.
    * *Ejemplo de instrucción:* "Analiza esta telemetría de una sentadilla. El objetivo es hipertrofia. Identifica desviaciones articulares y devuelve el segundo exacto del error."
3.  Gemini procesa la información y devuelve un JSON estricto con los hallazgos.
4.  El backend guarda este JSON estructurado en PostgreSQL, vinculándolo al ID del video, y actualiza el estado a `completado`.

### Fase 3: Renderizado y Devolución (Frontend)
1.  El usuario/profesor abre la vista de resultados.
2.  El reproductor web carga el video en crudo (desde Supabase) y, superpuesto, se inicializa un `<canvas>` HTML5 transparente.
3.  A medida que el video se reproduce, React sincroniza el *timestamp* del video con el JSON de correcciones guardado.
4.  **Magia visual:** El código dibuja dinámicamente líneas sobre las articulaciones, pintando de rojo las zonas críticas e inyectando tooltips flotantes en el DOM exactamente en el segundo donde Gemini detectó la falla.

---

## 4. Estructura de Datos (Esquemas JSON)

### 4.1 Payload de Extracción (MediaPipe a Backend)
```json
{
  "video_id": "uuid-1234",
  "ejercicio": "Sentadilla trasera",
  "objetivo": "Mejorar profundidad y evitar valgo",
  "telemetria": [
    {
      "timestamp_seg": 1.2,
      "articulaciones": {
        "rodilla_izq": {"x": 120, "y": 300, "z": 10, "angulo": 145},
        "cadera": {"x": 150, "y": 200, "z": 5, "angulo": 120}
      }
    }
  ]
}
```

### 4.2 Respuesta de Gemini (Almacenada en BD)

```json
{
  "analisis_general": {
    "score_tecnico": 78,
    "feedback_texto": "Buena profundidad, pero hay pérdida de estabilidad en la fase concéntrica."
  },
  "correcciones_visuales": [
    {
      "segundo_inicio": 4.1,
      "segundo_fin": 5.0,
      "articulacion_foco": "rodilla_izq",
      "tipo_error": "Valgo de rodilla",
      "color_overlay": "#FF0000",
      "mensaje_tooltip": "Las rodillas están colapsando hacia adentro. Empujar hacia afuera."
    }
  ]
}
```

---

## 5. Ventajas del Modelo

* **Eficiencia de Costos:** Se elimina el costo computacional (CPU/GPU) de renderizar videos nuevos mediante FFmpeg o IA generativa en el servidor.
* **Latencia Mínima:** El usuario experimenta una corrección instantánea en la interfaz web, ya que el dibujo en el `<canvas>` consume recursos mínimos del cliente.
* **Alta Escalabilidad:** El backend solo procesa texto y matrices matemáticas (JSON), dejando el almacenamiento de video delegado a la nube (Supabase) y el renderizado gráfico delegado al dispositivo del usuario.
