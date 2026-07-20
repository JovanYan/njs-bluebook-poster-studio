/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bluebook: '#2B52D6',
        hotpink: '#F2509E',
        marker: '#FFE600',
        inkblack: '#141414',
        paper: '#FDFDF8',
      },
      fontFamily: {
        pixel: ['"Press Start 2P"', 'monospace'],
        readout: ['VT323', 'monospace'],
        hand: ['Caveat', 'cursive'],
      },
    },
  },
  plugins: [],
}
