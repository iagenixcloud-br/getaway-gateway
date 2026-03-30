/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui"],
        display: ["Montserrat", "ui-sans-serif"],
      },
      colors: {
        navy: {
          DEFAULT: "#001f3f",
          light: "#002d5a",
          lighter: "#003d7a",
        },
        gold: {
          DEFAULT: "#D4AF37",
          light: "#e8c84a",
          dark: "#b8960c",
        },
      },
      animation: {
        "spin-slow": "spin 3s linear infinite",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "count-up": "countUp 0.8s ease forwards",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(212, 175, 55, 0.25)" },
          "50%": { boxShadow: "0 0 40px rgba(212, 175, 55, 0.5)" },
        },
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};
