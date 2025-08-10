import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
    output: 'server',
    integrations: [tailwind(), react()],
    site: 'https://your-domain.com', // Update this to your actual domain
    build: {
        assets: '_assets'
    },
    // Vite configuration to handle Pagefind integration
    vite: {
        define: {
            __PAGEFIND__: false,
        },
    }
});