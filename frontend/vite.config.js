import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/auth': {
        target: 'http://localhost:8000',
        bypass: (req, res, proxyOptions) => {
          if (req.url.startsWith('/auth/github/callback')) {
            return req.url;
          }
        }
      },
      '/onboarding': 'http://localhost:8000',
      '/workouts': 'http://localhost:8000',
    }
  }
})
