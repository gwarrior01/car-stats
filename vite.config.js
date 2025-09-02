import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ command }) => {
  const isGitHubPages = process.env.GITHUB_PAGES === 'true'
  return {
    base: command === 'build' && isGitHubPages ? '/car-stats/' : '/',
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  }
})
