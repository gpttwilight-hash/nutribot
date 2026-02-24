import { useEffect, useState } from 'react';
import { Settings, Trophy, Flame, MessageCircle, CreditCard, Lock } from 'lucide-react';
import { useUserStore } from '../store/userStore';
import { useGamificationStore } from '../store/gamificationStore';
import { getPercentage } from '../utils/calculations';
import { GOAL_LABELS } from '../types';
import client from '../api/client';
import type { SubscriptionStatus } from '../types';

export default function Profile() {
    const { user } = useUserStore();
    const { level, xp, xpToNext, streakDays, maxStreak, achievements, fetchProfile } = useGamificationStore();
    const [subStatus, setSubStatus] = useState<SubscriptionStatus | null>(null);
    const [showPaywall, setShowPaywall] = useState(false);

    useEffect(() => {
        fetchProfile();
        client.get<SubscriptionStatus>('/subscription/status')
            .then(r => setSubStatus(r.data))
            .catch(() => { });
    }, []);

    const xpPct = getPercentage(xp, xpToNext);
    const earnedAchievements = achievements.filter(a => a.earned);

    const subLabel = () => {
        if (!subStatus) return '—';
        if (subStatus.status === 'trial') return `Триал · осталось ${subStatus.days_left} дн.`;
        if (subStatus.status === 'active') return `Активна · осталось ${subStatus.days_left} дн.`;
        return 'Истекла';
    };

    return (
        <div className="px-4 pt-4 space-y-4 animate-fade-in pb-4">
            {/* User card */}
            <div className="glass-card p-5">
                <div className="flex items-center gap-4 mb-4">
                    {/* Avatar */}
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-primary-500/20">
                        {user?.first_name?.charAt(0) || '?'}
                    </div>
                    <div>
                        <h2 className="text-lg font-bold">{user?.first_name || 'Атлет'}</h2>
                        {user?.username && <p className="text-sm text-tg-hint">@{user.username}</p>}
                        <div className="flex items-center gap-2 mt-1">
                            <span className="badge bg-primary-500/20 text-primary-400">Уровень {level}</span>
                            {user?.goal && (
                                <span className="badge bg-white/10 text-tg-hint">{GOAL_LABELS[user.goal]}</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* XP bar */}
                <div>
                    <div className="flex justify-between text-xs text-tg-hint mb-1.5">
                        <span className="flex items-center gap-1"><Trophy size={11} /> Уровень {level}</span>
                        <span>{xp} / {xpToNext} XP</span>
                    </div>
                    <div className="progress-bar">
                        <div
                            className="progress-fill bg-gradient-to-r from-primary-500 to-primary-400"
                            style={{ width: `${xpPct}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 gap-3">
                <div className="glass-card p-4 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                        <span className={`text-2xl ${streakDays > 7 ? 'animate-pulse-fire' : ''}`}>🔥</span>
                        <span className="text-2xl font-bold">{streakDays}</span>
                    </div>
                    <div className="text-xs text-tg-hint">Текущий стрик</div>
                </div>
                <div className="glass-card p-4 text-center">
                    <div className="text-2xl font-bold">{maxStreak}</div>
                    <div className="text-xs text-tg-hint">Максимальный стрик</div>
                </div>
            </div>

            {/* Achievements */}
            <div className="glass-card p-4">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">Достижения</h3>
                    <span className="text-sm text-tg-hint">{earnedAchievements.length}/{achievements.length}</span>
                </div>
                <div className="grid grid-cols-5 gap-2">
                    {achievements.map(a => (
                        <div
                            key={a.code}
                            className={`aspect-square rounded-xl flex flex-col items-center justify-center text-center p-1 transition-all ${a.earned ? 'bg-primary-500/10' : 'bg-white/3 opacity-30'
                                }`}
                            title={a.name}
                        >
                            <span className="text-xl">{a.icon}</span>
                            <span className="text-[8px] text-tg-hint mt-0.5 leading-tight line-clamp-2">{a.name}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Subscription */}
            <div className="glass-card p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-warning-500/10 flex items-center justify-center">
                            <CreditCard size={18} className="text-warning-400" />
                        </div>
                        <div>
                            <div className="font-medium text-sm">Подписка</div>
                            <div className="text-xs text-tg-hint">{subLabel()}</div>
                        </div>
                    </div>
                    {subStatus?.status === 'expired' && (
                        <button
                            onClick={() => setShowPaywall(true)}
                            className="btn-primary py-2 px-3 text-sm"
                        >
                            Оформить
                        </button>
                    )}
                </div>
            </div>

            {/* Menu items */}
            <div className="glass-card divide-y divide-white/5">
                <button className="w-full flex items-center gap-3 p-4 hover:bg-white/5 transition-colors text-left">
                    <Settings size={18} className="text-tg-hint" />
                    <span className="text-sm">Мои параметры</span>
                </button>
                <a
                    href="https://t.me/NutriBotSupport"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center gap-3 p-4 hover:bg-white/5 transition-colors"
                >
                    <MessageCircle size={18} className="text-tg-hint" />
                    <span className="text-sm">Поддержка</span>
                </a>
            </div>
        </div>
    );
}
