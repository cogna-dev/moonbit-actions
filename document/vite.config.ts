import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'
import fs from 'fs'
import path from 'path'
import { createHighlighter, type Highlighter } from 'shiki'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const pageTitle = process.env.VITE_PAGE_TITLE || 'Documentation'
const repoFullName = process.env.VITE_REPO_FULL_NAME || ''

// ---------------------------------------------------------------------------
// Determine which README files to include.
//
// Priority:
//  1. REPO_ROOT  — scan the entire directory tree (multi-README mode, new default)
//  2. README_PATH — legacy single-file mode: only render that one file
//  3. Fall back to ../../ relative to document/ (the monorepo root in dev)
// ---------------------------------------------------------------------------
const legacyReadmePath = process.env.README_PATH || ''
const repoRoot =
  process.env.REPO_ROOT ||
  (legacyReadmePath ? '' : path.resolve(process.cwd(), '../..'))

// ---------------------------------------------------------------------------
// Directory walker: collect all README.md files under a root directory.
// Returns [{dirKey, abs}] where dirKey is the slash-separated path of the
// *directory containing* the README, relative to rootDir (empty string for
// the root README.md).
// Skips hidden directories and node_modules.
// ---------------------------------------------------------------------------
interface ReadmeEntry { dirKey: string; abs: string }

function walkReadmes(rootDir: string): ReadmeEntry[] {
  const results: ReadmeEntry[] = []

  function walk(absDir: string, relDir: string) {
    if (!fs.existsSync(absDir)) return
    for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue
      const absPath = path.join(absDir, entry.name)
      const relPath = relDir ? `${relDir}/${entry.name}` : entry.name
      if (entry.isDirectory()) {
        walk(absPath, relPath)
      } else if (entry.isFile() && entry.name.toLowerCase() === 'readme.md') {
        // dirKey is the parent directory path (relDir), not the file path.
        results.push({ dirKey: relDir, abs: absPath })
      }
    }
  }

  walk(rootDir, '')

  // De-duplicate by dirKey (first README.md found wins — case-insensitive fs).
  const seen = new Set<string>()
  return results.filter(r => {
    if (seen.has(r.dirKey)) return false
    seen.add(r.dirKey)
    return true
  })
}

// Build the list of README entries to process.
let entries: ReadmeEntry[]
if (legacyReadmePath) {
  // Legacy single-file mode: only the explicitly provided path.
  entries = [{ dirKey: '', abs: legacyReadmePath }]
} else {
  entries = walkReadmes(repoRoot)
  if (entries.length === 0) {
    entries = [{ dirKey: '', abs: '' }]
  }
}

// ---------------------------------------------------------------------------
// Shiki: pre-process fenced code blocks in each README at build time.
// Produces dual-theme HTML using CSS variables so the dark/light toggle
// works entirely in CSS — no runtime cost.
// ---------------------------------------------------------------------------
async function applyShiki(markdown: string, hl: Highlighter): Promise<string> {
  return markdown.replace(
    /^```([\w+-]*)\n([\s\S]*?)^```/gm,
    (_, lang, code) => {
      const language = lang.trim() || 'text'
      let highlighted: string
      try {
        highlighted = hl.codeToHtml(code.trimEnd(), {
          lang: language,
          themes: { light: 'github-light', dark: 'github-dark' },
          defaultColor: false,
        })
      } catch {
        // Fallback for languages Shiki doesn't recognise
        highlighted = hl.codeToHtml(code.trimEnd(), {
          lang: 'text',
          themes: { light: 'github-light', dark: 'github-dark' },
          defaultColor: false,
        })
      }
      return `\n${highlighted}\n`
    },
  )
}

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

// Build the README map: dirKey → highlighted markdown content.
// This is embedded at compile time and used by the React app for routing.
const readmeMap: Record<string, string> = {}
for (const { dirKey, abs } of entries) {
  const raw =
    abs && fs.existsSync(abs)
      ? fs.readFileSync(abs, 'utf-8')
      : '# Documentation\n\nNo README.md found.'
  readmeMap[dirKey] = await applyShiki(raw, highlighter)
}

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
    __README_MAP__: JSON.stringify(readmeMap),
    __PAGE_TITLE__: JSON.stringify(pageTitle),
    __REPO_FULL_NAME__: JSON.stringify(repoFullName),
  },
})
