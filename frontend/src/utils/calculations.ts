/**
 * Utility functions: Mifflin-St Jeor formula, macro calculation, XP levels.
 */

export function calculateBMR(gender: string, weight: number, height: number, age: number): number {
    if (gender === 'male') {
        return 10 * weight + 6.25 * height - 5 * age + 5;
    }
    return 10 * weight + 6.25 * height - 5 * age - 161;
}

const ACTIVITY_MULTIPLIERS: Record<string, number> = {
    sedentary: 1.2,
    moderate: 1.375,
    active: 1.55,
    athlete: 1.725,
};

const GOAL_ADJUSTMENTS: Record<string, number> = {
    cut: 0.8,
    maintain: 1.0,
    bulk: 1.15,
};

export function calculateDailyNorms(
    gender: string,
    weight: number,
    height: number,
    age: number,
    activityLevel: string,
    goal: string
) {
    const bmr = calculateBMR(gender, weight, height, age);
    const tdee = bmr * (ACTIVITY_MULTIPLIERS[activityLevel] || 1.2);
    const dailyCalories = Math.round(tdee * (GOAL_ADJUSTMENTS[goal] || 1.0));
    const dailyProtein = Math.round(weight * 2.0);
    const dailyFat = Math.round((dailyCalories * 0.25) / 9);
    const dailyCarbs = Math.round((dailyCalories - dailyProtein * 4 - dailyFat * 9) / 4);

    return {
        calories: dailyCalories,
        protein_g: dailyProtein,
        fat_g: dailyFat,
        carbs_g: Math.max(0, dailyCarbs),
    };
}

export function xpForLevel(level: number): number {
    return 500 * Math.pow(2, level - 1);
}

export function formatNumber(num: number): string {
    return num.toLocaleString('ru-RU');
}

export function getPercentage(current: number, target: number): number {
    if (target === 0) return 0;
    return Math.min(Math.round((current / target) * 100), 999);
}

export function getProgressColor(percentage: number): string {
    if (percentage > 100) return 'bg-accent-500';
    if (percentage > 90) return 'bg-warning-500';
    return 'bg-success-500';
}

export function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

export function isToday(dateStr: string): boolean {
    const today = new Date().toISOString().split('T')[0];
    return dateStr === today;
}
