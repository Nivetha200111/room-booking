/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        phantom: {
          DEFAULT: 'rgb(var(--color-phantom) / <alpha-value>)',
          95: 'rgb(var(--color-phantom-95) / <alpha-value>)',
          90: 'rgb(var(--color-phantom-90) / <alpha-value>)',
          80: 'rgb(var(--color-phantom-80) / <alpha-value>)',
          60: 'rgb(var(--color-phantom-60) / <alpha-value>)',
          40: 'rgb(var(--color-phantom-40) / <alpha-value>)',
          20: 'rgb(var(--color-phantom-20) / <alpha-value>)',
        },
        polar: 'rgb(var(--color-polar) / <alpha-value>)',
        panel: 'rgb(var(--color-panel) / <alpha-value>)',
        keen: {
          DEFAULT: 'rgb(var(--color-keen) / <alpha-value>)',
          dark: 'rgb(var(--color-keen-dark) / <alpha-value>)',
          light: 'rgb(var(--color-keen-light) / <alpha-value>)',
        },
        codeblue: {
          DEFAULT: 'rgb(var(--color-codeblue) / <alpha-value>)',
          dark: 'rgb(var(--color-codeblue-dark) / <alpha-value>)',
        },
        ksslate: 'rgb(var(--color-ksslate) / <alpha-value>)',
        warning: 'rgb(var(--color-warning) / <alpha-value>)',
        danger: 'rgb(var(--color-danger) / <alpha-value>)',
        line: 'rgb(var(--color-line) / var(--opacity-line))',
        'line-strong': 'rgb(var(--color-line-strong) / var(--opacity-line-strong))',
      },
      fontFamily: {
        display: ['Sora', 'system-ui', 'sans-serif'],
        sans: ['"Open Sans"', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      borderRadius: {
        card: '16px',
      },
      boxShadow: {
        'ks-sm': '0 2px 8px rgba(0,0,0,0.25)',
        'ks-md': '0 8px 24px rgba(0,0,0,0.30)',
        'ks-lg': '0 20px 48px rgba(0,0,0,0.40)',
      },
      transitionTimingFunction: {
        ks: 'cubic-bezier(0.22,0.61,0.36,1)',
      },
    },
  },
  plugins: [],
}
