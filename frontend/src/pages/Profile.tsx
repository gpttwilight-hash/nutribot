import { useEffect, useState } from 'react';
import { Settings, Trophy, MessageCircle, CreditCard, X, ChevronDown } from 'lucide-react';
import { useUserStore } from '../store/userStore';
import { useGamificationStore } from '../store/gamificationStore';
import { getPercentage, calculateDailyNorms } from '../utils/calculations';
import { GOAL_LABELS } from '../types';
import { useTelegram } from '../hooks/useTelegram';
import client from '../api/client';
import type { SubscriptionStatus } from '../types';

const GOALS = [
    { id: 'cut', emoji: '🔥', label: 'Похудение' },
    { id: 'bulk', emoji: '💪', label: 'Набор массы' },
    { id: 'maintain', emoji: '⚖️', label: 'Поддержание' },
];

const ACTIVITIES = [
    { id: 'sedentary', emoji: '🪑', label: 'Малоподвижный', desc: 'Офисная работа' },
    { id: 'moderate', emoji: '🚶', label: 'Умеренный', desc: '1-3 тренировки/нед.' },
    { id: 'active', emoji: '🏃', label: 'Активный', desc: '3-5 тренировок/нед.' },
    { id: 'athlete', emoji: '🏋️', label: 'Спортсмен', desc: '6-7 тренировок/нед.' },
];

export default function Profile() {
    const { user, updateProfile } = useUserStore();
    const { level, xp, xpToNext, streakDays, maxStreak, achievements, fetchProfile } = useGamificationStore();
    const { haptic } = useTelegram();
    const [subStatus, setSubStatus] = useState<SubscriptionStatus | null>(null);
    const [showSettings, setShowSettings] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');

    // Settings form state
    const [goal, setGoal] = useState('');
    const [gender, setGender] = useState('');
    const [age, setAge] = useState('');
    const [weight, setWeight] = useState('');
    const [height, setHeight] = useState('');
    const [targetWeight, setTargetWeight] = useState('');
    const [activityLevel, setActivityLevel] = useState('');

    useEffect(() => {
        fetchProfile();
        client.get<SubscriptionStatus>('/subscription/status')
            .then(r => setSubStatus(r.data))
            .catch(() => { });
    }, []);

    const openSettings = () => {
        setGoal(user?.goal ?? '');
        setGender(user?.gender ?? '');
        setAge(user?.age ? String(user.age) : '');
        setWeight(user?.weight_kg ? String(user.weight_kg) : '');
        setHeight(user?.height_cm ? String(user.height_cm) : '');
        setTargetWeight(user?.target_weight_kg ? String(user.target_weight_kg) : '');
        setActivityLevel(user?.activity_level ?? '');
        setSaveError('');
        setShowSettings(true);
        haptic.selection();
    };

    const previewNorms = goal && gender && age && weight && height && activityLevel
        ? calculateDailyNorms(gender, +weight, +height, +age, activityLevel, goal)
        : null;

    const canSave = !!(goal && gender && age && weight && height && activityLevel);

    const handleSave = async () => {
        if (!canSave) return;
        setSaving(true);
        setSaveError('');
        try {
            await updateProfile({
                goal,
                gender,
                age: +age,
                weight_kg: +weight,
                height_cm: +height,
                target_weight_kg: targetWeight ? +targetWeight : undefined,
                activity_level: activityLevel,
            });
            haptic.notification('success');
            setShowSettings(false);
        } catch {
            setSaveError('Ошибка сохранения. Попробуй ещё раз.');
            haptic.notification('error');
        } finally {
            setSaving(false);
        }
    };

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
                            className={`aspect-square rounded-xl flex flex-col items-center justify-center text-center p-1 transition-all ${a.earned ? 'bg-primary-500/10' : 'bg-white/3 opacity-30'}`}
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
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-warning-500/10 flex items-center justify-center">
                        <CreditCard size={18} className="text-warning-400" />
                    </div>
                    <div>
                        <div className="font-medium text-sm">Подписка</div>
                        <div className="text-xs text-tg-hint">{subLabel()}</div>
                    </div>
                </div>
            </div>

            {/* Menu items */}
            <div className="glass-card divide-y divide-white/5">
                <button
                    onClick={openSettings}
                    className="w-full flex items-center gap-3 p-4 hover:bg-white/5 transition-colors text-left"
                >
                    <Settings size={18} className="text-tg-hint" />
                    <span className="text-sm">Мои параметры</span>
                    <ChevronDown size={16} className="text-tg-hint ml-auto -rotate-90" />
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

            {/* Settings modal */}
            {showSettings && (
                <div className="fixed inset-0 z-50 flex flex-col justify-end">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setShowSettings(false)}
                    />
                    <div className="relative bg-tg-bg rounded-t-3xl max-h-[92vh] overflow-y-auto">
                        {/* Handle */}
                        <div className="flex justify-center pt-3 pb-1">
                            <div className="w-10 h-1 rounded-full bg-white/20" />
                        </div>

                        <div className="flex items-center justify-between px-4 py-3">
                            <h2 className="text-lg font-bold">Мои параметры</h2>
                            <button
                                onClick={() => setShowSettings(false)}
                                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="px-4 pb-8 space-y-5">
                            {/* Goal */}
                            <div>
                                <label className="text-sm text-tg-hint mb-2 block">Цель</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {GOALS.map(g => (
                                        <button
                                            key={g.id}
                                            onClick={() => { setGoal(g.id); haptic.selection(); }}
                                            className={`py-3 rounded-xl text-sm font-medium transition-all flex flex-col items-center gap-1 ${goal === g.id
                                                ? 'bg-primary-500 text-white'
                                                : 'bg-white/5 text-tg-text border border-white/10'
                                                }`}
                                        >
                                            <span>{g.emoji}</span>
                                            <span>{g.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Gender */}
                            <div>
                                <label className="text-sm text-tg-hint mb-2 block">Пол</label>
                                <div className="flex gap-3">
                                    {[{ id: 'male', label: '👨 Мужской' }, { id: 'female', label: '👩 Женский' }].map(g => (
                                        <button
                                            key={g.id}
                                            onClick={() => { setGender(g.id); haptic.selection(); }}
                                            className={`flex-1 py-3 rounded-xl font-medium transition-all text-sm ${gender === g.id
                                                ? 'bg-primary-500 text-white'
                                                : 'bg-white/5 text-tg-text border border-white/10'
                                                }`}
                                        >
                                            {g.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Age */}
                            <div>
                                <label className="text-sm text-tg-hint mb-1 block">Возраст</label>
                                <input
                                    type="number"
                                    value={age}
                                    onChange={e => setAge(e.target.value)}
                                    placeholder="25"
                                    className="input-field"
                                />
                            </div>

                            {/* Height & Weight */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-sm text-tg-hint mb-1 block">Рост (см)</label>
                                    <input
                                        type="number"
                                        value={height}
                                        onChange={e => setHeight(e.target.value)}
                                        placeholder="175"
                                        className="input-field"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm text-tg-hint mb-1 block">Вес (кг)</label>
                                    <input
                                        type="number"
                                        value={weight}
                                        onChange={e => setWeight(e.target.value)}
                                        placeholder="75"
                                        className="input-field"
                                    />
                                </div>
                            </div>

                            {/* Target weight */}
                            <div>
                                <label className="text-sm text-tg-hint mb-1 block">Целевой вес (кг, необязательно)</label>
                                <input
                                    type="number"
                                    value={targetWeight}
                                    onChange={e => setTargetWeight(e.target.value)}
                                    placeholder="70"
                                    className="input-field"
                                />
                            </div>

                            {/* Activity */}
                            <div>
                                <label className="text-sm text-tg-hint mb-2 block">Уровень активности</label>
                                <div className="space-y-2">
                                    {ACTIVITIES.map(a => (
                                        <button
                                            key={a.id}
                                            onClick={() => { setActivityLevel(a.id); haptic.selection(); }}
                                            className={`w-full p-3 rounded-xl border transition-all text-left flex items-center gap-3 ${activityLevel === a.id
                                                ? 'border-primary-500 bg-primary-500/10'
                                                : 'border-white/10 bg-white/5'
                                                }`}
                                        >
                                            <span className="text-xl">{a.emoji}</span>
                                            <div>
                                                <div className="text-sm font-medium">{a.label}</div>
                                                <div className="text-xs text-tg-hint">{a.desc}</div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Preview norms */}
                            {previewNorms && (
                                <div className="glass-card p-4">
                                    <div className="text-xs text-tg-hint mb-2">Новая норма КБЖУ</div>
                                    <div className="flex items-center justify-between">
                                        <div className="text-center">
                                            <div className="text-xl font-bold text-primary-400">{previewNorms.calories}</div>
                                            <div className="text-xs text-tg-hint">ккал</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-lg font-bold text-blue-400">{previewNorms.protein_g}г</div>
                                            <div className="text-xs text-tg-hint">белки</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-lg font-bold text-yellow-400">{previewNorms.fat_g}г</div>
                                            <div className="text-xs text-tg-hint">жиры</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-lg font-bold text-green-400">{previewNorms.carbs_g}г</div>
                                            <div className="text-xs text-tg-hint">углеводы</div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {saveError && (
                                <p className="text-red-400 text-sm text-center">{saveError}</p>
                            )}

                            <button
                                onClick={handleSave}
                                disabled={!canSave || saving}
                                className={`btn-primary w-full py-4 ${(!canSave || saving) ? 'opacity-40 cursor-not-allowed' : ''}`}
                            >
                                {saving ? 'Сохраняем...' : 'Сохранить'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
