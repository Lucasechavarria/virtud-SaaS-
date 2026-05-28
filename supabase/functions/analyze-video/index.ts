// =========================================================================
// 🤖 SUPABASE EDGE FUNCTION: analyze-video (SPRINT 2 - PROCESAMIENTO ASÍNCRONO)
// Idioma: TypeScript (Entorno de Ejecución Deno / Supabase Edge)
// Objetivo: Procesar análisis biomecánicos de videos de técnica en background
//           mediante webhooks de base de datos y Google Gemini Vision.
// =========================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { GoogleGenerativeAI } from "npm:@google/generative-ai@0.2.1";

// Configuración de CORS para llamadas desde el navegador (si se requiere invocar directo)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Manejar preflight request de CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Validar variables de entorno críticas
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");

    if (!supabaseUrl || !supabaseServiceKey || !geminiApiKey) {
      throw new Error("Faltan variables de entorno críticas en Supabase Edge Function.");
    }

    // Inicializar clientes
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const genAI = new GoogleGenerativeAI(geminiApiKey);

    // 2. Procesar el Payload del Database Webhook
    // Supabase envía el registro insertado/modificado en el campo "record" o "new"
    const payload = await req.json();
    console.log("[IA-Worker] Payload de webhook recibido:", JSON.stringify(payload));

    const videoRecord = payload.record || payload.new;
    if (!videoRecord || !videoRecord.id || !videoRecord.url_video) {
      return new Response(
        JSON.stringify({ error: "Payload inválido: Faltan datos del registro del video." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const videoId = videoRecord.id;
    const urlVideo = videoRecord.url_video;
    const exerciseName = videoRecord.nombre_ejercicio_custom || "Ejercicio desconocido";

    console.log(`[IA-Worker] Iniciando análisis asíncrono para Video ID: ${videoId}, URL: ${urlVideo}`);

    // Actualizar estado a 'procesando' en la base de datos para notificar al frontend vía Realtime
    await supabase
      .from("videos_ejercicio")
      .update({ estado: "procesando", actualizado_en: new Date().toISOString() })
      .eq("id", videoId);

    // 3. Extraer la ruta relativa del archivo desde la URL pública
    // Ejemplo: URL pública de Supabase Storage contiene ".../object/public/videos_ejercicio/usuarioId/fileName"
    // Opcional: Si el bucket es privado, descargamos usando la API de Storage
    const urlParts = urlVideo.split("/videos_ejercicio/");
    if (urlParts.length < 2) {
      throw new Error("No se pudo parsear el path relativo del video desde la URL proporcionada.");
    }
    const filePath = urlParts[1];

    console.log(`[IA-Worker] Descargando video desde Storage con path relativo: ${filePath}`);

    // 4. Descargar archivo del storage a memoria en Deno (funciona con buckets privados y públicos)
    const { data: blob, error: downloadError } = await supabase.storage
      .from("videos_ejercicio")
      .download(filePath);

    if (downloadError || !blob) {
      throw new Error(`Error descargando video desde Supabase Storage: ${downloadError?.message || "Archivo vacío"}`);
    }

    const arrayBuffer = await blob.arrayBuffer();
    const base64Video = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
    );

    console.log(`[IA-Worker] Archivo descargado con éxito. Tamaño: ${(arrayBuffer.byteLength / (1024 * 1024)).toFixed(2)} MB. Invocando Gemini Vision...`);

    // 5. Estructurar Prompt Biomecánico y Schema de Respuesta JSON
    const prompt = `
      Actúa como un Especialista en Biomecánica de Élite y Fisioterapeuta Deportivo.
      Realiza un análisis biomecánico exhaustivo de la técnica de ejecución de este ejercicio: ${exerciseName}.
      
      Debes identificar:
      - 1. Postura y alineación articular (columna, rodillas, cadera).
      - 2. Rango de movimiento (ROM) y control de tempo.
      - 3. Errores biomecánicos o patrones compensatorios con su severidad ("baja", "media", "alta").
      - 4. Cronología de errores indicando el segundo aproximado de ocurrencia.
      - 5. Recomendaciones accionables ("cues" de entrenamiento).
      - 6. Puntaje general de ejecución del 0 al 100.

      La respuesta debe ser obligatoriamente un objeto JSON con la siguiente estructura:
      {
        "version": "1.0",
        "analisis": {
          "postura": [
            {
              "timestamp_ms": 3200,
              "issue": "Descripción de la desviación postural",
              "severity": "media",
              "recommendation": "Acción correctiva inmediata"
            }
          ],
          "rango_movimiento": [
            {
              "timestamp_ms": 5000,
              "issue": "Descripción del rango de movimiento incompleto",
              "severity": "baja",
              "recommendation": "Acción correctiva"
            }
          ],
          "tecnica_general": "Resumen global técnico del ejercicio",
          "puntaje_tecnico": 75.0,
          "puntaje_seguridad": 90.0
        },
        "recomendaciones": [
          "Recomendación general 1",
          "Recomendación general 2"
        ]
      }
    `;

    // Inicializar modelo multimodal Gemini 1.5 Flash (Optimizado para video y baja latencia/costo)
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    });

    // Invocación multimodal pasándole el buffer de video en base64
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Video,
          mimeType: blob.type || "video/mp4",
        },
      },
    ]);

    const response = await result.response;
    const text = response.text();

    if (!text) {
      throw new Error("El modelo de IA de Gemini devolvió una respuesta vacía.");
    }

    console.log("[IA-Worker] Análisis de IA recibido exitosamente. Guardando en base de datos...");
    const analysisJson = JSON.parse(text);

    // 6. Almacenar Resultados en Base de Datos y Actualizar Estado
    const { error: updateError } = await supabase
      .from("videos_ejercicio")
      .update({
        estado: "analizado",
        correcciones_ia: analysisJson,
        puntaje_confianza: analysisJson.analisis?.puntaje_tecnico || 0,
        procesado_en: new Date().toISOString(),
        actualizado_en: new Date().toISOString()
      })
      .eq("id", videoId);

    if (updateError) {
      throw updateError;
    }

    console.log(`[IA-Worker] Procesamiento biomecánico finalizado con éxito para el Video ID: ${videoId}`);

    return new Response(
      JSON.stringify({ success: true, message: "Análisis biomecánico asíncrono guardado correctamente." }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const err = error as Error;
    console.error("[IA-Worker] ERROR CRÍTICO en Edge Function:", err.message);

    try {
      // Registrar el error en la base de datos para que el frontend pueda mostrar el estado 'error'
      const payload = await req.clone().json().catch(() => ({}));
      const videoRecord = payload.record || payload.new;
      if (videoRecord && videoRecord.id) {
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        if (supabaseUrl && supabaseServiceKey) {
          const supabase = createClient(supabaseUrl, supabaseServiceKey);
          await supabase
            .from("videos_ejercicio")
            .update({ estado: "error", actualizado_en: new Date().toISOString() })
            .eq("id", videoRecord.id);
        }
      }
    } catch (dbErr) {
      console.error("[IA-Worker] Falló al intentar registrar estado de error en la BD:", (dbErr as Error).message);
    }

    return new Response(
      JSON.stringify({ error: err.message || "Error interno en el procesamiento asíncrono de la IA." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
