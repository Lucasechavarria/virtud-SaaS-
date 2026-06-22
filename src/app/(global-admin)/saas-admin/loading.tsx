'use client';

import React from 'react';
import { motion } from 'framer-motion';

export default function SaaSAdminLoading() {
    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white p-4 md:p-8 flex flex-col justify-start relative overflow-hidden w-full">
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#6d28d9]/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#3b82f6]/10 rounded-full blur-[120px] pointer-events-none" />

            {/* Header Loader */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                <div className="space-y-3 w-full md:w-1/3">
                    <div className="h-10 bg-white/5 rounded-2xl animate-pulse w-3/4 border border-white/5" />
                    <div className="h-4 bg-white/5 rounded-xl animate-pulse w-1/2" />
                </div>
                <div className="h-12 bg-white/5 rounded-2xl animate-pulse w-48 border border-white/5" />
            </div>

            {/* Stats Loader */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-[#1c1c1e] p-6 rounded-[2rem] border border-white/5 flex items-center gap-4">
                        <div className="w-12 h-12 bg-white/5 rounded-2xl animate-pulse shrink-0" />
                        <div className="space-y-2 w-full">
                            <div className="h-3 bg-white/5 rounded-lg animate-pulse w-1/2" />
                            <div className="h-6 bg-white/5 rounded-xl animate-pulse w-1/3" />
                        </div>
                    </div>
                ))}
            </div>

            {/* Content List Loader */}
            <div className="space-y-6">
                {[1, 2].map((i) => (
                    <div key={i} className="bg-[#1c1c1e] rounded-[2.5rem] border border-white/5 p-8 flex flex-col lg:flex-row gap-8 items-start lg:items-center">
                        {/* Logo Skeleton */}
                        <div className="w-20 h-20 bg-white/5 rounded-[2rem] border border-white/10 animate-pulse shrink-0" />

                        {/* Text Content Skeleton */}
                        <div className="flex-1 space-y-3 w-full">
                            <div className="flex items-center gap-3">
                                <div className="h-8 bg-white/5 rounded-xl animate-pulse w-1/3" />
                                <div className="h-5 bg-white/5 rounded-full animate-pulse w-16" />
                            </div>
                            <div className="h-4 bg-white/5 rounded-lg animate-pulse w-1/4" />
                            
                            <div className="flex gap-2 pt-2">
                                <div className="h-8 bg-white/5 rounded-xl animate-pulse w-24" />
                                <div className="h-8 bg-white/5 rounded-xl animate-pulse w-24" />
                            </div>
                        </div>

                        {/* Button Skeleton */}
                        <div className="flex flex-col gap-3 w-full lg:w-48 shrink-0">
                            <div className="h-12 bg-white/5 rounded-2xl animate-pulse border border-white/5" />
                            <div className="h-12 bg-white/5 rounded-2xl animate-pulse border border-white/5" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
