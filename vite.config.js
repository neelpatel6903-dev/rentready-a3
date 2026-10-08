import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Local dev: keep the browser same-origin — /api/* is forwarded to the
    // FastAPI server (uvicorn api.index:app --port 8000). On Vercel the
    // same paths hit the serverless function with no proxy needed.
    proxy: {
      '/api': 'http://127.0.0.1:8000',
    },
  },
})
