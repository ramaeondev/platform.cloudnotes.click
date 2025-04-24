import { defineConfig } from 'vitest/config';

export default defineConfig({
  build: {
    rollupOptions: {
      external: ['react-hot-toast']
    }
  }
});