import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "hsl(var(--bg))",
        surface: "hsl(var(--surface))",
        ink: "hsl(var(--ink))",
        muted: "hsl(var(--muted))",
        accent: "hsl(var(--accent))",
        "accent-2": "hsl(var(--accent-2))",
        line: "hsl(var(--line))",
        success: "hsl(var(--success))",
        warning: "hsl(var(--warning))",
        danger: "hsl(var(--danger))"
      }
    }
  },
  plugins: [animate]
};

export default config;
