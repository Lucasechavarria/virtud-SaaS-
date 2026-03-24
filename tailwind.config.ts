import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ["var(--font-inter)"],
                rajdhani: ["var(--font-rajdhani)"],
            },
            backgroundImage: {
                "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
                "gradient-conic":
                    "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
            },
            colors: {
                background: "var(--background)",
                foreground: "var(--foreground)",
                // Elite Tactical Tokens
                tactical: {
                    cyan: "#00F5FF",
                    magenta: "#FF00FF",
                    black: "#050505",
                    zinc: "#111111",
                }
            },
            boxShadow: {
                'neon-cyan': '0 0 15px rgba(0, 245, 255, 0.3)',
                'neon-magenta': '0 0 15px rgba(255, 0, 255, 0.3)',
            }
        },
    },

    plugins: [
        require('@tailwindcss/typography'),
    ],
};
export default config;
