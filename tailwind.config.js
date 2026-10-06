/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // 全部颜色走 CSS 变量，方便多主题切换
        bg: 'hsl(var(--c-bg) / <alpha-value>)',
        surface: 'hsl(var(--c-surface) / <alpha-value>)',
        card: 'hsl(var(--c-card) / <alpha-value>)',
        ink: 'hsl(var(--c-ink) / <alpha-value>)',
        sub: 'hsl(var(--c-sub) / <alpha-value>)',
        faint: 'hsl(var(--c-faint) / <alpha-value>)',
        line: 'hsl(var(--c-line) / <alpha-value>)',
        primary: {
          DEFAULT: 'hsl(var(--c-primary) / <alpha-value>)',
          soft: 'hsl(var(--c-primary-soft) / <alpha-value>)',
          contrast: 'hsl(var(--c-primary-contrast) / <alpha-value>)',
        },
        money: 'hsl(var(--c-money) / <alpha-value>)',
        success: 'hsl(var(--c-success) / <alpha-value>)',
        warning: 'hsl(var(--c-warning) / <alpha-value>)',
        danger: 'hsl(var(--c-danger) / <alpha-value>)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        soft: '0 8px 30px -12px hsl(var(--c-shadow) / 0.25)',
        glow: '0 12px 40px -10px hsl(var(--c-primary) / 0.45)',
        card: '0 2px 16px -4px hsl(var(--c-shadow) / 0.12), 0 1px 3px hsl(var(--c-shadow) / 0.06)',
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"PingFang SC"',
          '"Hiragino Sans GB"',
          '"Microsoft YaHei"',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
        num: [
          '"SF Pro Display"',
          '-apple-system',
          'BlinkMacSystemFont',
          '"PingFang SC"',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'pop-in': {
          '0%': { opacity: '0', transform: 'scale(0.85)' },
          '60%': { transform: 'scale(1.04)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'toast-in': {
          '0%': { opacity: '0', transform: 'translateY(-12px) scale(0.96)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(200%)' },
        },
        'coin-fall': {
          '0%': { opacity: '0', transform: 'translateY(-20vh) rotate(0deg) scale(0.6)' },
          '10%': { opacity: '1' },
          '90%': { opacity: '1' },
          '100%': { opacity: '0', transform: 'translateY(110vh) rotate(720deg) scale(1)' },
        },
        'pulse-ring': {
          '0%': { boxShadow: '0 0 0 0 hsl(var(--c-primary) / 0.35)' },
          '70%': { boxShadow: '0 0 0 18px hsl(var(--c-primary) / 0)' },
          '100%': { boxShadow: '0 0 0 0 hsl(var(--c-primary) / 0)' },
        },
        'gradient-pan': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) both',
        float: 'float 4s ease-in-out infinite',
        'pop-in': 'pop-in 0.45s cubic-bezier(0.22, 1, 0.36, 1) both',
        'toast-in': 'toast-in 0.35s cubic-bezier(0.22, 1, 0.36, 1) both',
        shimmer: 'shimmer 2.2s ease-in-out infinite',
        'pulse-ring': 'pulse-ring 2s ease-out infinite',
        'gradient-pan': 'gradient-pan 8s ease infinite',
      },
    },
  },
  plugins: [],
}
