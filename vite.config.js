import { defineConfig } from 'vite';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  base: './',
  server: {
    port: 5173,
    host: true
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        about: resolve(__dirname, 'about.html'),
        contact: resolve(__dirname, 'contact.html'),
        messages: resolve(__dirname, 'messages.html'),
        notifications: resolve(__dirname, 'notifications.html'),
        profile: resolve(__dirname, 'profile.html'),
        services: resolve(__dirname, 'services.html'),
        testimonials: resolve(__dirname, 'testimonials.html'),
        users: resolve(__dirname, 'users.html')
      }
    }
  },
  publicDir: 'public'
});
