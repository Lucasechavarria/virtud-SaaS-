'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import RegistrationForm from '@/features/profile/components/RegistrationForm';
import { authService } from '@/services/auth.service';

export default function CompleteProfilePage() {
    const router = useRouter();
    const [userId, setUserId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkUser = async () => {
            try {
                const user = await authService.getCurrentUser();
                if (!user) {
                    router.push('/login');
                    return;
                }
                setUserId(user.id);
            } catch (error) {
                console.error(error);
                router.push('/login');
            } finally {
                setLoading(false);
            }
        };

        checkUser();
    }, [router]);

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
            </div>
        );
    }

    if (!userId) return null;

    return (
        <div className="min-h-screen bg-[#1c1c1e] p-6 flex flex-col items-center justify-center">
            <div className="w-full max-w-4xl mb-8 text-center">
                <h1 className="text-3xl font-bold text-white mb-2">Completar Ficha Técnica</h1>
                <p className="text-gray-400">Es necesario completar tu información médica y de contacto para poder entrenar.</p>
            </div>

            <RegistrationForm
                userId={userId}
                onComplete={() => router.push('/dashboard')}
            />
        </div>
    );
}
