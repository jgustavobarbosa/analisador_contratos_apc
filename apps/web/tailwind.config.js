/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ray: {
          bg: '#0A0D14', // Fundo ultra-escuro de alto contraste
          card: '#121824', // Superfície de cards e painéis
          border: '#1E293B', // Bordas sutis
          blue: '#2563EB', // Azul primário RAY.IA
          cyan: '#38BDF8', // Ciano de destaque IA
          neon: '#4ADE80', // Verde neon de conversão/economia
          alert: '#F43F5E', // Vermelho/rosa de glosa crítica e anomalias
          warning: '#F59E0B', // Amarelo âmbar para compliance ANS
        },
      },
      backgroundImage: {
        'ray-gradient':
          'linear-gradient(135deg, #1D4ED8 0%, #38BDF8 70%, #4ADE80 100%)',
        'ray-gradient-subtle':
          'linear-gradient(180deg, rgba(37,99,235,0.08) 0%, rgba(56,189,248,0.02) 100%)',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '"IBM Plex Sans"', 'Segoe UI', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', '"IBM Plex Sans"', 'Segoe UI', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
