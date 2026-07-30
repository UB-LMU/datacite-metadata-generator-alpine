import { resolve } from "node:path";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
    plugins: [tailwindcss()],
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, "index.html"),
                legalNotice: resolve(__dirname, "legal-notice.html"),
                legalNoticeDe: resolve(__dirname, "legal-notice-de.html"),
            },
        },
    },
});
