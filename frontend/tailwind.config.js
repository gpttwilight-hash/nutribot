/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                primary: {
                    50: '#eef6ff',
                    100: '#d9eaff',
                    200: '#bcdbff',
                    300: '#8ec5ff',
                    400: '#58a5ff',
                    500: '#3282ff',
                    600: '#1a62f5',
                    700: '#134de1',
                    800: '#1640b6',
                    900: '#18398f',
                },
                accent: {
                    50: '#fff1f0',
                    100: '#ffe0de',
                    200: '#ffc7c3',
                    300: '#ffa09a',
                    400: '#ff6b61',
                    500: '#ff3d30',
                    600: '#ed2014',
                    700: '#c8160b',
                    800: '#a5160e',
                    900: '#881913',
                },
                success: {
                    400: '#4ade80',
                    500: '#22c55e',
                    600: '#16a34a',
                },
                warning: {
                    400: '#facc15',
                    500: '#eab308',
                    600: '#ca8a04',
                },
                tg: {
                    bg: 'var(--tg-theme-bg-color, #1a1a2e)',
                    'secondary-bg': 'var(--tg-theme-secondary-bg-color, #16213e)',
                    text: 'var(--tg-theme-text-color, #eaeaea)',
                    hint: 'var(--tg-theme-hint-color, #8b8b8b)',
                    link: 'var(--tg-theme-link-color, #58a5ff)',
                    button: 'var(--tg-theme-button-color, #3282ff)',
                    'button-text': 'var(--tg-theme-button-text-color, #ffffff)',
                },
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
            },
            animation: {
                'xp-popup': 'xpPopup 1.5s ease-out forwards',
                'pulse-fire': 'pulseFire 1.2s ease-in-out infinite',
                'confetti': 'confetti 3s ease-out forwards',
                'slide-up': 'slideUp 0.3s ease-out',
                'fade-in': 'fadeIn 0.3s ease-out',
                'progress-fill': 'progressFill 0.6s ease-out forwards',
                'bounce-in': 'bounceIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
            },
            keyframes: {
                xpPopup: {
                    '0%': { opacity: 1, transform: 'translateY(0) scale(1)' },
                    '70%': { opacity: 1, transform: 'translateY(-40px) scale(1.2)' },
                    '100%': { opacity: 0, transform: 'translateY(-60px) scale(0.8)' },
                },
                pulseFire: {
                    '0%, 100%': { transform: 'scale(1)' },
                    '50%': { transform: 'scale(1.2)' },
                },
                confetti: {
                    '0%': { opacity: 1 },
                    '100%': { opacity: 0 },
                },
                slideUp: {
                    '0%': { transform: 'translateY(100%)', opacity: 0 },
                    '100%': { transform: 'translateY(0)', opacity: 1 },
                },
                fadeIn: {
                    '0%': { opacity: 0 },
                    '100%': { opacity: 1 },
                },
                progressFill: {
                    '0%': { width: '0%' },
                },
                bounceIn: {
                    '0%': { transform: 'scale(0)', opacity: 0 },
                    '100%': { transform: 'scale(1)', opacity: 1 },
                },
            },
        },
    },
    plugins: [],
}
