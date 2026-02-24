/**
 * Custom hook for Telegram WebApp API integration.
 * Provides theme, haptic feedback, user data, and back button.
 */
export function useTelegram() {
    const tg = typeof window !== 'undefined' ? (window as any).Telegram?.WebApp : null;

    const themeParams = tg?.themeParams || {};
    const initData = tg?.initData || '';
    const user = tg?.initDataUnsafe?.user || null;

    const haptic = {
        impact: (style: 'light' | 'medium' | 'heavy' = 'medium') => {
            tg?.HapticFeedback?.impactOccurred(style);
        },
        notification: (type: 'success' | 'error' | 'warning' = 'success') => {
            tg?.HapticFeedback?.notificationOccurred(type);
        },
        selection: () => {
            tg?.HapticFeedback?.selectionChanged();
        },
    };

    const showBackButton = (callback: () => void) => {
        if (tg?.BackButton) {
            tg.BackButton.show();
            tg.BackButton.onClick(callback);
        }
    };

    const hideBackButton = () => {
        tg?.BackButton?.hide();
    };

    const expand = () => {
        tg?.expand();
    };

    const close = () => {
        tg?.close();
    };

    const openInvoice = (invoiceLink: string) => {
        return new Promise<string>((resolve) => {
            if (tg?.openInvoice) {
                tg.openInvoice(invoiceLink, (status: string) => {
                    resolve(status);
                });
            } else {
                resolve('failed');
            }
        });
    };

    const ready = () => {
        tg?.ready();
    };

    return {
        tg,
        themeParams,
        initData,
        user,
        haptic,
        showBackButton,
        hideBackButton,
        expand,
        close,
        openInvoice,
        ready,
        isInTelegram: !!tg?.initData,
    };
}
