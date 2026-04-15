import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'
import fs from 'fs'
import path from 'path'
import { createHighlighter } from 'shiki'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const readmePath =
  process.env.README_PATH ||
  path.resolve(process.cwd(), '../../README.md')

const rawReadmeContent = fs.existsSync(readmePath)
  ? fs.readFileSync(readmePath, 'utf-8')
  : '# Documentation\n\nNo README.md found.'

const pageTitle = process.env.VITE_PAGE_TITLE || 'Documentation'
const repoFullName = process.env.VITE_REPO_FULL_NAME || ''

// Pre-process code blocks with Shiki at build time for dual-theme highlighting.
// Fenced code blocks are replaced with highlighted HTML that uses CSS variables,
// allowing the app's dark/light toggle to switch themes without any runtime cost.
async function applyShiki(markdown: string): Promise<string> {
  const highlighter = await createHighlighter({
    themes: ['github-light', 'github-dark'],
    langs: [
      'javascript', 'typescript', 'tsx', 'jsx',
      'json', 'yaml', 'toml',
      'bash', 'sh', 'shell', 'zsh',
      'css', 'html', 'markdown', 'md',
      'python', 'rust', 'go', 'java', 'c', 'cpp',
      'moonbit',
    ],
  })

  return markdown.replace(
    /^```([\w+-]*)\n([\s\S]*?)^```/gm,
    (_, lang, code) => {
      const language = lang.trim() || 'text'
      let highlighted: string
      try {
        highlighted = highlighter.codeToHtml(code.trimEnd(), {
          lang: language,
          themes: { light: 'github-light', dark: 'github-dark' },
          defaultColor: false,
        })
      } catch {
        // Fallback for unsupported languages
        highlighted = highlighter.codeToHtml(code.trimEnd(), {
          lang: 'text',
          themes: { light: 'github-light', dark: 'github-dark' },
          defaultColor: false,
        })
      }
      return `\n${highlighted}\n`
    },
  )
}

const readmeContent = await applyShiki(rawReadmeContent)

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
    __REPO_FULL_NAME__: JSON.stringify(repoFullName),
  },
})
