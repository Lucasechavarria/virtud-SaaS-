import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

interface WaiverWarningProps {
    waiverAccepted: boolean;
    getLink?: (path: string) => string;
}

export function WaiverWarning({ waiverAccepted, getLink }: WaiverWarningProps) {
    if (waiverAccepted) return null;

    const href = getLink ? getLink('/member/dashboard/profile/complete') : '/dashboard/profile/complete';

    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-orange-500/10 border border-orange-500/50 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4"
        >
            <div className="flex items-center gap-3">
                <div className="bg-orange-500 p-2 rounded-full text-white">
                    ⚠️
                </div>
                <div>
                    <h3 className="text-orange-500 font-bold">Acción Requerida</h3>
                    <p className="text-gray-300 text-sm">Debes completar tu Ficha Médica para entrenar sin restricciones.</p>
                </div>
            </div>
            <Link
                href={href}
                className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-6 rounded-xl transition-colors text-sm whitespace-nowrap"
            >
                Completar Ficha
            </Link>
        </motion.div>
    );
}
