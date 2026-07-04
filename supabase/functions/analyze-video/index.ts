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

serve(async (req: Request) => {
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

    // Obtener los datos del registro nuevamente por si no venían completos en el payload del webhook
    const { data: currentVideo, error: fetchError } = await supabase
      .from("videos_ejercicio")
      .select("telemetria, nombre_ejercicio_custom")
      .eq("id", videoId)
      .single();

    const telemetriaData = currentVideo?.telemetria || videoRecord.telemetria;
    const tieneTelemetria = Array.isArray(telemetriaData) && telemetriaData.length > 0;

    let analysisJson: any = null;

    if (tieneTelemetria) {
      console.log(`[IA-Worker] Telemetría biomecánica encontrada (${telemetriaData.length} frames). Procesando directo con Gemini Text...`);

      const prompt = `
        Actúa como un Especialista en Biomecánica de Élite y Fisioterapeuta Deportivo.
        Realiza un análisis biomecánico de la técnica de ejecución de este ejercicio: "${exerciseName}".
        
        A continuación se muestra la telemetría esquelética extraída frame a frame (cada 200ms) del video del atleta.
        Cada frame contiene coordenadas X, Y, Z (valores normalizados 0-1 de la cámara) y ángulos calculados para ciertas articulaciones.
        
        Telemetría en formato JSON:
        ${JSON.stringify(telemetriaData)}

        Analiza la telemetría para encontrar desviaciones biomecánicas (como valgo de rodilla, pérdida de estabilidad en cadera, inclinación de torso excesiva, rango de movimiento incompleto o asimetrías).
        Debes identificar en qué rango de segundos ocurre cada problema.

        Debes retornar OBLIGATORIAMENTE un JSON estricto con la siguiente estructura (une el informe de texto y las correcciones visuales para el canvas del frontend):
        {
          "puntaje_general": 85,
          "feedback_texto": "Resumen técnico detallado de la ejecución, destacando el control en la fase concéntrica y excéntrica.",
          "puntos_fuertes": [
            "Punto fuerte 1 (ej: Buena profundidad de cadera)",
            "Punto fuerte 2"
          ],
          "tecnica": [
            "Desviación o error 1 (ej: Leve valgo de rodilla en el segundo 4)",
            "Desviación o error 2"
          ],
          "recomendaciones": [
            "Indicación correctiva 1 (ej: Empujar rodillas hacia afuera al subir)",
            "Indicación correctiva 2"
          ],
          "correcciones_visuales": [
            {
              "segundo_inicio": 3.8,
              "segundo_fin": 4.6,
              "articulacion_foco": "rodilla_izq",
              "tipo_error": "Valgo de rodilla",
              "color_overlay": "#FF3333",
              "mensaje_tooltip": "La rodilla izquierda colapsó hacia adentro en la fase concéntrica. Enfócate en empujar hacia afuera."
            }
          ]
        }
      `;

      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1,
        },
      });

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      if (!text) {
        throw new Error("El modelo de IA de Gemini devolvió una respuesta vacía al procesar la telemetría.");
      }

      analysisJson = JSON.parse(text);

    } else {
      console.log("[IA-Worker] No se encontró telemetría de MediaPipe. Ejecutando análisis fallback con Gemini Vision...");
      
      const urlParts = urlVideo.split("/videos_ejercicio/");
      if (urlParts.length < 2) {
        throw new Error("No se pudo parsear el path relativo del video desde la URL proporcionada.");
      }
      const filePath = urlParts[1];

      console.log(`[IA-Worker] Descargando video desde Storage con path relativo: ${filePath}`);

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

      const prompt = `
        Actúa como un Especialista en Biomecánica de Élite y Fisioterapeuta Deportivo.
        Realiza un análisis biomecánico exhaustivo de la técnica de ejecución de este ejercicio: "${exerciseName}".
        
        Analiza visualmente el video del atleta.
        Debes retornar OBLIGATORIAMENTE un JSON estricto con la siguiente estructura:
        {
          "puntaje_general": 85,
          "feedback_texto": "Resumen técnico detallado de la ejecución.",
          "puntos_fuertes": [
            "Punto fuerte 1",
            "Punto fuerte 2"
          ],
          "tecnica": [
            "Desviación o error 1",
            "Desviación o error 2"
          ],
          "recomendaciones": [
            "Indicación correctiva 1",
            "Indicación correctiva 2"
          ],
          "correcciones_visuales": []
        }
      `;

      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1,
        },
      });

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
        throw new Error("El modelo de IA de Gemini devolvió una respuesta vacía en el análisis de video fallback.");
      }

      analysisJson = JSON.parse(text);
    }

    console.log("[IA-Worker] Análisis de IA recibido exitosamente. Guardando en base de datos...");

    // 6. Almacenar Resultados en Base de Datos y Actualizar Estado
    const { error: updateError } = await supabase
      .from("videos_ejercicio")
      .update({
        estado: "analizado",
        correcciones_ia: analysisJson,
        puntaje_confianza: analysisJson.puntaje_general ? analysisJson.puntaje_general / 100 : 0.8,
        procesado_en: new Date().toISOString(),
        actualizado_en: new Date().toISOString()
      })
      .eq("id", videoId);

    if (updateError) {
      throw updateError;
    }

    console.log(`[IA-Worker] Procesamiento biomecánico finalizado con éxito para el Video ID: ${videoId}`);

    return new Response(
      JSON.stringify({ success: true, message: "Análisis biomecánico guardado correctamente." }),
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
