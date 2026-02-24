import { useEffect, useState } from 'react';
import { Plus, Flame, Trophy, Scale, Dumbbell, Gift } from 'lucide-react';
import { useUserStore } from '../store/userStore';
import { useFoodStore } from '../store/foodStore';
import { useGamificationStore } from '../store/gamificationStore';
import { useTelegram } from '../hooks/useTelegram';
import { getPercentage, getProgressColor, formatNumber } from '../utils/calculations';
import { MEAL_LABELS, MEAL_ICONS, type MealType } from '../types';

export default function Dashboard() {
    const { user } = useUserStore();
    const { entries, totals, goal, fetchDayLog, isLoading } = useFoodStore();
    const { level, xp, xpToNext, streakDays, dailyBonusClaimed, claimDailyBonus, fetchProfile } = useGamificationStore();
    const { haptic } = useTelegram();
    const [showAddModal, setShowAddModal] = useState(false);

    useEffect(() => {
        fetchDayLog();
        fetchProfile();
    }, []);

    const caloriePercent = getPercentage(totals.calories, goal.calories);
    const remaining = Math.max(0, goal.calories - totals.calories);

    // Group entries by meal type
    const mealGroups: Record<MealType, typeof entries> = {
        breakfast: [],
        lunch: [],
        dinner: [],
        snack: [],
    };
    entries.forEach((e) => {
        if (mealGroups[e.meal_type]) {
            mealGroups[e.meal_type].push(e);
        }
    });

    // SVG circular progress
    const radius = 70;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (Math.min(caloriePercent, 100) / 100) * circumference;

    const macros = [
        { label: 'Белки', current: totals.protein_g, target: goal.protein_g, color: 'bg-blue-400' },
        { label: 'Жиры', current: totals.fat_g, target: goal.fat_g, color: 'bg-yellow-400' },
        { label: 'Углеводы', current: totals.carbs_g, target: goal.carbs_g, color: 'bg-green-400' },
    ];

    return (
        <div className="px-4 pt-4 space-y-4 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold">
                        Привет, {user?.first_name || 'Атлет'} 👋
                    </h1>
                    <p className="text-sm text-tg-hint">Сегодня</p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Streak */}
                    <div className="flex items-center gap-1 glass-card px-3 py-1.5">
                        <span className={`text-lg ${streakDays > 7 ? 'animate-pulse-fire' : ''}`}>🔥</span>
                        <span className="font-bold text-sm">{streakDays}</span>
                    </div>
                    {/* Level */}
                    <div className="glass-card px-3 py-1.5">
                        <span className="text-xs text-tg-hint">Ур.</span>{' '}
                        <span className="font-bold text-sm text-primary-400">{level}</span>
                    </div>
                </div>
            </div>

            {/* XP Bar */}
            <div className="glass-card p-3">
                <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-tg-hint flex items-center gap-1">
                        <Trophy size={12} /> Уровень {level}
                    </span>
                    <span className="text-tg-hint">
                        {xp} / {xpToNext} XP
                    </span>
                </div>
                <div className="progress-bar">
                    <div
                        className="progress-fill bg-gradient-to-r from-primary-500 to-primary-400 animate-progress-fill"
                        style={{ width: `${getPercentage(xp, xpToNext)}%` }}
                    />
                </div>
            </div>

            {/* Daily Bonus */}
            {!dailyBonusClaimed && (
                <button
                    onClick={() => {
                        haptic.notification('success');
                        claimDailyBonus();
                    }}
                    className="w-full glass-card p-3 flex items-center justify-between hover:bg-white/10 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center">
                            <Gift size={20} className="text-primary-400" />
                        </div>
                        <div className="text-left">
                            <div className="font-semibold text-sm">Ежедневный бонус</div>
                            <div className="text-xs text-tg-hint">Забери +10 XP!</div>
                        </div>
                    </div>
                    <div className="text-primary-400 font-bold text-sm">Забрать</div>
                </button>
            )}

            {/* Calorie Ring + Macros */}
            <div className="glass-card p-5">
                <div className="flex items-center gap-6">
                    {/* Ring Chart */}
                    <div className="relative flex-shrink-0">
                        <svg width="160" height="160" className="circular-progress">
                            <circle
                                cx="80"
                                cy="80"
                                r={radius}
                                fill="none"
                                stroke="rgba(255,255,255,0.08)"
                                strokeWidth="12"
                            />
                            <circle
                                cx="80"
                                cy="80"
                                r={radius}
                                fill="none"
                                stroke={caloriePercent > 100 ? '#ff3d30' : caloriePercent > 90 ? '#eab308' : '#22c55e'}
                                strokeWidth="12"
                                strokeLinecap="round"
                                strokeDasharray={circumference}
                                strokeDashoffset={strokeDashoffset}
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-2xl font-bold">{Math.round(totals.calories)}</span>
                            <span className="text-xs text-tg-hint">из {goal.calories}</span>
                            <span className="text-[10px] text-tg-hint mt-0.5">ккал</span>
                        </div>
                    </div>

                    {/* Macro bars */}
                    <div className="flex-1 space-y-3">
                        {macros.map((m) => {
                            const pct = getPercentage(m.current, m.target);
                            return (
                                <div key={m.label}>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-tg-hint">{m.label}</span>
                                        <span>
                                            {Math.round(m.current)}
                                            <span className="text-tg-hint">/{m.target}г</span>
                                        </span>
                                    </div>
                                    <div className="progress-bar">
                                        <div
                                            className={`progress-fill ${m.color} animate-progress-fill`}
                                            style={{ width: `${Math.min(pct, 100)}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}

                        <div className="text-center pt-1">
                            <span className="text-sm text-tg-hint">Осталось </span>
                            <span className="text-sm font-bold text-primary-400">{remaining} ккал</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Meal List */}
            <div className="space-y-3">
                {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map((mealType) => {
                    const items = mealGroups[mealType];
                    const mealCals = items.reduce((sum, e) => sum + e.calories, 0);

                    return (
                        <div key={mealType} className="glass-card p-4">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">{MEAL_ICONS[mealType]}</span>
                                    <span className="font-semibold text-sm">{MEAL_LABELS[mealType]}</span>
                                </div>
                                <span className="text-sm text-tg-hint">{Math.round(mealCals)} ккал</span>
                            </div>

                            {items.length > 0 ? (
                                <div className="space-y-1.5">
                                    {items.map((item) => (
                                        <div
                                            key={item.id}
                                            className="flex justify-between items-center py-1.5 px-2 rounded-lg hover:bg-white/5 text-sm"
                                        >
                                            <span className="text-tg-text truncate flex-1">{item.food_name}</span>
                                            <span className="text-tg-hint ml-2 flex-shrink-0">
                                                {Math.round(item.calories)} ккал
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-tg-hint py-1">Нет записей</p>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3 pb-4">
                <button
                    className="glass-card p-3 flex items-center gap-2 hover:bg-white/10 transition-colors"
                    onClick={() => {
                        haptic.impact('medium');
                        // Navigate to workouts tab would be handled by parent
                    }}
                >
                    <Dumbbell size={18} className="text-primary-400" />
                    <span className="text-sm font-medium">Тренировка</span>
                </button>
                <button
                    className="glass-card p-3 flex items-center gap-2 hover:bg-white/10 transition-colors"
                    onClick={() => haptic.impact('medium')}
                >
                    <Scale size={18} className="text-primary-400" />
                    <span className="text-sm font-medium">Внести вес</span>
                </button>
            </div>

            {/* FAB */}
            <button
                onClick={() => {
                    haptic.impact('medium');
                    setShowAddModal(true);
                }}
                className="fixed bottom-20 right-4 z-20 w-14 h-14 rounded-full bg-primary-500 text-white flex items-center justify-center shadow-lg shadow-primary-500/30 hover:bg-primary-600 active:scale-90 transition-all"
            >
                <Plus size={28} />
            </button>
        </div>
    );
}
