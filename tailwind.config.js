/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                bg: 'var(--color-bg)',
                surface: {
                    DEFAULT: 'var(--color-surface)',
                    hover: 'var(--color-surface-hover)',
                },
                border: 'var(--color-border)',
                nosotros: 'var(--color-nosotros)',
                ellos: 'var(--color-ellos)',
                accent: 'var(--color-accent)',
                danger: 'var(--color-danger)',
                success: 'var(--color-success)',
            },
            textColor: {
                primary: 'var(--color-text-primary)',
                secondary: 'var(--color-text-secondary)',
                muted: 'var(--color-text-muted)',
            },
            borderRadius: {
                lg: 'var(--radius-lg)',
                full: 'var(--radius-full)',
            },
            fontFamily: {
                sans: ['Outfit', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
            },
        },
    },
    plugins: [],
}
