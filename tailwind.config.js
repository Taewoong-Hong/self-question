/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#39FF14',
        secondary: '#2ECC0B',
        success: '#10B981',
        danger: '#EF4444',
        warning: '#F59E0B',
        info: '#3B82F6',
        // Surbate brand colors - 형광초록 기반
        surbate: '#39FF14',
        brand: {
          50: '#f0ffe6',
          100: '#d6ffcc',
          200: '#b3ff99',
          300: '#8cff66',
          400: '#5cff2e',
          500: '#39FF14', // 메인 브랜드 컬러
          600: '#2ed10f',
          700: '#25a30c',
          800: '#1d7a09',
          900: '#155706',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}