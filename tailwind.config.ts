import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        civic: {
          ink: "#17201d",
          line: "#d8ded9",
          field: "#f6f8f6",
          green: "#207a55",
          blue: "#2369b3",
          amber: "#b7791f",
          red: "#ba3b46",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
