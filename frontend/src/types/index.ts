export interface User {
    id: string;
    tg_id: number;
    username: string;
    first_name: string;
    goal: 'cut' | 'bulk' | 'maintain';
    gender?: 'male' | 'female';
    age?: number;
    weight_kg?: number;
    height_cm?: number;
    target_weight_kg?: number;
    activity_level?: 'sedentary' | 'moderate' | 'active' | 'athlete';
    level: number;
    xp: number;
    xp_to_next_level: number;
    streak_days: number;
    max_streak_days?: number;
    daily_calories: number;
    daily_protein_g: number;
    daily_fat_g: number;
    daily_carbs_g: number;
    subscription_status: 'trial' | 'active' | 'expired' | 'cancelled';
    subscription_expires_at?: string;
    onboarding_completed: number;
}

export interface FoodEntry {
    id: string;
    food_name: string;
    calories: number;
    protein_g: number;
    fat_g: number;
    carbs_g: number;
    weight_g: number;
    meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    source: 'ai_photo' | 'manual' | 'search';
    logged_at: string;
}

export interface Macros {
    calories: number;
    protein_g: number;
    fat_g: number;
    carbs_g: number;
}

export interface FoodSearchResult {
    name: string;
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
    weight_g?: number;
    barcode?: string;
}

export interface AIAnalysisResult {
    dish_name: string;
    calories_per_100g: number;
    protein_g_per_100g: number;
    fat_g_per_100g: number;
    carbs_g_per_100g: number;
    estimated_weight_g: number;
    confidence: number;
}

export interface Workout {
    id: string;
    workout_date: string;
    completed: boolean;
    notes: string | null;
    xp_awarded?: number;
}

export interface WorkoutStats {
    last_7_days: number;
    last_30_days: number;
    best_streak: number;
}

export interface Achievement {
    code: string;
    name: string;
    description: string;
    icon: string;
    achieved_at: string | null;
    earned?: boolean;
}

export interface GamificationProfile {
    level: number;
    xp: number;
    xp_to_next: number;
    streak_days: number;
    max_streak: number;
    achievements: Achievement[];
}

export interface SubscriptionStatus {
    status: 'trial' | 'active' | 'expired';
    expires_at: string | null;
    days_left: number;
}

export interface WeightEntry {
    weight_kg: number;
    logged_date: string;
}

export interface DayStats {
    date: string;
    calories: number;
    protein_g: number;
    fat_g: number;
    carbs_g: number;
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export const MEAL_LABELS: Record<MealType, string> = {
    breakfast: 'Завтрак',
    lunch: 'Обед',
    dinner: 'Ужин',
    snack: 'Перекус',
};

export const MEAL_ICONS: Record<MealType, string> = {
    breakfast: '🌅',
    lunch: '☀️',
    dinner: '🌙',
    snack: '🍪',
};

export const GOAL_LABELS: Record<string, string> = {
    cut: 'Похудение',
    bulk: 'Набор массы',
    maintain: 'Поддержание',
};

export const ACTIVITY_LABELS: Record<string, string> = {
    sedentary: 'Малоподвижный',
    moderate: 'Умеренный',
    active: 'Активный',
    athlete: 'Спортсмен',
};
