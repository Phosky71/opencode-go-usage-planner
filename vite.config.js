import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
    plugins: [react()],
    // Relative base so the built app works when served from
    // /proyectos/opencode-go-usage-planner/app/ on operiasystems.com.
    base: './',
    test: {
        environment: "jsdom",
        include: ["src/__tests__/**/*.test.ts"],
    },
});
