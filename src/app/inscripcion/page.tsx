import { redirect } from 'next/navigation';

export default async function InscripcionPage({
    searchParams
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const resolvedParams = await searchParams;
    const query = new URLSearchParams();
    
    Object.entries(resolvedParams).forEach(([key, value]) => {
        if (value !== undefined) {
            if (Array.isArray(value)) {
                value.forEach(val => query.append(key, val));
            } else {
                query.append(key, value as string);
            }
        }
    });

    const queryString = query.toString();
    const destination = queryString ? `/signup?${queryString}` : '/signup';
    redirect(destination);
}
