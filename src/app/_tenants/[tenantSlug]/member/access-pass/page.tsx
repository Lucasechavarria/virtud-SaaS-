'use client';

import React from 'react';
import { motion } from 'framer-motion';
import QRCode from 'react-qr-code';

export default function AccessPassPage({ _params }: { _params: { gymId: string } }) {
    const mockUserId = "user_123456789";
    const timestamp = Date.now();
    const qrValue = JSON.stringify({ uid: mockUserId, ts: timestamp, type: 'access' });

    return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
            {/* Animated Background */}
            <motion.div
                className="absolute top-0 left-0 w-full h-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
            >
                <motion.div
                    className="absolute top-1/4 left-1/4 w-64 h-64 bg-orange-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20"
                    animate={{
                        scale: [1, 1.2, 1],
                        x: [0, 50, 0],
                        y: [0, 30, 0],
                    }}
                    transition={{ duration: 8, repeat: Infinity }}
                />
                <motion.div
                    className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-red-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20"
                    animate={{
                        scale: [1, 1.3, 1],
                        x: [0, -30, 0],
                        y: [0, -50, 0],
                    }}
                    transition={{ duration: 10, repeat: Infinity }}
                />
            </motion.div>

            {/* Content */}
            <motion.div
                className="relative z-10"
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
            >
                <motion.div
                    className="mb-8"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <motion.h1
                        className="text-4xl font-bold tracking-tighter mb-2"
                        animate={{
                            textShadow: [
                                "0 0 20px rgba(255,87,34,0.3)",
                                "0 0 40px rgba(255,87,34,0.5)",
                                "0 0 20px rgba(255,87,34,0.3)"
                            ]
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                    >
                        VIRTUD<span className="text-orange-500">ACCESS</span>
                    </motion.h1>
                    <p className="text-gray-400">Escanea este código en el molinete</p>
                </motion.div>

                <motion.div
                    className="bg-white p-8 rounded-3xl mb-8 relative"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
                    whileHover={{ scale: 1.05 }}
                >
                    <motion.div
                        className="absolute inset-0 rounded-3xl"
                        animate={{
                            boxShadow: [
                                "0 0 30px rgba(255,87,34,0.3)",
                                "0 0 60px rgba(255,87,34,0.5)",
                                "0 0 30px rgba(255,87,34,0.3)"
                            ]
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                    />
                    <QRCode
                        value={qrValue}
                        size={256}
                        style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                        viewBox={`0 0 256 256`}
                    />
                </motion.div>

                <motion.div
                    className="bg-[#1c1c1e] px-8 py-4 rounded-full border border-[#3a3a3c] flex items-center gap-3 backdrop-blur-xl"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    whileHover={{ scale: 1.05, borderColor: '#FF5722' }}
                >
                    <motion.div
                        className="w-3 h-3 bg-green-500 rounded-full"
                        animate={{
                            scale: [1, 1.3, 1],
                            opacity: [1, 0.5, 1]
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                    />
                    <span className="font-medium text-sm">Pase Activo • Plan Premium</span>
                </motion.div>

                <motion.p
                    className="mt-8 text-xs text-gray-600"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                >
                    ID: {mockUserId}
                </motion.p>
            </motion.div>
        </div>
    );
}
