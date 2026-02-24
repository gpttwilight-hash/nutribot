import { create } from 'zustand';
import type { User } from '../types';
import client from '../api/client';

interface UserState {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    isOnboarded: boolean;

    setUser: (user: User) => void;
    setToken: (token: string) => void;
    login: (initData: string) => Promise<void>;
    fetchMe: () => Promise<void>;
    logout: () => void;
    completeOnboarding: (data: {
        goal: string;
        gender: string;
        age: number;
        weight_kg: number;
        height_cm: number;
        target_weight_kg?: number;
        activity_level: string;
    }) => Promise<any>;
    updateProfile: (data: {
        goal: string;
        gender: string;
        age: number;
        weight_kg: number;
        height_cm: number;
        target_weight_kg?: number;
        activity_level: string;
    }) => Promise<any>;
}

export const useUserStore = create<UserState>((set, get) => ({
    user: null,
    token: localStorage.getItem('nutribot_token'),
    isLoading: false,
    isOnboarded: false,

    setUser: (user) => set({ user, isOnboarded: user.onboarding_completed > 0 }),

    setToken: (token) => {
        localStorage.setItem('nutribot_token', token);
        set({ token });
    },

    login: async (initData: string) => {
        set({ isLoading: true });
        try {
            const { data } = await client.post('/auth/telegram', { initData });
            const { access_token, user } = data;
            localStorage.setItem('nutribot_token', access_token);
            set({
                token: access_token,
                user,
                isOnboarded: user.onboarding_completed > 0,
                isLoading: false,
            });
        } catch (err) {
            set({ isLoading: false });
            throw err;
        }
    },

    fetchMe: async () => {
        set({ isLoading: true });
        try {
            const { data } = await client.get('/auth/me');
            set({
                user: data,
                isOnboarded: data.onboarding_completed > 0,
                isLoading: false,
            });
        } catch {
            set({ isLoading: false });
        }
    },

    logout: () => {
        localStorage.removeItem('nutribot_token');
        set({ user: null, token: null, isOnboarded: false });
    },

    completeOnboarding: async (data) => {
        const { data: result } = await client.post('/auth/onboarding', data);
        await get().fetchMe();
        return result;
    },

    updateProfile: async (data) => {
        const { data: result } = await client.put('/auth/profile', data);
        await get().fetchMe();
        return result;
    },
}));
