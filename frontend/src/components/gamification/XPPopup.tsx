import { useEffect } from 'react';

interface Props {
    amount: number;
    onDone: () => void;
}

export default function XPPopup({ amount, onDone }: Props) {
    useEffect(() => {
        const t = setTimeout(onDone, 1500);
        return () => clearTimeout(t);
    }, []);

    return (
        <div className="fixed top-1/3 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
            <div className="animate-xp-popup text-primary-400 font-bold text-2xl drop-shadow-lg select-none">
                +{amount} XP ⭐
            </div>
        </div>
    );
}
