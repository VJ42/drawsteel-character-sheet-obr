import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Forge Steel's own '@/*' -> './src/*' aliases, repointed at the vendored
      // location since we placed the port under src/forgesteel/ instead of src/.
      // Must come before the generic '@' alias below so these more specific
      // matches win.
      '@/logic': path.resolve(__dirname, './src/forgesteel/logic'),
      '@/models': path.resolve(__dirname, './src/forgesteel/models'),
      '@/enums': path.resolve(__dirname, './src/forgesteel/enums'),
      '@/utils': path.resolve(__dirname, './src/forgesteel/utils'),
      '@/data': path.resolve(__dirname, './src/forgesteel/data'),
      '@': path.resolve(__dirname, './src'),
    },
  },
})
