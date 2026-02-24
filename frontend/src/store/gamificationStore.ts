import { create } from 'zustand';
import type { Achievement, GamificationProfile } from '../types';
import client from '../api/client';

interface GamificationState {
    level: number;
    xp: number;
    xpToNext: number;
    streakDays: number;
    maxStreak: number;
    achievements: Achievement[];
    showXpPopup: { amount: number; id: number } | null;
    showLevelUp: boolean;
    showAchievement: Achievement | null;
    dailyBonusClaimed: boolean;

    fetchProfile: () => Promise<void>;
    claimDailyBonus: () => Promise<void>;
    triggerXpPopup: (amount: number) => void;
    triggerLevelUp: () => void;
    triggerAchievement: (achievement: Achievement) => void;
    dismissXpPopup: () => void;
    dismissLevelUp: () => void;
    dismissAchievement: () => void;
}

export const useGamificationStore = create<GamificationState>((set) => ({
    level: 1,
    xp: 0,
    xpToNext: 500,
    streakDays: 0,
    maxStreak: 0,
    achievements: [],
    showXpPopup: null,
    showLevelUp: false,
    showAchievement: null,
    dailyBonusClaimed: false,

    fetchProfile: async () => {
        try {
            const { data } = await client.get<GamificationProfile>('/gamification/profile');
            set({
                level: data.level,
                xp: data.xp,
                xpToNext: data.xp_to_next,
                streakDays: data.streak_days,
                maxStreak: data.max_streak,
                achievements: data.achievements,
            });
        } catch { }
    },

    claimDailyBonus: async () => {
        try {
            const { data } = await client.post('/gamification/daily-bonus');
            if (!data.already_claimed) {
                set({ dailyBonusClaimed: true });
                set({ showXpPopup: { amount: 10, id: Date.now() } });
                if (data.level_up) {
                    setTimeout(() => set({ showLevelUp: true }), 1500);
                }
            } else {
                set({ dailyBonusClaimed: true });
            }
        } catch { }
    },

    triggerXpPopup: (amount) => {
        set({ showXpPopup: { amount, id: Date.now() } });
        setTimeout(() => set({ showXpPopup: null }), 1500);
    },

    triggerLevelUp: () => {
        set({ showLevelUp: true });
        setTimeout(() => set({ showLevelUp: false }), 3000);
    },

    triggerAchievement: (achievement) => {
        set({ showAchievement: achievement });
        setTimeout(() => set({ showAchievement: null }), 3000);
    },

    dismissXpPopup: () => set({ showXpPopup: null }),
    dismissLevelUp: () => set({ showLevelUp: false }),
    dismissAchievement: () => set({ showAchievement: null }),
}));
