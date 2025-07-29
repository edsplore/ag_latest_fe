/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontSize: {
        xs: "0.75rem", // 12px
        sm: "0.875rem", // 14px
        base: "1rem", // 16px body text
        lg: "1.125rem", // 18px
        xl: "1.25rem", // 20px card titles
        "2xl": "1.5rem", // 24px
        "3xl": "2rem", // 32px h1
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        heading: ["Inter", "system-ui", "sans-serif"],
        menu: ["Inter", "system-ui", "sans-serif"],
      },
      colors: {
        primary: {
          DEFAULT: "#1E82FF",
          600: "#6A5CFF",
        },
        canvas: "#F6F8FA",
        cardborder: "#E3E7EE",
        accent: {
          purple: "#735CFF",
          teal: "#00C896",
          orange: "#FF8F44",
        },
        dark: {
          DEFAULT: "#18181b",
          50: "#2d2d3d",
          100: "#27272e",
          200: "#1f1f29",
          300: "#18181b",
          400: "#141417",
          500: "#101012",
          600: "#0c0c0e",
          700: "#08080a",
          800: "#040406",
          900: "#000000",
        },
      },
      animation: {
        glow: "glow 2s ease-in-out infinite alternate",
        float: "float 3s ease-in-out infinite",
        "pulse-ring": "pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        glow: {
          "0%": { boxShadow: "0 0 20px rgba(132, 204, 22, 0.2)" },
          "100%": { boxShadow: "0 0 30px rgba(132, 204, 22, 0.4)" },
        },
      },
    },
  },
  plugins: [],
};
