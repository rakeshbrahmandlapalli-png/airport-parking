/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // Admin theme colours. The values are CSS variables (app/globals.css,
      // "ADMIN THEME") so the admin can switch between dark and light.
      colors: {
        canvas: "rgb(var(--admin-canvas) / <alpha-value>)",
        panel: {
          DEFAULT: "rgb(var(--admin-panel) / <alpha-value>)",
          2: "rgb(var(--admin-panel-2) / <alpha-value>)",
          3: "rgb(var(--admin-panel-3) / <alpha-value>)",
          4: "rgb(var(--admin-panel-4) / <alpha-value>)",
        },
        fg: {
          DEFAULT: "rgb(var(--admin-fg) / <alpha-value>)",
          2: "rgb(var(--admin-fg-2) / <alpha-value>)",
          3: "rgb(var(--admin-fg-3) / <alpha-value>)",
          4: "rgb(var(--admin-fg-4) / <alpha-value>)",
        },
      },
      keyframes: {
        scan: {
          "0%":   { top: "0%" },
          "100%": { top: "100%" },
        },
        progress: {
          "0%":   { width: "0%" },
          "100%": { width: "100%" },
        },
      },
      animation: {
        scan:     "scan 2s linear infinite",
        progress: "progress 5s linear forwards",
      },
    },
  },
  plugins: [
    // admin-light:… applies only while the admin is in light mode.
    ({ addVariant }) => addVariant("admin-light", "[data-admin-theme=light] &"),
  ],
};