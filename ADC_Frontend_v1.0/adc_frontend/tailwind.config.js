export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: { 900: '#1F3864', 700: '#2E75B6', 500: '#5B9BD5', 100: '#DBEAFE' },
        success: { DEFAULT: '#1D9E75', light: '#EAF3DE', text: '#3B6D11' },
        warning: { DEFAULT: '#BA7517', light: '#FAEEDA', text: '#854F0B' },
        danger:  { DEFAULT: '#E24B4A', light: '#FCEBEB', text: '#A32D2D' },
      },
      fontFamily: { sans: ['Inter', 'Arial', 'sans-serif'] }
    }
  },
  plugins: []
}
