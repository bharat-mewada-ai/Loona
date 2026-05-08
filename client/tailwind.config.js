/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './src/**/*.{js,ts,jsx,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg:       '#F5F3EE',
        bg2:      '#EDEAE3',
        bg3:      '#E4E1D8',
        card:     '#FFFFFF',
        card2:    '#F5F3EE',
        bdr:      '#DDD9CE',
        bdr2:     '#C8C4B7',
        txt:      '#18170F',
        txt2:     '#6B6860',
        txt3:     '#A8A69E',
        ogi:      '#C94030',
        ogibg:    '#FDF1EF',
        ogibdr:   '#F2C0B8',
        lnct:     '#4D3DBF',
        lnctbg:   '#F0EEFB',
        lnctbdr:  '#C5BFF0',
        // ── Status colours ─────────────────────────────────────────────────
        ok:       '#2E7D32',   // Status success green
        okbg:     '#F1F8F1',   // soft green tint
        okbdr:    '#A5D6A7',   // green border
        gold:     '#9A6E00',
        goldbg:   '#FDF6E3',
        danger:   '#B83030',
        dangerbg: '#FDEEEE',
        warn:     '#9A6000',
        warnbg:   '#FDF4E0',
      },
      fontFamily: {
        heading: ['Syne_700Bold'],
        body:    ['PlusJakartaSans_400Regular'],
      },
    },
  },
  plugins: [],
};