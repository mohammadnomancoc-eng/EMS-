/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          red: "#CC0000",
          teal: "#00B8B8",
          gold: "#C9922A",
        },
      },
      fontFamily: {
        rajdhani: ["Rajdhani", "sans-serif"],
        mulish: ["Mulish", "sans-serif"],
        mono: ["Share Tech Mono", "monospace"],
      },
    },
  },
  plugins: [],
};