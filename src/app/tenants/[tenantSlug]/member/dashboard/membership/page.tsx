import React from 'react';
import MembershipManagement from '@/features/dashboard/components/MembershipManagement';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Membresía | Virtud Gym',
    description: 'Gestiona tu plan activo y tu historial de pagos.',
};

export default function MembershipPage({ _params }: { _params: { gymId: string } }) {
    return (
        <div className="p-6">
            <MembershipManagement />
        </div>
    );
}
