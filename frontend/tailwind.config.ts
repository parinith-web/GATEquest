import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./client/**/*.{ts,tsx}", "./index.html"],
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
      fontFamily: {
        inter: ["InterVariable", "Inter", "-apple-system", "Roboto", "Helvetica", "sans-serif"],
        // display/dmsans both resolve to Inter Display (the display optical-size
        // cut of the Inter variable font) — used by the landing page headlines.
        display: ["InterDisplay", "InterVariable", "Inter", "sans-serif"],
        dmsans: ["InterDisplay", "InterVariable", "Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
        jetbrains: ["JetBrains Mono", "monospace"],
        firacode: ["Fira Code", "monospace"],
        sans: ["InterVariable", "Inter", "system-ui", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        // ── GATEquest unified design tokens ──────────────────────────────
        gq: {
          // Backgrounds
          bg: "#0E0E0E",
          sidebar: "#131313",
          header: "#131313",
          surface: "#0E0E0E",
          card: "#1C1B1B",
          "card-alt": "#201F1F",
          "card-hover": "#222222",
          row: "#2A2A2A",
          tag: "#353534",
          // Borders
          border: "#2A2A2A",
          "border-subtle": "#424754",
          // Nav
          "nav-active": "#3E495D",
          active: "#4F4F4F",
          input: "#201F1F",
          // Brand blue (two shades for main + quests sub-systems)
          blue: "#5DA2FA",          // Overview / Dashboard blue
          "blue-accent": "#ADC6FF", // Quests / Profile blue
          "blue-dark": "#002E6A",
          "blue-glow": "rgba(93, 162, 250, 0.25)",
          // Brand purple
          purple: "#C0C1FF",
          "purple-dark": "#1000A9",
          // Status / difficulty
          yellow: "#EAB308",
          red: "#FFB4AB",
          green: "#A3FF33",
          // Text
          text: "#FFFFFF",
          "text-primary": "#E5E2E1",
          "text-secondary": "#C2C6D6",
          "text-muted": "#8C909F",
          "text-dim": "#888888",
          "text-nav": "#AEB9D0",
          heading: "#E5E2E1",
          muted: "#8C909F",
          dim: "#6B7280",
          // Special
          "rank-bg": "#3E495D",
          accent: "#ADC6FF",
          "accent-muted": "#AEB9D0",
          // Heatmap levels
          "heat-0": "#353534",
          "heat-1": "#3B5FB1",
          "heat-2": "#445891",
          "heat-3": "#ADC6FF",
          // XP
          "xp-gain": "#ADC6FF",
          "xp-loss": "#FFB4AB",
          "badge-unlock": "#C0C1FF",
        },
        // ── Pulse (Community) section tokens ─────────────────────────────
        pulse: {
          bg: "#0E0E0E",
          card: "#131313",
          border: "#1C1B1B",
          border2: "#2A2A2A",
          text: "#E5E2E1",
          muted: "#C2C6D6",
          dim: "#8C909F",
          blue: "#3B82F6",
          placeholder: "#6B7280",
          red: "#FF5F56",
          yellow: "#FFBD2E",
          green: "#27C93F",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "slide-left": {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-100%)" },
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
