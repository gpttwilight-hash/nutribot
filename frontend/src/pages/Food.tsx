import { useState, useEffect, useRef } from 'react';
import { Search, Camera, Clock, Star, Plus, X, ChevronRight } from 'lucide-react';
import { useFoodStore } from '../store/foodStore';
import { useGamificationStore } from '../store/gamificationStore';
import { useTelegram } from '../hooks/useTelegram';
import { foodApi } from '../api/food';
import type { FoodSearchResult, MealType, FoodEntry } from '../types';
import { MEAL_LABELS, MEAL_ICONS } from '../types';

type Tab = 'search' | 'photo' | 'recent';

export default function Food() {
    const [showModal, setShowModal] = useState(false);
    const [activeTab, setActiveTab] = useState<Tab>('search');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<FoodSearchResult[]>([]);
    const [recentItems, setRecentItems] = useState<FoodSearchResult[]>([]);
    const [selectedFood, setSelectedFood] = useState<FoodSearchResult | null>(null);
    const [mealType, setMealType] = useState<MealType>('lunch');
    const [weightG, setWeightG] = useState('100');
    const [isSearching, setIsSearching] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [aiResult, setAiResult] = useState<any>(null);
    const searchTimeout = useRef<number>();
    const { entries, totals, goal, addEntry, fetchDayLog, deleteEntry } = useFoodStore();
    const { triggerXpPopup, fetchProfile } = useGamificationStore();
    const { haptic } = useTelegram();

    useEffect(() => {
        fetchDayLog();
    }, []);

    // Debounced search
    useEffect(() => {
        if (searchQuery.length < 2) {
            setSearchResults([]);
            return;
        }
        clearTimeout(searchTimeout.current);
        searchTimeout.current = window.setTimeout(async () => {
            setIsSearching(true);
            try {
                const results = await foodApi.search(searchQuery);
                setSearchResults(results);
            } catch { }
            setIsSearching(false);
        }, 300);
        return () => clearTimeout(searchTimeout.current);
    }, [searchQuery]);

    const loadRecent = async () => {
        try {
            const items = await foodApi.getRecent();
            setRecentItems(items);
        } catch { }
    };

    const handleSelectFood = (food: FoodSearchResult) => {
        setSelectedFood(food);
        setWeightG(String(food.weight_g || 100));
        haptic.selection();
    };

    const handleAddFood = async () => {
        if (!selectedFood) return;
        const w = +weightG || 100;
        const multiplier = w / 100;

        try {
            const result = await addEntry({
                food_name: selectedFood.name,
                calories: Math.round(selectedFood.calories * multiplier),
                protein_g: Math.round(selectedFood.protein * multiplier * 10) / 10,
                fat_g: Math.round(selectedFood.fat * multiplier * 10) / 10,
                carbs_g: Math.round(selectedFood.carbs * multiplier * 10) / 10,
                weight_g: w,
                meal_type: mealType,
                source: 'search',
            } as Partial<FoodEntry>);

            haptic.notification('success');
            triggerXpPopup(result.xp_awarded);
            fetchProfile();
            setSelectedFood(null);
            setShowModal(false);
            setSearchQuery('');
        } catch (err) {
            haptic.notification('error');
        }
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsAnalyzing(true);
        try {
            const result = await foodApi.analyzePhoto(file);
            setAiResult(result);
            setSelectedFood({
                name: result.dish_name,
                calories: result.calories_per_100g,
                protein: result.protein_g_per_100g,
                fat: result.fat_g_per_100g,
                carbs: result.carbs_g_per_100g,
            });
            setWeightG(String(result.estimated_weight_g));
        } catch {
            haptic.notification('error');
        }
        setIsAnalyzing(false);
    };

    const handleDeleteEntry = async (id: string) => {
        haptic.impact('medium');
        await deleteEntry(id);
    };

    const WEIGHT_PRESETS = [50, 100, 150, 200];

    return (
        <div className="px-4 pt-4 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold">Питание</h1>
                <button
                    onClick={() => {
                        setShowModal(true);
                        haptic.impact('medium');
                    }}
                    className="btn-primary py-2 px-4 flex items-center gap-1 text-sm"
                >
                    <Plus size={16} />
                    Добавить
                </button>
            </div>

            {/* Day summary */}
            <div className="glass-card p-4">
                <div className="grid grid-cols-4 gap-2 text-center">
                    <div>
                        <div className="text-lg font-bold">{Math.round(totals.calories)}</div>
                        <div className="text-[10px] text-tg-hint">ккал</div>
                    </div>
                    <div>
                        <div className="text-lg font-bold text-blue-400">{Math.round(totals.protein_g)}</div>
                        <div className="text-[10px] text-tg-hint">Белки</div>
                    </div>
                    <div>
                        <div className="text-lg font-bold text-yellow-400">{Math.round(totals.fat_g)}</div>
                        <div className="text-[10px] text-tg-hint">Жиры</div>
                    </div>
                    <div>
                        <div className="text-lg font-bold text-green-400">{Math.round(totals.carbs_g)}</div>
                        <div className="text-[10px] text-tg-hint">Углеводы</div>
                    </div>
                </div>
            </div>

            {/* Food entries list */}
            {entries.length === 0 ? (
                <div className="glass-card p-8 text-center">
                    <div className="text-4xl mb-3">🍽️</div>
                    <p className="text-tg-hint">Пока нет записей за сегодня</p>
                    <p className="text-xs text-tg-hint mt-1">Добавьте первый приём пищи</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {entries.map((entry) => (
                        <div key={entry.id} className="glass-card p-3 flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                <span className="text-lg">{MEAL_ICONS[entry.meal_type]}</span>
                                <div className="min-w-0">
                                    <div className="font-medium text-sm truncate">{entry.food_name}</div>
                                    <div className="text-xs text-tg-hint">
                                        {entry.weight_g}г · Б {Math.round(entry.protein_g)} · Ж {Math.round(entry.fat_g)} · У{' '}
                                        {Math.round(entry.carbs_g)}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 ml-2">
                                <span className="text-sm font-medium">{Math.round(entry.calories)}</span>
                                <button
                                    onClick={() => handleDeleteEntry(entry.id)}
                                    className="text-tg-hint hover:text-accent-500 p-1"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add Food Modal */}
            {showModal && (
                <>
                    <div className="bottom-sheet-overlay" onClick={() => setShowModal(false)} />
                    <div className="bottom-sheet-content">
                        <div className="bottom-sheet-handle" />
                        <div className="px-4 pb-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-bold">Добавить еду</h2>
                                <button onClick={() => setShowModal(false)} className="p-1 text-tg-hint">
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Tabs */}
                            <div className="flex rounded-xl bg-white/5 p-1 mb-4">
                                {(
                                    [
                                        { id: 'search', icon: Search, label: 'Поиск' },
                                        { id: 'photo', icon: Camera, label: 'Фото' },
                                        { id: 'recent', icon: Clock, label: 'Недавние' },
                                    ] as const
                                ).map(({ id, icon: Icon, label }) => (
                                    <button
                                        key={id}
                                        onClick={() => {
                                            setActiveTab(id);
                                            if (id === 'recent') loadRecent();
                                        }}
                                        className={`flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1 transition-all ${activeTab === id ? 'bg-primary-500 text-white' : 'text-tg-hint'
                                            }`}
                                    >
                                        <Icon size={14} />
                                        {label}
                                    </button>
                                ))}
                            </div>

                            {/* Search tab */}
                            {activeTab === 'search' && !selectedFood && (
                                <div>
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Найти продукт..."
                                        className="input-field mb-3"
                                        autoFocus
                                    />
                                    {isSearching && <p className="text-sm text-tg-hint text-center py-4">Поиск...</p>}
                                    <div className="max-h-60 overflow-y-auto space-y-1">
                                        {searchResults.map((item, i) => (
                                            <button
                                                key={i}
                                                onClick={() => handleSelectFood(item)}
                                                className="w-full text-left p-3 rounded-xl hover:bg-white/5 transition-colors flex items-center justify-between"
                                            >
                                                <div>
                                                    <div className="font-medium text-sm">{item.name}</div>
                                                    <div className="text-xs text-tg-hint">
                                                        {item.calories} ккал · Б {item.protein} · Ж {item.fat} · У {item.carbs}
                                                    </div>
                                                </div>
                                                <ChevronRight size={16} className="text-tg-hint" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Photo tab */}
                            {activeTab === 'photo' && !selectedFood && (
                                <div className="text-center py-8">
                                    {isAnalyzing ? (
                                        <div>
                                            <div className="text-4xl mb-3 animate-pulse">🤖</div>
                                            <p className="text-tg-hint">ИИ анализирует фото...</p>
                                        </div>
                                    ) : (
                                        <label className="cursor-pointer">
                                            <div className="glass-card p-8 hover:bg-white/10 transition-colors">
                                                <Camera size={48} className="text-primary-400 mx-auto mb-3" />
                                                <p className="font-medium">Сфотографируйте еду</p>
                                                <p className="text-xs text-tg-hint mt-1">ИИ определит КБЖУ автоматически</p>
                                            </div>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                capture="environment"
                                                onChange={handlePhotoUpload}
                                                className="hidden"
                                            />
                                        </label>
                                    )}
                                </div>
                            )}

                            {/* Recent tab */}
                            {activeTab === 'recent' && !selectedFood && (
                                <div className="max-h-60 overflow-y-auto space-y-1">
                                    {recentItems.length === 0 ? (
                                        <p className="text-sm text-tg-hint text-center py-8">Нет недавних продуктов</p>
                                    ) : (
                                        recentItems.map((item, i) => (
                                            <button
                                                key={i}
                                                onClick={() => handleSelectFood(item)}
                                                className="w-full text-left p-3 rounded-xl hover:bg-white/5 transition-colors flex items-center justify-between"
                                            >
                                                <div>
                                                    <div className="font-medium text-sm">{item.name}</div>
                                                    <div className="text-xs text-tg-hint">{item.calories} ккал / 100г</div>
                                                </div>
                                                <ChevronRight size={16} className="text-tg-hint" />
                                            </button>
                                        ))
                                    )}
                                </div>
                            )}

                            {/* Selected food confirmation */}
                            {selectedFood && (
                                <div className="animate-fade-in">
                                    {aiResult && aiResult.confidence < 0.6 && (
                                        <div className="bg-warning-500/10 border border-warning-500/20 rounded-xl p-3 mb-3 text-sm">
                                            ⚠️ ИИ не уверен в распознавании. Проверьте данные.
                                        </div>
                                    )}

                                    <div className="glass-card p-4 mb-4">
                                        <h3 className="font-bold text-lg mb-3">{selectedFood.name}</h3>
                                        <div className="grid grid-cols-4 gap-2 text-center text-sm">
                                            <div>
                                                <div className="font-bold">{selectedFood.calories}</div>
                                                <div className="text-[10px] text-tg-hint">ккал/100г</div>
                                            </div>
                                            <div>
                                                <div className="font-bold text-blue-400">{selectedFood.protein}</div>
                                                <div className="text-[10px] text-tg-hint">Белки</div>
                                            </div>
                                            <div>
                                                <div className="font-bold text-yellow-400">{selectedFood.fat}</div>
                                                <div className="text-[10px] text-tg-hint">Жиры</div>
                                            </div>
                                            <div>
                                                <div className="font-bold text-green-400">{selectedFood.carbs}</div>
                                                <div className="text-[10px] text-tg-hint">Углеводы</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Weight input */}
                                    <div className="mb-4">
                                        <label className="text-sm text-tg-hint mb-2 block">Вес порции (г)</label>
                                        <input
                                            type="number"
                                            value={weightG}
                                            onChange={(e) => setWeightG(e.target.value)}
                                            className="input-field mb-2"
                                        />
                                        <div className="flex gap-2">
                                            {WEIGHT_PRESETS.map((w) => (
                                                <button
                                                    key={w}
                                                    onClick={() => setWeightG(String(w))}
                                                    className={`flex-1 py-1.5 rounded-lg text-sm transition-all ${weightG === String(w) ? 'bg-primary-500 text-white' : 'bg-white/5 text-tg-hint'
                                                        }`}
                                                >
                                                    {w}г
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Meal type */}
                                    <div className="mb-4">
                                        <label className="text-sm text-tg-hint mb-2 block">Приём пищи</label>
                                        <div className="grid grid-cols-4 gap-2">
                                            {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map((mt) => (
                                                <button
                                                    key={mt}
                                                    onClick={() => setMealType(mt)}
                                                    className={`py-2 rounded-xl text-xs font-medium transition-all ${mealType === mt ? 'bg-primary-500 text-white' : 'bg-white/5 text-tg-hint'
                                                        }`}
                                                >
                                                    {MEAL_ICONS[mt]} {MEAL_LABELS[mt]}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Total */}
                                    <div className="glass-card p-3 mb-4 text-center">
                                        <span className="text-tg-hint text-sm">Итого: </span>
                                        <span className="font-bold text-lg">
                                            {Math.round(selectedFood.calories * (+weightG || 100) / 100)} ккал
                                        </span>
                                    </div>

                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setSelectedFood(null)}
                                            className="btn-secondary flex-1"
                                        >
                                            Назад
                                        </button>
                                        <button onClick={handleAddFood} className="btn-primary flex-1">
                                            Добавить
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
