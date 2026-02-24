import { useEffect } from 'react';
import type { Achievement } from '../../types';

interface Props {
    achievement: Achievement;
    onDone: () => void;
}

export default function AchievementToast({ achievement, onDone }: Props) {
    useEffect(() => {
        const t = setTimeout(onDone, 3000);
        return () => clearTimeout(t);
    }, []);

    return (
        <div className="fixed bottom-24 left-4 right-4 z-50 pointer-events-none">
            <div className="animate-slide-up glass-card p-4 flex items-center gap-4 border border-primary-500/20 shadow-xl">
                <div className="text-4xl flex-shrink-0">{achievement.icon}</div>
                <div>
                    <div className="text-xs text-primary-400 font-semibold mb-0.5">🏆 Достижение разблокировано!</div>
                    <div className="font-bold text-sm">{achievement.name}</div>
                    <div className="text-xs text-tg-hint">{achievement.description}</div>
                </div>
            </div>
        </div>
    );
}
