import { create } from 'zustand';
import type { FoodEntry, Macros } from '../types';
import { foodApi } from '../api/food';

interface FoodState {
    entries: FoodEntry[];
    totals: Macros;
    goal: Macros;
    isLoading: boolean;
    selectedDate: string;

    setSelectedDate: (date: string) => void;
    fetchDayLog: (date?: string) => Promise<void>;
    addEntry: (entry: Partial<FoodEntry>) => Promise<any>;
    deleteEntry: (id: string) => Promise<void>;
}

const today = () => new Date().toISOString().split('T')[0];

export const useFoodStore = create<FoodState>((set, get) => ({
    entries: [],
    totals: { calories: 0, protein_g: 0, fat_g: 0, carbs_g: 0 },
    goal: { calories: 2000, protein_g: 150, fat_g: 65, carbs_g: 250 },
    isLoading: false,
    selectedDate: today(),

    setSelectedDate: (date) => {
        set({ selectedDate: date });
        get().fetchDayLog(date);
    },

    fetchDayLog: async (date) => {
        set({ isLoading: true });
        try {
            const data = await foodApi.getLog(date || get().selectedDate);
            set({
                entries: data.entries,
                totals: data.totals,
                goal: data.goal,
                isLoading: false,
            });
        } catch {
            set({ isLoading: false });
        }
    },

    addEntry: async (entry) => {
        try {
            const result = await foodApi.addEntry(entry);
            await get().fetchDayLog();
            return result;
        } catch (err) {
            throw err;
        }
    },

    deleteEntry: async (id) => {
        try {
            await foodApi.deleteEntry(id);
            set((state) => ({
                entries: state.entries.filter((e) => e.id !== id),
            }));
            await get().fetchDayLog();
        } catch (err) {
            throw err;
        }
    },
}));
