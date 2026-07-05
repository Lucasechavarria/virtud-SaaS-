import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const slug = searchParams.get('slug');

        if (!slug) {
            return NextResponse.json({ error: 'Missing slug parameter' }, { status: 400 });
        }

        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: gym, error } = await supabase
            .from('gimnasios')
            .select('id')
            .eq('slug', slug)
            .single();

        if (error || !gym) {
            return NextResponse.json({ error: 'Gym not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, gymId: gym.id });
    } catch (err: any) {
        console.error('Error resolving gym ID:', err);
        return NextResponse.json({ error: 'Internal Server Error', message: err.message }, { status: 500 });
    }
}
