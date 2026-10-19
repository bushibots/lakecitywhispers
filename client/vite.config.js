import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'child_process'

let gitCommit = '';
try {
  gitCommit = execSync('git rev-parse --short HEAD').toString().trim();
} catch {
  gitCommit = Date.now().toString();
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __APP_COMMIT__: JSON.stringify(process.env.RENDER_GIT_COMMIT || process.env.VERCEL_GIT_COMMIT_SHA || gitCommit),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'vendor-react';
            }
            if (id.includes('lucide-react') || id.includes('react-hot-toast')) {
              return 'vendor-ui';
            }
            if (id.includes('socket.io-client')) {
              return 'vendor-socket';
            }
          }
        }
      }
    }
  }
})
