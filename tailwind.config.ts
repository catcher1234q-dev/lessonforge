import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#007AFF",
          50: "#EAF4FF",
          100: "#D8EBFF",
          200: "#B6DAFF",
          300: "#8BC4FF",
          400: "#58A7FF",
          500: "#2D8DFF",
          600: "#007AFF",
          700: "#005FCC",
          800: "#004699",
          900: "#002F66",
        },
        ink: {
          DEFAULT: "#101828",
          soft: "#475467",
          muted: "#667085",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          subtle: "#F7F9FC",
          muted: "#EEF2F7",
        },
      },
      borderRadius: {
        "2.5xl": "1.5rem",
      },
      boxShadow: {
        "soft-xl":
          "0 20px 60px rgba(16, 24, 40, 0.08), 0 6px 20px rgba(16, 24, 40, 0.04)",
      },
      backgroundImage: {
        "hero-grid":
          "linear-gradient(to right, rgba(0, 122, 255, 0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 122, 255, 0.08) 1px, transparent 1px)",
      },
    },
  },
  plugins: [],
};

export default config;
