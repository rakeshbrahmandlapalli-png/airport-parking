/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
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
  plugins: [],
};