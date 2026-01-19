import type { Config } from "tailwindcss";

const config: Config = {
  // Content paths for file scanning (v4 auto-discovers, but keeping for explicit control)
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  // Plugins - tailwindcss-animate still requires JS config
  plugins: [require("tailwindcss-animate")],
  // Theme customizations moved to CSS @theme blocks in globals.css
  // darkMode is handled via CSS in v4
};

export default config;
