'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Trophy,
    Target,
    Zap,
    Crown,
    Gem,
    Flame,
    Star,
    Award,
    Sword,
    Shield,
    _ChevronRight,
    Users,
    Activity,
    Lock
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getRankByPoints, getNextRank } from '@/lib/constants/gamification';

interface Challenge {
    id: string;
    title: string;
    description: string;
    type: string;
    status: string;
    points_prize: number;
    participants_count: number;
    is_participant?: boolean;
    participant_status?: string | null;
    fecha_fin?: string;
}

interface Achievement {
    id: number;
    unlocked_at: string;
    achievements: {
        icon: string;
        name: string;
        description: string;
    };
}

interface LeaderboardUser {
    name: string;
    points: number;
    streak: number;
}

export function Gamification() {
    const [view, setView] = useState<'ranking' | 'achievements' | 'challenges'>('ranking');
    const [showCreateChallenge, setShowCreateChallenge] = useState(false);
    const [challengeType, setChallengeType] = useState<'open' | 'individual'>('open');
    const [targetStudent, setTargetStudent] = useState('');
    const [loading, setLoading] = useState(true);

    const [myStats, setMyStats] = useState({ points: 0, current_streak: 0, level: 1 });
    const [myAchievements, setMyAchievements] = useState<Achievement[]>([]);
    const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
    const [challenges, setChallenges] = useState<Challenge[]>([]);

    useEffect(() => {
        fetchGamificationData();
    }, []);

    const fetchGamificationData = async () => {
        try {
            const [gamificationRes, challengesRes] = await Promise.all([
                fetch('/api/gamification'),
                fetch('/api/challenges')
            ]);

            const gamificationData = await gamificationRes.json();
            const challengesData = await challengesRes.json();

            if (gamificationData.stats) setMyStats(gamificationData.stats);
            if (gamificationData.achievements) setMyAchievements(gamificationData.achievements);
            if (gamificationData.leaderboard) setLeaderboard(gamificationData.leaderboard);
            if (challengesData.challenges) setChallenges(challengesData.challenges);
        } catch (error) {
            console.error(error);
            toast.error('Error cargando datos de gamificación');
        } finally {
            setLoading(false);
        }
    };

    const handleJoinChallenge = async (challengeId: string) => {
        try {
            const res = await fetch('/api/challenges/join', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ challengeId })
            });

            if (res.ok) {
                toast.success('¡Te has unido al desafío! ⚔️');
                fetchGamificationData();
            } else {
                const data = await res.json();
                toast.error(data.error || 'No se pudo unir al desafío');
            }
        } catch (_error) {
            toast.error('Error al unirse');
        }
    };

    const currentRank = getRankByPoints(myStats.points);
    const nextRank = getNextRank(currentRank);
    const progress = nextRank
        ? ((myStats.points - currentRank.minPoints) / (nextRank.minPoints - currentRank.minPoints)) * 100
        : 100;

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-6">
                <motion.div
                    animate={{ rotate: 360, scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-16 h-16 border-4 border-purple-500/20 border-t-purple-500 rounded-full"
                />
                <p className="text-zinc-500 font-black text-xs uppercase tracking-[0.4em] animate-pulse">Sincronizando Estatus Elite...</p>
            </div>
        );
    }

    return (
        <div className="space-y-12">
            {/* Hero Rank Card Elite */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`relative overflow-hidden rounded-[3rem] p-10 bg-gradient-to-br ${currentRank.color} shadow-2xl border border-white/10 group`}
            >
                {/* Background Particles Decoration */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/4 group-hover:bg-white/10 transition-colors duration-700" />

                <div className="relative z-10 flex flex-col xl:flex-row gap-12 items-center xl:items-start justify-between">
                    {/* Rank Info */}
                    <div className="flex flex-col md:flex-row items-center gap-8">
                        <motion.div
                            whileHover={{ scale: 1.05, rotate: 5 }}
                            className="text-7xl bg-white/10 backdrop-blur-2xl rounded-[2.5rem] w-32 h-32 flex items-center justify-center shadow-2xl border border-white/20 relative"
                        >
                            <div className="absolute inset-0 bg-gradient-to-t from-white/10 to-transparent rounded-[2.5rem]" />
                            <span className="relative drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">{currentRank.icon}</span>
                        </motion.div>

                        <div className="text-center md:text-left space-y-2">
                            <div className="flex items-center justify-center md:justify-start gap-2">
                                <Gem size={14} className="text-white/60" />
                                <span className="text-[10px] font-black text-white/70 uppercase tracking-[0.4em]">Estatus Actual</span>
                            </div>
                            <h2 className="text-5xl md:text-6xl font-black text-white tracking-tighter uppercase italic">{currentRank.name}</h2>
                            <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-4">
                                {currentRank.benefits.map((b, i) => (
                                    <span key={i} className="px-4 py-1.5 bg-black/20 rounded-full text-[9px] font-black uppercase tracking-widest backdrop-blur-md border border-white/5 flex items-center gap-2">
                                        <Zap size={10} className="text-yellow-400" /> {b}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Progress Visualizer */}
                    <div className="w-full xl:max-w-md space-y-6 bg-black/20 p-8 rounded-[2rem] backdrop-blur-xl border border-white/5">
                        <div className="flex justify-between items-end">
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-white/50 uppercase tracking-widest">Experiencia Acumulada</p>
                                <h3 className="text-3xl font-black text-white tabular-nums drop-shadow-lg leading-none">
                                    {myStats?.points?.toLocaleString() || '0'} <span className="text-xs text-white/40">XP</span>
                                </h3>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black text-white/50 uppercase tracking-widest leading-none mb-1">Próximo Rango</p>
                                <span className="text-sm font-black text-white uppercase italic tracking-tighter">
                                    {nextRank ? nextRank.name : 'Leyenda Absoluta'}
                                </span>
                            </div>
                        </div>

                        <div className="h-4 bg-black/40 rounded-full overflow-hidden border border-white/10 relative shadow-inner">
                            <motion.div
                                className="h-full bg-gradient-to-r from-white/40 via-white to-white shadow-[0_0_20px_rgba(255,255,255,0.6)]"
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(100, progress)}%` }}
                                transition={{ type: "spring", bounce: 0, duration: 1.5 }}
                            />
                        </div>

                        <div className="flex justify-between items-center text-[10px] font-black font-mono tracking-widest text-white/40">
                            <span>{currentRank.minPoints} XP</span>
                            <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/5">
                                <Flame size={12} className="text-orange-500 animate-pulse" />
                                <span>{nextRank ? `${nextRank.minPoints} XP` : '∞'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* View Selector Premium */}
            <div className="flex p-2 bg-zinc-900 shadow-2xl rounded-[2rem] border border-zinc-800 sticky top-8 z-40 backdrop-blur-3xl bg-opacity-80">
                {[
                    { id: 'ranking', label: 'RANKING', icon: Crown },
                    { id: 'achievements', label: 'LOGROS', icon: Award },
                    { id: 'challenges', label: 'DESAFÍOS', icon: Sword },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setView(tab.id as 'ranking' | 'achievements' | 'challenges')}
                        className={`group relative flex-1 flex items-center justify-center gap-3 py-4 rounded-3xl font-black text-xs tracking-[0.2em] transition-all duration-500 ${view === tab.id
                            ? 'text-white'
                            : 'text-zinc-600 hover:text-zinc-400'
                            }`}
                    >
                        {view === tab.id && (
                            <motion.div
                                layoutId="activeTab"
                                className="absolute inset-0 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-3xl shadow-xl shadow-purple-600/30"
                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                            />
                        )}
                        <span className="relative flex items-center gap-3">
                            <tab.icon size={16} className={`transition-transform duration-500 ${view === tab.id ? 'scale-110' : 'group-hover:scale-110'}`} />
                            {tab.label}
                        </span>
                    </button>
                ))}
            </div>

            {/* Ranking View Elite */}
            {view === 'ranking' && (
                <div className="space-y-12">
                    <div className="flex flex-col items-center gap-2">
                        <h3 className="text-3xl font-black text-white tracking-widest italic uppercase">🏆 Muro de la Gloria</h3>
                        <div className="h-1 w-20 bg-gradient-to-r from-purple-500 to-transparent rounded-full" />
                    </div>

                    {/* Elite Podium */}
                    <div className="flex items-end justify-center gap-4 md:gap-12 py-10 relative">
                        {/* 2nd Place */}
                        {leaderboard[1] && (
                            <motion.div
                                initial={{ opacity: 0, y: 50 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="flex flex-col items-center group"
                            >
                                <div className="relative mb-6">
                                    <div className="w-20 h-20 md:w-24 md:h-24 rounded-[2rem] border-4 border-zinc-400 overflow-hidden shadow-2xl group-hover:scale-110 transition-transform bg-zinc-900 relative">
                                        <div className={`w-full h-full bg-gradient-to-br ${getRankByPoints(leaderboard[1].points).color} flex items-center justify-center text-white font-black text-2xl`}>
                                            {leaderboard[1].name.charAt(0)}
                                        </div>
                                    </div>
                                    <div className="absolute -bottom-3 -right-3 w-10 h-10 bg-zinc-400 rounded-2xl flex items-center justify-center font-black text-white text-lg shadow-xl border-4 border-zinc-500">2</div>
                                </div>
                                <div className="text-center mb-4">
                                    <p className="font-black text-zinc-300 text-sm md:text-base uppercase tracking-tighter truncate max-w-[100px]">{leaderboard[1].name.split(' ')[0]}</p>
                                    <p className="text-zinc-500 text-[10px] font-black">{leaderboard[1].points?.toLocaleString() || '0'} XP</p>
                                </div>
                                <div className="h-32 w-24 md:w-32 bg-gradient-to-b from-zinc-400/20 to-transparent rounded-t-[2.5rem] border-x border-t border-zinc-400/10 backdrop-blur-md relative overflow-hidden">
                                    <div className="absolute inset-0 bg-white/5 animate-pulse" />
                                </div>
                            </motion.div>
                        )}

                        {/* 1st Place - The King */}
                        {leaderboard[0] && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex flex-col items-center z-10 group"
                            >
                                <div className="relative mb-8 pt-10">
                                    <motion.div
                                        animate={{ y: [0, -10, 0], scale: [1, 1.1, 1] }}
                                        transition={{ repeat: Infinity, duration: 4 }}
                                        className="absolute -top-4 left-1/2 -translate-x-1/2 text-5xl md:text-6xl drop-shadow-[0_0_20px_rgba(255,215,0,0.6)]"
                                    >
                                        👑
                                    </motion.div>
                                    <div className="w-28 h-28 md:w-36 md:h-36 rounded-[3rem] border-4 border-yellow-500 overflow-hidden shadow-[0_0_50px_rgba(254,196,0,0.4)] group-hover:scale-110 transition-transform bg-zinc-900 relative">
                                        <div className={`w-full h-full bg-gradient-to-br ${getRankByPoints(leaderboard[0].points).color} flex items-center justify-center text-white font-black text-4xl md:text-5xl`}>
                                            {leaderboard[0].name.charAt(0)}
                                        </div>
                                    </div>
                                    <div className="absolute -bottom-4 -right-4 w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-[1.5rem] flex items-center justify-center font-black text-white text-2xl shadow-2xl border-4 border-yellow-700">1</div>
                                </div>
                                <div className="text-center mb-6">
                                    <p className="font-black text-white text-base md:text-2xl uppercase tracking-tighter italic drop-shadow-md">{leaderboard[0].name.split(' ')[0]}</p>
                                    <p className="text-yellow-500 font-black text-sm md:text-base tabular-nums flex items-center gap-2 justify-center">
                                        <Star size={14} className="fill-yellow-500" />
                                        {leaderboard[0].points?.toLocaleString() || '0'} XP
                                    </p>
                                </div>
                                <div className="h-48 w-32 md:w-44 bg-gradient-to-b from-yellow-500/30 to-transparent rounded-t-[3rem] border-x border-t border-yellow-500/20 backdrop-blur-xl relative overflow-hidden">
                                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] font-black text-yellow-500 tracking-[0.3em] uppercase opacity-50">SUPREMO</div>
                                    <div className="absolute inset-0 bg-yellow-500/5 animate-pulse" />
                                </div>
                            </motion.div>
                        )}

                        {/* 3rd Place */}
                        {leaderboard[2] && (
                            <motion.div
                                initial={{ opacity: 0, y: 50 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="flex flex-col items-center group"
                            >
                                <div className="relative mb-6">
                                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-[1.5rem] border-4 border-orange-700/60 overflow-hidden shadow-2xl group-hover:scale-110 transition-transform bg-zinc-900 relative">
                                        <div className={`w-full h-full bg-gradient-to-br ${getRankByPoints(leaderboard[2].points).color} flex items-center justify-center text-white font-black text-xl`}>
                                            {leaderboard[2].name.charAt(0)}
                                        </div>
                                    </div>
                                    <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-orange-700 rounded-xl flex items-center justify-center font-black text-white text-base shadow-xl border-2 border-orange-800">3</div>
                                </div>
                                <div className="text-center mb-4">
                                    <p className="font-black text-zinc-400 text-xs md:text-sm uppercase tracking-tighter truncate max-w-[80px]">{leaderboard[2].name.split(' ')[0]}</p>
                                    <p className="text-zinc-600 text-[9px] font-black">{leaderboard[2].points?.toLocaleString() || '0'} XP</p>
                                </div>
                                <div className="h-24 w-20 md:w-28 bg-gradient-to-b from-orange-700/20 to-transparent rounded-t-[2rem] border-x border-t border-orange-700/10 backdrop-blur-md relative overflow-hidden">
                                    <div className="absolute inset-0 bg-orange-700/5 animate-pulse" />
                                </div>
                            </motion.div>
                        )}
                    </div>

                    {/* Elite Leaderboard List */}
                    <div className="mt-8 space-y-3">
                        <AnimatePresence>
                            {leaderboard.length === 0 && (
                                <p className="text-zinc-600 text-center py-10 font-black uppercase tracking-widest animate-pulse">
                                    Buscando competidores...
                                </p>
                            )}
                            {leaderboard.slice(3).map((user, index) => {
                                const actualIndex = index + 3;
                                const userRank = getRankByPoints(user.points);
                                return (
                                    <motion.div
                                        key={actualIndex}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="p-5 rounded-[1.5rem] border bg-zinc-900/50 border-white/5 hover:border-white/10 hover:bg-zinc-800/50 transition-all flex items-center gap-6 group"
                                    >
                                        <div className="text-sm font-black w-10 text-zinc-600 font-mono italic group-hover:text-white transition-colors">
                                            #{actualIndex + 1}
                                        </div>

                                        <div className="relative">
                                            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${userRank.color} flex items-center justify-center text-white font-black shadow-xl border border-white/10 group-hover:scale-110 transition-transform`}>
                                                {user.name.charAt(0)}
                                            </div>
                                            {user.streak > 0 && (
                                                <div className="absolute -top-2 -right-2 bg-orange-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shadow-lg">
                                                    <Flame size={8} fill="currentColor" /> {user.streak}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                                                <p className="font-black text-zinc-200 uppercase tracking-tighter truncate text-sm md:text-base">{user.name}</p>
                                                <span className="text-[9px] bg-white/5 px-2 py-0.5 rounded-full text-zinc-500 font-black uppercase tracking-widest w-fit border border-white/5">{userRank.name}</span>
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            <p className="text-xl font-black text-white tabular-nums leading-none flex items-center gap-2 justify-end">
                                                {user.points?.toLocaleString() || '0'}
                                                <Activity size={14} className="text-indigo-500 opacity-50" />
                                            </p>
                                            <p className="text-[10px] text-zinc-600 font-black tracking-[0.2em] uppercase">EXPERIENCIA</p>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>

                    <div className="bg-gradient-to-r from-indigo-500/10 to-transparent border border-indigo-500/20 rounded-[2rem] p-6 flex items-center gap-6 group overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl" />
                        <div className="text-4xl bg-indigo-500/20 w-16 h-16 rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500">💎</div>
                        <div>
                            <p className="text-indigo-400 font-black text-xs uppercase tracking-widest mb-1 flex items-center gap-2">
                                <Shield size={12} /> CONSEJO ELITE
                            </p>
                            <p className="text-zinc-500 text-[11px] leading-relaxed">
                                El Ranking se reinicia al final de cada ciclo lunar. Los <span className="text-indigo-300 font-bold">Top 3</span> obtendrán la insignia de <span className="text-white font-bold">LEGENDARY</span> y beneficios exclusivos en el gimnasio.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Achievements View */}
            {/* Achievements View Elite */}
            {view === 'achievements' && (
                <div className="space-y-12">
                    <div className="flex flex-col sm:flex-row justify-between items-center bg-zinc-900/50 border border-white/5 p-8 rounded-[2.5rem] backdrop-blur-xl">
                        <div className="space-y-2 text-center sm:text-left">
                            <h3 className="text-2xl font-black text-white uppercase tracking-tighter">🎖️ Vitrina de Trofeos</h3>
                            <p className="text-zinc-500 text-xs font-black uppercase tracking-[0.2em]">Colección de Honor</p>
                        </div>
                        <div className="mt-4 sm:mt-0 flex items-center gap-4 bg-black/40 px-6 py-3 rounded-2xl border border-white/5 shadow-inner">
                            <Trophy size={18} className="text-yellow-500" />
                            <span className="text-xl font-black text-white tabular-nums">{myAchievements.length}</span>
                        </div>
                    </div>

                    {myAchievements.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col items-center justify-center py-24 bg-white/5 rounded-[3rem] border border-dashed border-white/10"
                        >
                            <div className="relative mb-6">
                                <Lock size={64} className="text-zinc-800" />
                                <motion.div
                                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                                    transition={{ duration: 3, repeat: Infinity }}
                                    className="absolute inset-0 bg-purple-500/20 rounded-full blur-2xl"
                                />
                            </div>
                            <p className="text-zinc-500 font-black uppercase tracking-widest text-sm">Tu legado aún no ha comenzado</p>
                            <p className="text-zinc-600 text-[11px] mt-2 text-center max-w-xs">
                                Superá tus límites en el gimnasio para desbloquear medallas legendarias y ganar XP.
                            </p>
                        </motion.div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                            {myAchievements.map((ua, i) => (
                                <motion.div
                                    key={ua.id}
                                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    whileHover={{ y: -10 }}
                                    className="relative group h-full"
                                >
                                    <div className="p-8 rounded-[3rem] bg-zinc-900 border border-white/5 flex flex-col items-center text-center shadow-2xl h-full backdrop-blur-3xl overflow-hidden relative">
                                        {/* Dynamic Glow */}
                                        <div className="absolute -top-10 -left-10 w-32 h-32 bg-purple-500/10 rounded-full blur-[50px] group-hover:bg-purple-500/20 transition-colors" />

                                        <div className="text-7xl mb-6 relative z-10 drop-shadow-[0_0_25px_rgba(255,255,255,0.2)] transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                                            {ua.achievements.icon}
                                        </div>
                                        <h4 className="font-black text-white text-base uppercase tracking-tighter mb-2 relative z-10 leading-none group-hover:text-purple-400 transition-colors">
                                            {ua.achievements.name}
                                        </h4>
                                        <p className="text-[11px] text-zinc-500 font-medium relative z-10 leading-relaxed italic line-clamp-2">
                                            "{ua.achievements.description}"
                                        </p>

                                        <div className="mt-6 pt-6 border-t border-white/5 w-full relative z-10">
                                            <div className="flex items-center justify-center gap-2 text-[9px] font-black text-zinc-600 uppercase tracking-widest">
                                                <Target size={10} />
                                                <span>Desbloqueado: {new Date(ua.unlocked_at).toLocaleDateString()}</span>
                                            </div>
                                        </div>

                                        {/* Shine Effect */}
                                        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-tr from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-8 rounded-[2.5rem] bg-orange-600/5 border border-orange-600/20 flex gap-6 items-center group">
                            <div className="w-16 h-16 bg-orange-600/10 rounded-2xl flex items-center justify-center text-4xl shadow-inner group-hover:scale-110 transition-transform">🔥</div>
                            <div>
                                <p className="text-orange-500 font-black text-[10px] uppercase tracking-[0.2em] mb-1">Racha Actual</p>
                                <div className="flex items-baseline gap-2">
                                    <p className="text-white font-black text-2xl tracking-tighter italic">{myStats.current_streak}</p>
                                    <p className="text-zinc-500 font-bold text-xs uppercase">Días Imparables</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-8 rounded-[2.5rem] bg-blue-600/5 border border-blue-600/20 flex gap-6 items-center group">
                            <div className="w-16 h-16 bg-blue-600/10 rounded-2xl flex items-center justify-center text-4xl shadow-inner group-hover:scale-110 transition-transform">🎯</div>
                            <div>
                                <p className="text-blue-500 font-black text-[10px] uppercase tracking-[0.2em] mb-1">Próxima Meta</p>
                                <p className="text-white font-black text-sm uppercase tracking-tighter">Elite Attendance</p>
                                <p className="text-zinc-500 text-[10px] mt-1 font-bold">Completá 5 sesiones más</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Challenges View Elite - Mission Control */}
            {view === 'challenges' && (
                <div className="space-y-8">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="space-y-1 text-center md:text-left">
                            <h3 className="text-3xl font-black text-white italic tracking-tighter uppercase">⚔️ Mission Control</h3>
                            <div className="h-1 w-24 bg-gradient-to-r from-pink-500 to-transparent rounded-full" />
                        </div>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setShowCreateChallenge(true)}
                            className="w-full md:w-auto px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-black rounded-[1.5rem] shadow-xl shadow-purple-600/20 text-xs tracking-[0.2em] flex items-center justify-center gap-3 active:shadow-inner transition-all"
                        >
                            <Sword size={16} /> LANZAR DESAFÍO
                        </motion.button>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                        {challenges.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-20 bg-zinc-900/50 rounded-[3rem] border border-dashed border-white/10 text-center px-10">
                                <Activity size={48} className="text-zinc-800 mb-4 animate-pulse" />
                                <p className="text-zinc-500 font-black uppercase tracking-widest text-sm italic">Sin operaciones activas</p>
                                <p className="text-zinc-600 text-xs mt-2">Ponete a prueba creando un desafío para toda la comunidad o un duelo directo.</p>
                            </div>
                        )}
                        {challenges.map((challenge, _i) => (
                            <div key={challenge.id} className="p-8 rounded-[2.5rem] border bg-zinc-900 border-white/5 hover:border-pink-500/30 transition-all relative overflow-hidden group shadow-2xl">
                                {/* Decoration */}
                                <div className="absolute top-0 right-0 p-6 pointer-events-none">
                                    <div className={`text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-[0.2em] shadow-lg border backdrop-blur-md ${challenge.type === 'open'
                                        ? 'bg-blue-600/20 text-blue-400 border-blue-500/30'
                                        : 'bg-pink-600/20 text-pink-400 border-pink-500/30'
                                        }`}>
                                        {challenge.type === 'open' ? '🌎 Global Ops' : '⚔️ Tactical Duel'}
                                    </div>
                                </div>

                                <div className="flex flex-col lg:flex-row gap-8 items-center lg:items-start relative z-10">
                                    <div className="w-20 h-20 bg-black/40 rounded-[1.5rem] border border-white/5 flex items-center justify-center text-4xl shadow-inner group-hover:rotate-12 transition-transform shadow-pink-500/5">
                                        {challenge.type === 'open' ? '📡' : '🔥'}
                                    </div>

                                    <div className="flex-1 text-center lg:text-left min-w-0">
                                        <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 mb-2">
                                            <h4 className="text-2xl font-black text-white italic tracking-tighter uppercase leading-tight truncate">{challenge.title}</h4>
                                            {challenge.is_participant && (
                                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border uppercase tracking-widest ${challenge.participant_status === 'pending_validation'
                                                    ? 'bg-blue-500/20 text-blue-400 border-blue-500/30 animate-pulse'
                                                    : 'bg-green-500/20 text-green-400 border-green-500/30'
                                                    }`}>
                                                    {challenge.participant_status === 'pending_validation' ? 'En Revisión' : 'En Curso'}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-zinc-500 text-xs leading-relaxed max-w-xl italic">"{challenge.description}"</p>
                                        <p className="text-gray-500 text-[10px] font-mono mt-2 flex items-center gap-2 justify-center lg:justify-start">
                                            <Target size={10} /> Termina: {challenge.fecha_fin ? new Date(challenge.fecha_fin).toLocaleDateString() : 'Sin fecha'}
                                        </p>

                                        <div className="flex flex-wrap items-center justify-center lg:justify-start gap-6 mt-6">
                                            <div className="flex items-center gap-3 bg-black/40 px-4 py-2 rounded-xl border border-white/5">
                                                <Users size={14} className="text-zinc-600" />
                                                <div className="flex flex-col">
                                                    <span className="text-[8px] font-black text-zinc-600 uppercase">Personal</span>
                                                    <span className="text-xs font-black text-white tabular-nums">{challenge.participants_count}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 bg-black/40 px-4 py-2 rounded-xl border border-white/5">
                                                <Zap size={14} className="text-yellow-500" />
                                                <div className="flex flex-col">
                                                    <span className="text-[8px] font-black text-zinc-600 uppercase">Recompensa</span>
                                                    <span className="text-xs font-black text-yellow-500 tabular-nums">{challenge.points_prize} XP</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-3 w-full lg:w-48">
                                        {challenge.is_participant ? (
                                            challenge.participant_status === 'pending_validation' ? (
                                                <button className="w-full px-6 py-3.5 bg-blue-600/20 text-blue-400 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-blue-500/30 cursor-wait">
                                                    EN REVISIÓN... ⏳
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={async () => {
                                                        const toastId = toast.loading('Enviando reporte...');
                                                        try {
                                                            const res = await fetch('/api/challenges/complete', {
                                                                method: 'POST',
                                                                headers: { 'Content-Type': 'application/json' },
                                                                body: JSON.stringify({ challengeId: challenge.id })
                                                            });
                                                            if (res.ok) {
                                                                toast.success('¡Reporte enviado! Esperando validación del coach.', { id: toastId });
                                                                fetchGamificationData();
                                                            } else {
                                                                const data = await res.json();
                                                                toast.error(data.error || 'Error al reportar', { id: toastId });
                                                            }
                                                        } catch (_err) {
                                                            toast.error('Error de conexión', { id: toastId });
                                                        }
                                                    }}
                                                    className="w-full px-6 py-3.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-green-500/20 hover:scale-105 transition-all"
                                                >
                                                    REPORTAR LOGRO ✅
                                                </button>
                                            )
                                        ) : (
                                            <motion.button
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={() => handleJoinChallenge(challenge.id)}
                                                className="w-full px-6 py-3.5 bg-white text-black hover:bg-zinc-200 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl transition-all"
                                            >
                                                UNIRSE A MISIÓN
                                            </motion.button>
                                        )}
                                        <button className="w-full px-6 py-3.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-white/5 transition-all">
                                            VER BRIEFING
                                        </button>
                                    </div>
                                </div>

                                {/* Background Highlight */}
                                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-pink-500/20 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-700" />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Create Challenge Modal */}
            <AnimatePresence>
                {showCreateChallenge && (
                    <div
                        className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
                        onClick={() => setShowCreateChallenge(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-zinc-900 rounded-[3rem] border border-white/10 max-w-lg w-full p-10 text-white shadow-[0_0_100px_rgba(0,0,0,0.8)] relative overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Background Decoration */}
                            <div className="absolute top-0 right-0 w-40 h-40 bg-purple-600/10 rounded-full blur-[80px]" />
                            <div className="absolute bottom-0 left-0 w-40 h-40 bg-pink-600/10 rounded-full blur-[80px]" />

                            <div className="relative z-10">
                                <h2 className="text-3xl font-black mb-2 text-white italic tracking-tighter uppercase">
                                    NUEVA MISIÓN ⚔️
                                </h2>
                                <p className="text-zinc-500 text-xs font-black uppercase tracking-widest mb-8">Operación Estratégica de Comunidad</p>

                                <form className="space-y-6" onSubmit={async (e) => {
                                    e.preventDefault();
                                    const formData = new FormData(e.currentTarget);
                                    const title = formData.get('title') as string;
                                    const description = formData.get('description') as string;
                                    const duration = parseInt(formData.get('duration') as string);
                                    const points = parseInt(formData.get('points') as string);

                                    setLoading(true);
                                    try {
                                        const res = await fetch('/api/challenges', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                                title,
                                                description,
                                                type: challengeType,
                                                original_duration_days: duration,
                                                endDate: formData.get('endDate'),
                                                points_prize: points,
                                                target_student_id: challengeType === 'individual' ? targetStudent : null
                                            })
                                        });

                                        if (!res.ok) throw new Error();

                                        toast.success(challengeType === 'individual'
                                            ? '¡Duelo enviado! Esperando aceptación.'
                                            : '¡Desafío propuesto! Pendiente de aprobación.');

                                        setShowCreateChallenge(false);
                                        fetchGamificationData();
                                    } catch (_error) {
                                        toast.error('Error al crear el desafío');
                                    } finally {
                                        setLoading(false);
                                    }
                                }}>
                                    <div className="grid grid-cols-2 gap-2 p-1.5 bg-black/40 rounded-[1.5rem] border border-white/5 mb-6">
                                        <button
                                            type="button"
                                            onClick={() => setChallengeType('open')}
                                            className={`py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${challengeType === 'open' ? 'bg-white text-black shadow-xl ring-4 ring-white/10' : 'text-zinc-500 hover:text-zinc-300'}`}
                                        >
                                            🌍 Global
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setChallengeType('individual')}
                                            className={`py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${challengeType === 'individual' ? 'bg-white text-black shadow-xl ring-4 ring-white/10' : 'text-zinc-500 hover:text-zinc-300'}`}
                                        >
                                            ⚔️ Duelo
                                        </button>
                                    </div>

                                    {challengeType === 'individual' && (
                                        <motion.div
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            className="space-y-2"
                                        >
                                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Seleccionar Objetivo</label>
                                            <select
                                                required
                                                value={targetStudent}
                                                onChange={(e) => setTargetStudent(e.target.value)}
                                                className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 outline-none focus:border-purple-500/50 transition-all text-sm font-bold text-white shadow-inner appearance-none cursor-pointer"
                                            >
                                                <option value="" className="bg-zinc-900">Elegir un perfil...</option>
                                                {leaderboard.map(u => (
                                                    <option key={u.name} value={u.name} className="bg-zinc-900">{u.name}</option>
                                                ))}
                                            </select>
                                        </motion.div>
                                    )}

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Título Táctico</label>
                                        <input
                                            name="title"
                                            required
                                            placeholder={challengeType === 'individual' ? "Ej: DESAFÍO DE POWERLIFTING" : "Ej: OPERACIÓN ASISTENCIA PERFECTA"}
                                            className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 outline-none focus:border-purple-500/50 transition-all text-sm font-bold text-white shadow-inner placeholder:text-zinc-700"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Briefing de la Misión</label>
                                        <textarea
                                            name="description"
                                            required
                                            placeholder="Detallá los objetivos y las reglas del desafío..."
                                            className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 outline-none focus:border-purple-500/50 transition-all text-sm font-bold text-white shadow-inner h-24 resize-none placeholder:text-zinc-700"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Fecha Límite (Opcional)</label>
                                            <input
                                                name="endDate"
                                                type="date"
                                                className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 outline-none focus:border-purple-500/50 transition-all text-sm font-bold text-white shadow-inner"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">O Duración (Días)</label>
                                            <input
                                                name="duration"
                                                type="number"
                                                defaultValue={7}
                                                className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 outline-none focus:border-purple-500/50 transition-all text-sm font-bold text-white shadow-inner"
                                            />
                                        </div>
                                    </div>


                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Recompensa (puntos)</label>
                                        <input
                                            name="points"
                                            type="number"
                                            defaultValue={100}
                                            className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 outline-none focus:border-purple-500/50 transition-all text-sm font-bold text-white shadow-inner"
                                        />
                                    </div>
                                    <div className="flex gap-4 pt-6">
                                        <button
                                            type="button"
                                            onClick={() => setShowCreateChallenge(false)}
                                            className="flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-zinc-500 hover:text-white transition-all bg-white/5 hover:bg-white/10 active:scale-95"
                                        >
                                            ABORTAR
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-2xl shadow-purple-600/30 hover:scale-105 active:scale-95 disabled:opacity-50 transition-all"
                                        >
                                            {loading ? 'DESPLEGANDO...' : 'LANZAR MISIÓN'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
