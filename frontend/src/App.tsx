import { useState, useEffect } from 'react';
import { Home, UtensilsCrossed, Dumbbell, User } from 'lucide-react';
import { useTelegram } from './hooks/useTelegram';
import { useUserStore } from './store/userStore';
import { useGamificationStore } from './store/gamificationStore';
import Dashboard from './pages/Dashboard';
import Food from './pages/Food';
import Workouts from './pages/Workouts';
import Profile from './pages/Profile';
import Onboarding from './pages/Onboarding';
import XPPopup from './components/gamification/XPPopup';
import LevelUpCelebration from './components/gamification/LevelUpCelebration';
import AchievementToast from './components/gamification/AchievementToast';

const TABS = [
    { id: 'dashboard', label: 'Главная', icon: Home },
    { id: 'food', label: 'Питание', icon: UtensilsCrossed },
    { id: 'workouts', label: 'Тренировки', icon: Dumbbell },
    { id: 'profile', label: 'Профиль', icon: User },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function App() {
    const [activeTab, setActiveTab] = useState<TabId>('dashboard');
    const { ready, expand, isInTelegram, initData } = useTelegram();
    const { user, isOnboarded, login, fetchMe, token } = useUserStore();
    const { showXpPopup, showLevelUp, showAchievement, dismissXpPopup, dismissLevelUp, dismissAchievement } =
        useGamificationStore();

    useEffect(() => {
        ready();
        expand();

        // Auth flow
        if (isInTelegram && initData) {
            login(initData).catch(console.error);
        } else if (token) {
            fetchMe().catch(console.error);
        }
    }, []);

    // Show onboarding for new users
    if (user && !isOnboarded) {
        return <Onboarding />;
    }

    // Demo mode: if not in Telegram and no token, show the app with mock data
    const currentPage = (() => {
        switch (activeTab) {
            case 'dashboard':
                return <Dashboard />;
            case 'food':
                return <Food />;
            case 'workouts':
                return <Workouts />;
            case 'profile':
                return <Profile />;
        }
    })();

    return (
        <div className="min-h-screen bg-tg-bg text-tg-text">
            {/* Main Content */}
            <main className="pb-20">{currentPage}</main>

            {/* Bottom Tab Bar */}
            <nav className="fixed bottom-0 left-0 right-0 z-30 bg-tg-secondary-bg/95 backdrop-blur-lg border-t border-white/5">
                <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
                    {TABS.map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            onClick={() => setActiveTab(id)}
                            className={`flex flex-col items-center gap-0.5 py-1 px-3 transition-all duration-200 ${activeTab === id
                                    ? 'text-tg-button scale-105'
                                    : 'text-tg-hint hover:text-tg-text'
                                }`}
                        >
                            <Icon size={22} strokeWidth={activeTab === id ? 2.5 : 1.8} />
                            <span className="text-[10px] font-medium">{label}</span>
                        </button>
                    ))}
                </div>
            </nav>

            {/* Global Gamification Overlays */}
            {showXpPopup && <XPPopup amount={showXpPopup.amount} onDone={dismissXpPopup} />}
            {showLevelUp && <LevelUpCelebration onDone={dismissLevelUp} />}
            {showAchievement && (
                <AchievementToast achievement={showAchievement} onDone={dismissAchievement} />
            )}
        </div>
    );
}
