import { useState } from 'react';
import { ChevronRight, ChevronLeft, Flame, Scale, Ruler, Activity, Sparkles } from 'lucide-react';
import { useUserStore } from '../store/userStore';
import { useTelegram } from '../hooks/useTelegram';
import { calculateDailyNorms } from '../utils/calculations';
import { GOAL_LABELS, ACTIVITY_LABELS } from '../types';

const GOALS = [
    { id: 'cut', emoji: '🔥', label: 'Похудение', desc: 'Снижение веса и жировой массы' },
    { id: 'bulk', emoji: '💪', label: 'Набор массы', desc: 'Рост мышечной массы' },
    { id: 'maintain', emoji: '⚖️', label: 'Поддержание', desc: 'Сохранение текущей формы' },
];

const ACTIVITIES = [
    { id: 'sedentary', emoji: '🪑', label: 'Малоподвижный', desc: 'Офисная работа, мало движения' },
    { id: 'moderate', emoji: '🚶', label: 'Умеренный', desc: '1-3 тренировки в неделю' },
    { id: 'active', emoji: '🏃', label: 'Активный', desc: '3-5 тренировок в неделю' },
    { id: 'athlete', emoji: '🏋️', label: 'Спортсмен', desc: '6-7 тренировок в неделю' },
];

export default function Onboarding() {
    const [step, setStep] = useState(0);
    const [goal, setGoal] = useState('');
    const [gender, setGender] = useState('');
    const [age, setAge] = useState('');
    const [weight, setWeight] = useState('');
    const [height, setHeight] = useState('');
    const [targetWeight, setTargetWeight] = useState('');
    const [activityLevel, setActivityLevel] = useState('');
    const { completeOnboarding } = useUserStore();
    const { haptic } = useTelegram();

    const norms = gender && weight && height && age && activityLevel && goal
        ? calculateDailyNorms(gender, +weight, +height, +age, activityLevel, goal)
        : null;

    const canNext = () => {
        switch (step) {
            case 0: return !!goal;
            case 1: return !!gender && !!age && !!weight && !!height;
            case 2: return !!activityLevel;
            case 3: return true;
            case 4: return true;
            default: return false;
        }
    };

    const handleNext = () => {
        haptic.selection();
        if (step < 4) {
            setStep(step + 1);
        }
    };

    const handleBack = () => {
        haptic.selection();
        if (step > 0) setStep(step - 1);
    };

    const handleFinish = async () => {
        haptic.notification('success');
        try {
            await completeOnboarding({
                goal,
                gender,
                age: +age,
                weight_kg: +weight,
                height_cm: +height,
                target_weight_kg: targetWeight ? +targetWeight : undefined,
                activity_level: activityLevel,
            });
        } catch (err) {
            console.error('Onboarding error:', err);
        }
    };

    return (
        <div className="min-h-screen bg-tg-bg flex flex-col">
            {/* Progress bar */}
            <div className="px-4 pt-4">
                <div className="flex gap-1.5">
                    {[0, 1, 2, 3, 4].map((i) => (
                        <div
                            key={i}
                            className={`h-1 flex-1 rounded-full transition-all duration-500 ${i <= step ? 'bg-primary-500' : 'bg-white/10'
                                }`}
                        />
                    ))}
                </div>
                <p className="text-tg-hint text-xs mt-2">Шаг {step + 1} из 5</p>
            </div>

            <div className="flex-1 px-4 py-6 overflow-y-auto">
                {/* Step 0: Goal */}
                {step === 0 && (
                    <div className="animate-fade-in">
                        <h1 className="text-2xl font-bold mb-2">Какая у вас цель?</h1>
                        <p className="text-tg-hint mb-6">Выберите основную цель</p>
                        <div className="space-y-3">
                            {GOALS.map((g) => (
                                <button
                                    key={g.id}
                                    onClick={() => { setGoal(g.id); haptic.selection(); }}
                                    className={`w-full p-4 rounded-2xl border-2 transition-all duration-200 text-left flex items-center gap-4 ${goal === g.id
                                            ? 'border-primary-500 bg-primary-500/10'
                                            : 'border-white/10 bg-white/5 hover:border-white/20'
                                        }`}
                                >
                                    <span className="text-3xl">{g.emoji}</span>
                                    <div>
                                        <div className="font-semibold text-lg">{g.label}</div>
                                        <div className="text-sm text-tg-hint">{g.desc}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Step 1: Body params */}
                {step === 1 && (
                    <div className="animate-fade-in">
                        <h1 className="text-2xl font-bold mb-2">Параметры тела</h1>
                        <p className="text-tg-hint mb-6">Для расчёта суточной нормы</p>

                        <div className="space-y-4">
                            {/* Gender */}
                            <div>
                                <label className="text-sm text-tg-hint mb-2 block">Пол</label>
                                <div className="flex gap-3">
                                    {[
                                        { id: 'male', label: '👨 Мужской' },
                                        { id: 'female', label: '👩 Женский' },
                                    ].map((g) => (
                                        <button
                                            key={g.id}
                                            onClick={() => { setGender(g.id); haptic.selection(); }}
                                            className={`flex-1 py-3 rounded-xl font-medium transition-all ${gender === g.id
                                                    ? 'bg-primary-500 text-white'
                                                    : 'bg-white/5 text-tg-text border border-white/10'
                                                }`}
                                        >
                                            {g.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="text-sm text-tg-hint mb-1 block">Возраст</label>
                                <input
                                    type="number"
                                    value={age}
                                    onChange={(e) => setAge(e.target.value)}
                                    placeholder="25"
                                    className="input-field"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-sm text-tg-hint mb-1 block">Рост (см)</label>
                                    <input
                                        type="number"
                                        value={height}
                                        onChange={(e) => setHeight(e.target.value)}
                                        placeholder="175"
                                        className="input-field"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm text-tg-hint mb-1 block">Вес (кг)</label>
                                    <input
                                        type="number"
                                        value={weight}
                                        onChange={(e) => setWeight(e.target.value)}
                                        placeholder="75"
                                        className="input-field"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-sm text-tg-hint mb-1 block">Целевой вес (кг, необязательно)</label>
                                <input
                                    type="number"
                                    value={targetWeight}
                                    onChange={(e) => setTargetWeight(e.target.value)}
                                    placeholder="70"
                                    className="input-field"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 2: Activity */}
                {step === 2 && (
                    <div className="animate-fade-in">
                        <h1 className="text-2xl font-bold mb-2">Уровень активности</h1>
                        <p className="text-tg-hint mb-6">Как часто вы тренируетесь?</p>
                        <div className="space-y-3">
                            {ACTIVITIES.map((a) => (
                                <button
                                    key={a.id}
                                    onClick={() => { setActivityLevel(a.id); haptic.selection(); }}
                                    className={`w-full p-4 rounded-2xl border-2 transition-all duration-200 text-left flex items-center gap-4 ${activityLevel === a.id
                                            ? 'border-primary-500 bg-primary-500/10'
                                            : 'border-white/10 bg-white/5 hover:border-white/20'
                                        }`}
                                >
                                    <span className="text-2xl">{a.emoji}</span>
                                    <div>
                                        <div className="font-semibold">{a.label}</div>
                                        <div className="text-sm text-tg-hint">{a.desc}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Step 3: Results */}
                {step === 3 && norms && (
                    <div className="animate-fade-in">
                        <h1 className="text-2xl font-bold mb-2">Ваша норма КБЖУ</h1>
                        <p className="text-tg-hint mb-6">Рассчитано по формуле Миффлина-Сан Жеора</p>

                        <div className="glass-card p-6 mb-4">
                            <div className="text-center mb-6">
                                <div className="text-5xl font-bold text-primary-400">{norms.calories}</div>
                                <div className="text-tg-hint mt-1">ккал / день</div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-blue-400">{norms.protein_g}г</div>
                                    <div className="text-xs text-tg-hint mt-1">Белки</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-yellow-400">{norms.fat_g}г</div>
                                    <div className="text-xs text-tg-hint mt-1">Жиры</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-green-400">{norms.carbs_g}г</div>
                                    <div className="text-xs text-tg-hint mt-1">Углеводы</div>
                                </div>
                            </div>
                        </div>

                        <p className="text-sm text-tg-hint text-center">
                            Вы сможете скорректировать нормы позже в профиле
                        </p>
                    </div>
                )}

                {/* Step 4: Start */}
                {step === 4 && (
                    <div className="animate-fade-in text-center">
                        <div className="text-6xl mb-4">🎉</div>
                        <h1 className="text-2xl font-bold mb-2">Всё готово!</h1>
                        <p className="text-tg-hint mb-6">
                            Активируем 7-дневный бесплатный триал с полным доступом ко всем функциям
                        </p>

                        <div className="glass-card p-6 mb-6 text-left">
                            <h3 className="font-semibold mb-3">Что вас ждёт:</h3>
                            <ul className="space-y-2.5">
                                {[
                                    '📸 ИИ-анализ еды по фото',
                                    '📊 Подробная статистика питания',
                                    '🏋️ Трекер тренировок',
                                    '🔥 Стрики и достижения',
                                    '⭐ XP и система уровней',
                                ].map((item) => (
                                    <li key={item} className="flex items-center gap-2 text-sm">
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <button
                            onClick={handleFinish}
                            className="btn-primary w-full text-lg py-4 flex items-center justify-center gap-2"
                        >
                            <Sparkles size={20} />
                            Начать!
                        </button>
                    </div>
                )}
            </div>

            {/* Navigation buttons */}
            {step < 4 && (
                <div className="px-4 pb-6 flex gap-3">
                    {step > 0 && (
                        <button onClick={handleBack} className="btn-secondary flex items-center gap-1">
                            <ChevronLeft size={18} />
                            Назад
                        </button>
                    )}
                    <button
                        onClick={handleNext}
                        disabled={!canNext()}
                        className={`btn-primary flex-1 flex items-center justify-center gap-1 ${!canNext() ? 'opacity-40 cursor-not-allowed' : ''
                            }`}
                    >
                        Далее
                        <ChevronRight size={18} />
                    </button>
                </div>
            )}
        </div>
    );
}
