import { useState } from 'react';
import { Sparkles, Check, ChevronLeft } from 'lucide-react';
import { useTelegram } from '../hooks/useTelegram';
import { subscriptionApi } from '../api/subscription';

interface Props {
    onBack: () => void;
}

export default function Paywall({ onBack }: Props) {
    const [isLoading, setIsLoading] = useState(false);
    const { tg, haptic, openInvoice } = useTelegram();

    const handleSubscribe = async () => {
        haptic.impact('heavy');
        setIsLoading(true);
        try {
            const { invoice_link } = await subscriptionApi.createInvoice();
            const status = await openInvoice(invoice_link);

            if (status === 'paid') {
                haptic.notification('success');
                tg?.showAlert('Оплата успешна! Спасибо за подписку.');
                onBack();
            } else if (status === 'failed') {
                haptic.notification('error');
                tg?.showAlert('Произошла ошибка при оплате.');
            } else {
                // cancelled
                haptic.selection();
            }
        } catch (err) {
            console.error('Payment error', err);
            haptic.notification('error');
            tg?.showAlert('Не удалось создать платеж. Попробуйте позже.');
        }
        setIsLoading(false);
    };

    const features = [
        'Безлимитный ИИ-анализ еды по фото',
        'Детальная статистика за любой период',
        'Календарь веса и расширенный трекинг',
        'Эксклюзивные Telegram-уведомления',
        'Приоритетная поддержка'
    ];

    return (
        <div className="fixed inset-0 z-50 bg-tg-bg px-4 py-6 overflow-y-auto animate-slide-up flex flex-col">
            <button
                onClick={() => { haptic.selection(); onBack(); }}
                className="self-start p-2 -ml-2 text-tg-hint hover:text-tg-text mb-4"
            >
                <ChevronLeft size={28} />
            </button>

            <div className="flex-1 flex flex-col items-center justify-center text-center max-w-sm mx-auto w-full">
                <div className="w-24 h-24 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-3xl flex items-center justify-center mb-6 shadow-2xl shadow-yellow-500/20 rotate-12">
                    <Sparkles className="text-white w-12 h-12" />
                </div>

                <h1 className="text-3xl font-black mb-2">NutriBot Premium</h1>
                <p className="text-tg-hint mb-8">Раскройте полный потенциал своего питания и тренировок</p>

                <div className="glass-card w-full p-6 text-left mb-8 space-y-4">
                    {features.map((feature, i) => (
                        <div key={i} className="flex items-start gap-3">
                            <div className="w-5 h-5 rounded-full bg-success-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <Check size={12} className="text-success-500" />
                            </div>
                            <span className="text-sm font-medium leading-tight">{feature}</span>
                        </div>
                    ))}
                </div>

                <div className="w-full mt-auto">
                    <div className="mb-4 text-center">
                        <span className="text-3xl font-bold flex items-center justify-center gap-2">
                            <span className="text-yellow-400">⭐️</span> 250
                        </span>
                        <span className="text-sm text-tg-hint">/ месяц (~500 руб)</span>
                    </div>

                    <button
                        onClick={handleSubscribe}
                        disabled={isLoading}
                        className="btn-primary w-full py-4 text-lg font-bold bg-gradient-to-r from-yellow-500 to-yellow-600 text-white shadow-lg shadow-yellow-500/25 border-none"
                    >
                        {isLoading ? 'Обработка...' : 'Оформить подписку'}
                    </button>

                    <p className="text-xs text-tg-hint mt-4 text-center px-4">
                        Оплата происходит безопасно через систему Telegram Stars. Отменить можно в любой момент.
                    </p>
                </div>
            </div>
        </div>
    );
}
