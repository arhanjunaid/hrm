import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        rf: {
          moss:        '#7E8920',
          'moss-bright': '#A8B542',
          'moss-deep':   '#565E14',
          ink:         '#14160D',
          'ink-deep':  '#0E100A',
          bg:          '#F7F6F0',
          surface:     '#ECEFDE',
          card:        '#FFFFFF',
          text:        '#1A1C12',
        },
        // Legacy alias — kept for backward compatibility
        crextio: {
          bg:     '#F7F6F0',
          card:   '#ECEFDE',
          dark:   '#14160D',
          yellow: '#A8B542',
          purple: '#E5E5FF',
          green:  '#E4F8E5',
          blue:   '#7E8920',
        },
        brand: {
          50:  '#f7f8ec',
          100: '#eef0d5',
          200: '#d8dcaa',
          300: '#bfc477',
          400: '#a8b542',
          500: '#8f9b2e',
          600: '#7E8920',
          700: '#6b7519',
          800: '#565E14',
          900: '#424910',
          950: '#2a2e09',
        },
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
        '32': '32px',
        '36': '36px',
      },
    },
  },
  plugins: [],
};
export default config;
