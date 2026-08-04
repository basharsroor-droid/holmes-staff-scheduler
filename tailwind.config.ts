import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  corePlugins: {
    preflight: false
  },
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border-hsl) / <alpha-value>)",
        input: "hsl(var(--input-hsl) / <alpha-value>)",
        ring: "hsl(var(--ring-hsl) / <alpha-value>)",
        background: "hsl(var(--background-hsl) / <alpha-value>)",
        foreground: "hsl(var(--foreground-hsl) / <alpha-value>)",
        primary: {
          DEFAULT: "hsl(var(--primary-hsl) / <alpha-value>)",
          foreground: "hsl(var(--primary-foreground-hsl) / <alpha-value>)"
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary-hsl) / <alpha-value>)",
          foreground: "hsl(var(--secondary-foreground-hsl) / <alpha-value>)"
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive-hsl) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground-hsl) / <alpha-value>)"
        },
        muted: {
          DEFAULT: "hsl(var(--muted-hsl) / <alpha-value>)",
          foreground: "hsl(var(--muted-foreground-hsl) / <alpha-value>)"
        },
        accent: {
          DEFAULT: "hsl(var(--accent-hsl) / <alpha-value>)",
          foreground: "hsl(var(--accent-foreground-hsl) / <alpha-value>)"
        },
        popover: {
          DEFAULT: "hsl(var(--popover-hsl) / <alpha-value>)",
          foreground: "hsl(var(--popover-foreground-hsl) / <alpha-value>)"
        },
        card: {
          DEFAULT: "hsl(var(--card-hsl) / <alpha-value>)",
          foreground: "hsl(var(--card-foreground-hsl) / <alpha-value>)"
        }
      },
      borderRadius: {
        lg: "1rem",
        md: "calc(1rem - 2px)",
        sm: "calc(1rem - 4px)"
      }
    }
  },
  plugins: []
};

export default config;
