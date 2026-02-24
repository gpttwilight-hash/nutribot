import { useEffect, useState } from 'react';
import { useGamificationStore } from '../../store/gamificationStore';

const COLORS = ['#ff3d30', '#3282ff', '#22c55e', '#eab308', '#a855f7', '#f97316'];

interface Piece {
    id: number;
    x: number;
    delay: number;
    color: string;
    size: number;
    rotate: number;
}

interface Props {
    onDone: () => void;
}

export default function LevelUpCelebration({ onDone }: Props) {
    const { level } = useGamificationStore();
    const [pieces] = useState<Piece[]>(() =>
        Array.from({ length: 40 }, (_, i) => ({
            id: i,
            x: Math.random() * 100,
            delay: Math.random() * 1.5,
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
            size: 8 + Math.random() * 12,
            rotate: Math.random() * 360,
        }))
    );

    useEffect(() => {
        const t = setTimeout(onDone, 3000);
        return () => clearTimeout(t);
    }, []);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            {/* Confetti */}
            <div className="confetti-container">
                {pieces.map(p => (
                    <div
                        key={p.id}
                        className="confetti-piece rounded-sm"
                        style={{
                            left: `${p.x}%`,
                            width: p.size,
                            height: p.size,
                            background: p.color,
                            animationDelay: `${p.delay}s`,
                            transform: `rotate(${p.rotate}deg)`,
                        }}
                    />
                ))}
            </div>

            {/* Level up card */}
            <div className="animate-bounce-in glass-card p-8 text-center mx-8 shadow-2xl border border-primary-500/30">
                <div className="text-5xl mb-3">🏆</div>
                <h2 className="text-2xl font-bold mb-1">Новый уровень!</h2>
                <div className="text-5xl font-black text-primary-400 my-3">{level}</div>
                <p className="text-tg-hint text-sm">Отличная работа! Продолжай в том же духе!</p>
            </div>
        </div>
    );
}
