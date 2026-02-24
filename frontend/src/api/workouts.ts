import client from './client';
import type { Workout, WorkoutStats } from '../types';

export const workoutsApi = {
    getMonth: async (month: string) => {
        const { data } = await client.get<{ workouts: Workout[] }>('/workouts', {
            params: { month },
        });
        return data.workouts;
    },

    create: async (workout: { workout_date: string; completed: boolean; notes?: string }) => {
        const { data } = await client.post<{
            workout: Workout;
            xp_awarded: number;
        }>('/workouts', workout);
        return data;
    },

    update: async (id: string, update: { completed?: boolean; notes?: string }) => {
        const { data } = await client.put(`/workouts/${id}`, update);
        return data;
    },

    getStats: async () => {
        const { data } = await client.get<WorkoutStats>('/workouts/stats');
        return data;
    },
};
