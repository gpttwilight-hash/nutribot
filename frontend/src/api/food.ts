import client from './client';
import type { FoodEntry, Macros, FoodSearchResult, AIAnalysisResult, DayStats } from '../types';

export const foodApi = {
    getLog: async (date: string) => {
        const { data } = await client.get<{
            entries: FoodEntry[];
            totals: Macros;
            goal: Macros;
        }>('/food/log', { params: { date } });
        return data;
    },

    addEntry: async (entry: Partial<FoodEntry>) => {
        const { data } = await client.post<{
            entry: FoodEntry;
            xp_awarded: number;
            level_up: boolean;
            streak: { streak_days: number; streak_updated: boolean };
            all_meals_bonus: { xp_awarded: number } | null;
        }>('/food/log', entry);
        return data;
    },

    updateEntry: async (id: string, update: Partial<FoodEntry>) => {
        const { data } = await client.put(`/food/log/${id}`, update);
        return data;
    },

    deleteEntry: async (id: string) => {
        const { data } = await client.delete(`/food/log/${id}`);
        return data;
    },

    analyzePhoto: async (file: File) => {
        const formData = new FormData();
        formData.append('photo', file);
        const { data } = await client.post<AIAnalysisResult>('/food/analyze-photo', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 30000,
        });
        return data;
    },

    search: async (query: string, limit = 20) => {
        const { data } = await client.get<{ results: FoodSearchResult[] }>('/food/search', {
            params: { q: query, limit },
        });
        return data.results;
    },

    getRecent: async () => {
        const { data } = await client.get<{ items: FoodSearchResult[] }>('/food/recent');
        return data.items;
    },

    getStats: async (period: '7d' | '30d' = '7d') => {
        const { data } = await client.get<{
            daily: DayStats[];
            average: Macros;
        }>('/food/stats', { params: { period } });
        return data;
    },
};
