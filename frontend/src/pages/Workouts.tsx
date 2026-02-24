import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Check, X } from 'lucide-react';
import { useTelegram } from '../hooks/useTelegram';
import { workoutsApi } from '../api/workouts';
import type { Workout, WorkoutStats } from '../types';

export default function Workouts() {
    const [currentMonth, setCurrentMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });
    const [workouts, setWorkouts] = useState<Workout[]>([]);
    const [stats, setStats] = useState<WorkoutStats>({ last_7_days: 0, last_30_days: 0, best_streak: 0 });
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [notes, setNotes] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { haptic } = useTelegram();

    useEffect(() => { loadWorkouts(); }, [currentMonth]);
    useEffect(() => { loadStats(); }, []);

    const loadWorkouts = async () => {
        try { setWorkouts(await workoutsApi.getMonth(currentMonth)); } catch { }
    };
    const loadStats = async () => {
        try { setStats(await workoutsApi.getStats()); } catch { }
    };

    const [year, month] = currentMonth.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const firstDayOfWeek = (new Date(year, month - 1, 1).getDay() + 6) % 7;
    const monthName = new Date(year, month - 1).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
    const workoutDates = new Set(workouts.filter(w => w.completed).map(w => w.workout_date));
    const today = new Date().toISOString().split('T')[0];

    const navigateMonth = (delta: number) => {
        const d = new Date(year, month - 1 + delta, 1);
        setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    };

    const handleDateClick = (day: number) => {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        setSelectedDate(dateStr);
        setNotes(workouts.find(w => w.workout_date === dateStr)?.notes || '');
        haptic.selection();
    };

    const handleSave = async () => {
        if (!selectedDate) return;
        setIsLoading(true);
        try {
            await workoutsApi.create({ workout_date: selectedDate, completed: true, notes: notes || undefined });
            haptic.notification('success');
            await loadWorkouts();
            await loadStats();
            setSelectedDate(null);
        } catch { }
        setIsLoading(false);
    };

    const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

    return (
        <div className="px-4 pt-4 space-y-4 animate-fade-in">
            <h1 className="text-xl font-bold">Тренировки</h1>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
                {[
                    { label: 'за 7 дней', value: stats.last_7_days },
                    { label: 'за 30 дней', value: stats.last_30_days },
                    { label: 'лучшая серия', value: stats.best_streak },
                ].map(s => (
                    <div key={s.label} className="glass-card p-3 text-center">
                        <div className="text-2xl font-bold text-primary-400">{s.value}</div>
                        <div className="text-[10px] text-tg-hint">{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Calendar */}
            <div className="glass-card p-4">
                <div className="flex items-center justify-between mb-4">
                    <button onClick={() => navigateMonth(-1)} className="p-2 text-tg-hint hover:text-tg-text">
                        <ChevronLeft size={20} />
                    </button>
                    <span className="font-semibold capitalize">{monthName}</span>
                    <button onClick={() => navigateMonth(1)} className="p-2 text-tg-hint hover:text-tg-text">
                        <ChevronRight size={20} />
                    </button>
                </div>

                <div className="grid grid-cols-7 gap-1 mb-2">
                    {WEEKDAYS.map(wd => (
                        <div key={wd} className="text-center text-xs text-tg-hint font-medium py-1">{wd}</div>
                    ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`e-${i}`} />)}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                        const day = i + 1;
                        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        const hasWorkout = workoutDates.has(dateStr);
                        const isToday = dateStr === today;

                        return (
                            <button
                                key={day}
                                onClick={() => handleDateClick(day)}
                                className={`aspect-square rounded-xl flex items-center justify-center text-sm font-medium transition-all ${hasWorkout ? 'bg-success-500/20 text-success-400'
                                        : isToday ? 'bg-primary-500/10 text-primary-400 ring-1 ring-primary-500/30'
                                            : 'text-tg-text hover:bg-white/5'
                                    }`}
                            >
                                {hasWorkout ? <Check size={16} strokeWidth={3} /> : day}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Workout Modal */}
            {selectedDate && (
                <>
                    <div className="bottom-sheet-overlay" onClick={() => setSelectedDate(null)} />
                    <div className="bottom-sheet-content">
                        <div className="bottom-sheet-handle" />
                        <div className="px-4 pb-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-lg">
                                    {new Date(selectedDate + 'T12:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                                </h3>
                                <button onClick={() => setSelectedDate(null)} className="p-1 text-tg-hint"><X size={20} /></button>
                            </div>

                            <div className="flex items-center gap-3 mb-4 p-3 glass-card">
                                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${workoutDates.has(selectedDate) ? 'bg-success-500 border-success-500' : 'border-white/20'
                                    }`}>
                                    {workoutDates.has(selectedDate) && <Check size={14} className="text-white" />}
                                </div>
                                <span className="font-medium">Тренировка выполнена</span>
                            </div>

                            <div className="mb-4">
                                <label className="text-sm text-tg-hint mb-2 block">Заметка (необязательно)</label>
                                <textarea
                                    value={notes}
                                    onChange={e => setNotes(e.target.value.slice(0, 300))}
                                    placeholder="Что делали на тренировке..."
                                    className="input-field h-24 resize-none"
                                />
                                <div className="text-xs text-tg-hint text-right mt-1">{notes.length}/300</div>
                            </div>

                            <button onClick={handleSave} disabled={isLoading} className="btn-primary w-full">
                                {isLoading ? 'Сохраняем...' : 'Сохранить +40 XP'}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
