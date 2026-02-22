import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "#2e2e2e",
        input: "#3d3d3d",
        ring: "#b8f2a0",
        background: "#0d0d0d",
        foreground: "#f5f5f5",
        primary: {
          DEFAULT: "#b8f2a0",
          foreground: "#000000",
        },
        secondary: {
          DEFAULT: "#1e1e1e",
          foreground: "#c8c8c8",
        },
        destructive: {
          DEFAULT: "#ff5c5c",
          foreground: "#ffffff",
        },
        muted: {
          DEFAULT: "#1e1e1e",
          foreground: "#848484",
        },
        accent: {
          DEFAULT: "#b8f2a0",
          foreground: "#000000",
        },
        popover: {
          DEFAULT: "#141414",
          foreground: "#f5f5f5",
        },
        card: {
          DEFAULT: "#141414",
          foreground: "#f5f5f5",
        },
      },
      fontFamily: {
        sans: ['Syne', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
      borderRadius: {
        lg: "6px",
        md: "4px",
        sm: "2px",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
