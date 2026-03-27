import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: {
          primary: "#0a0b0f",
          secondary: "#12131a",
          tertiary: "#1a1b26",
          card: "#161822",
          hover: "#1e2030",
        },
        accent: {
          green: "#00d26a",
          "green-dim": "#00d26a33",
          red: "#ff4757",
          "red-dim": "#ff475733",
          blue: "#5b7fff",
          "blue-dim": "#5b7fff33",
          purple: "#a855f7",
          yellow: "#fbbf24",
        },
        text: {
          primary: "#e2e8f0",
          secondary: "#94a3b8",
          muted: "#64748b",
        },
        border: {
          primary: "#1e293b",
          hover: "#334155",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      boxShadow: {
        glow: "0 0 20px rgba(91, 127, 255, 0.15)",
        "glow-green": "0 0 20px rgba(0, 210, 106, 0.15)",
        "glow-red": "0 0 20px rgba(255, 71, 87, 0.15)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [],
};
export default config;
