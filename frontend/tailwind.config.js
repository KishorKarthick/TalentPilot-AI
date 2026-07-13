/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: { 50: '#eff6ff', 100: '#dbeafe', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 900: '#1e3a8a' },
        success: { 100: '#dcfce7', 500: '#22c55e', 700: '#15803d' },
        warning: { 100: '#fef9c3', 500: '#eab308', 700: '#a16207' },
        danger: { 100: '#fee2e2', 500: '#ef4444', 700: '#b91c1c' },
      },
    },
  },
  plugins: [],
};
