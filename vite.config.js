import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// IMPORTANT: change 'base' to match your GitHub repo name exactly.
// If your repo is https://github.com/yourname/portfolio-tracker,
// base should be '/portfolio-tracker/'.
// If you're using a custom domain or a *.github.io user/org page
// (repo named yourname.github.io), set base to '/'.
export default defineConfig({
  plugins: [react()],
  base: '/chanportofolio/',
})
