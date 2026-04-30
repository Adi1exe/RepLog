/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      // ── Brand Palette ──────────────────────────────────────────────────────
      colors: {
        // Base surfaces
        void:    "var(--color-void)",
        surface: "var(--color-surface)",
        elevated:"var(--color-elevated)",
        border:  "var(--color-border)",

        // Typography
        "text-primary":   "var(--color-text-primary)",
        "text-secondary": "var(--color-text-secondary)",
        "text-muted":     "var(--color-text-muted)",

        // Vibrant accent
        accent: {
          DEFAULT: "var(--color-accent)",
          hover:   "var(--color-accent-hover)",
          dim:     "var(--color-accent-dim)",
        },

        // Semantic status colours
        success: "var(--color-success)",
        danger:  "var(--color-danger)",
        warning: "var(--color-warning)",
      },

      // ── Typography ─────────────────────────────────────────────────────────
      fontFamily: {
        // Display: geometric, technical — for headings and the streak counter
        display: ["'DM Mono'", "monospace"],
        // Body: clean, readable — for all other text
        body:    ["'Outfit'", "sans-serif"],
      },

      // ── Spacing & Sizing ───────────────────────────────────────────────────
      borderRadius: {
        card: "12px",
        btn:  "8px",
      },

      // ── Animations ─────────────────────────────────────────────────────────
      keyframes: {
        "fade-up": {
          "0%":   { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          "0%":   { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        pulse_accent: {
          "0%, 100%": { boxShadow: "0 0 0 0 #c8f23c44" },
          "50%":      { boxShadow: "0 0 0 8px #c8f23c00" },
        },
      },
      animation: {
        "fade-up":      "fade-up 0.4s ease forwards",
        "scale-in":     "scale-in 0.3s ease forwards",
        "pulse-accent": "pulse_accent 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
