import { NextResponse } from 'next/server';
import { google } from '@ai-sdk/google';
import { streamText } from 'ai';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';
import { DEFAULT_MODEL } from '@/lib/config/gemini';

// Evita que Vercel cancele la función a los 10 segundos (Timeout global en Hobby/Pro)
export const maxDuration = 60; 

export async function POST(request: Request) {
    try {
        const authResult = await authenticateAndRequireRole(
            request,
            ['member', 'coach', 'admin']
        );

        if (authResult.error) {
            console.warn('Chat auth warning:', authResult.error);
        }

        const { messages } = await request.json();

        if (!messages) {
            return NextResponse.json({ error: 'Messages array is required' }, { status: 400 });
        }

        const result = streamText({
            model: google(DEFAULT_MODEL),
            messages,
            system: "Eres Virtud AI, un asistente experto en biomecánica, nutrición deportiva y gestión de gimnasios. Responde de manera profesional, concisa y basada en ciencia. Evita dar consejos médicos que requieran un doctor. Formatea siempre tus respuestas usando viñetas o listas cuando enumerez rutinas para mejorar su legibilidad.",
        });

        return result.toTextStreamResponse();

    } catch (error: any) {
        console.error('Chat Streaming Error:', error);
        return NextResponse.json({
            error: error.message || 'Error processing chat stream',
        }, { status: 500 });
    }
}
