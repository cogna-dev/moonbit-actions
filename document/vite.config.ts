import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'
import fs from 'fs'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const readmePath =
  process.env.README_PATH ||
  path.resolve(process.cwd(), '../../README.md')

const readmeContent = fs.existsSync(readmePath)
  ? fs.readFileSync(readmePath, 'utf-8')
  : '# Documentation\n\nNo README.md found.'

const pageTitle = process.env.VITE_PAGE_TITLE || 'Documentation'

export default defineConfig({
  plugins: [
    react(),
    viteSingleFile(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    __README_CONTENT__: JSON.stringify(readmeContent),
    __PAGE_TITLE__: JSON.stringify(pageTitle),
  },
})
