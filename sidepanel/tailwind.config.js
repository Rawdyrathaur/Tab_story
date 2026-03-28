/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: {
          base: '#0E0E10',
          elevated: '#1A1A24',
          sidebar: '#13131A',
          popup: '#1E1E2A',
        },
        accent: {
          purple: '#7C6FFF',
          green: '#50C878',
          'green-light': '#5DDFB0',
          'green-dark': '#2A6F4F',
          blue: '#5B9CF6',
          amber: '#D4A832',
        },
        text: {
          primary: '#FFFFFF',
          secondary: '#A0A0B0',
          muted: '#505060',
          placeholder: '#606070',
        },
        border: {
          subtle: 'rgba(255,255,255,0.06)',
          default: 'rgba(255,255,255,0.10)',
          focus: 'rgba(124,111,255,0.5)',
        },
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '14px',
        pill: '999px',
      },
      boxShadow: {
        card: '0 4px 16px rgba(0,0,0,0.4)',
        popup: '0 16px 48px rgba(0,0,0,0.6)',
        subtle: 'inset 0 1px 0 rgba(255,255,255,0.04)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
  ],
}
