/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        phantom: {
          DEFAULT: '#112245',
          95: '#152a52',
          90: '#1a2d56',
          80: '#2b3d65',
          60: '#5b6a8a',
          40: '#8c98b0',
          20: '#bdc4d2',
        },
        polar: '#ecf2f7',
        keen: { DEFAULT: '#20c9a0', dark: '#1aa786', light: '#b4ebda' },
        codeblue: { DEFAULT: '#153ca8', dark: '#0f2e85' },
        ksslate: '#d9dee2',
        warning: '#e8a838',
        danger: '#d8453e',
        line: 'rgba(236,242,247,0.10)',
        'line-strong': 'rgba(236,242,247,0.18)',
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
