import type { Config } from "tailwindcss";

// Colors come only from the CSS variables in src/app/globals.css.
const config: Config = {
  darkMode: "class",
  content: [
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/tools/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        muted: "var(--muted)",
        "muted-foreground": "var(--muted-foreground)",
        border: "var(--border)",
        "border-strong": "var(--border-strong)",
        accent: "var(--accent)",
        "accent-foreground": "var(--accent-foreground)",
        card: "var(--card)",
        surface: "var(--surface)",
        "surface-elevated": "var(--surface-elevated)",
        "border-subtle": "var(--border-subtle)",
        "accent-hover": "var(--accent-hover)",
        "accent-active": "var(--accent-active)",
        "accent-soft": "var(--accent-soft)",
        "accent-text": "var(--accent-text)",
        "card-foreground": "var(--card-foreground)",
        hover: "var(--hover)",
        brand: "var(--brand)",
        primary: "var(--primary)",
        "primary-hover": "var(--primary-hover)",
        "primary-foreground": "var(--primary-foreground)",
        "primary-soft": "var(--primary-soft)",
        ring: "var(--ring)",
        success: "var(--success)",
        danger: "var(--danger)",
        warning: "var(--warning)",
      },
      borderRadius: {
        lg: "var(--radius-sm)",
        xl: "var(--radius)",
        "2xl": "var(--radius-lg)",
        "3xl": "var(--radius-xl)",
      },
      boxShadow: {
        card: "var(--shadow)",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "-apple-system", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
