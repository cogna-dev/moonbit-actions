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
// Placeholder strings — kept in sync with scripts/build-multipage.mjs.
// These are substituted per-page by the build script after Vite produces the
// template index.html.  Minifiers never change string literal VALUES, so the
// content placeholder always survives.
//
// IMPORTANT: The key placeholder MUST contain characters that are not valid in
// a JavaScript identifier (here: hyphens), so that esbuild cannot remove the
// quotes from the object key.  Without hyphens, esbuild would minify:
//
//   { "MOONBIT_DOCS_PAGE_KEY": "content" }     ← quoted key (desired)
//   to:
//   { MOONBIT_DOCS_PAGE_KEY: "content" }        ← unquoted key (breaks substitution)
//
// With hyphens, the key must stay quoted in all JS engines.
// ---------------------------------------------------------------------------
const CONTENT_PLACEHOLDER = 'MOONBIT_DOCS_README_CONTENT__PLACEHOLDER__V1'
const KEY_PLACEHOLDER = 'moonbit-docs-page-key--placeholder--v1'

// ---------------------------------------------------------------------------
// Two build modes:
//
//  Template mode  (VITE_BUILD_TEMPLATE=1, triggered by build-multipage.mjs)
//    ‣ Does NOT read any README files.
//    ‣ Embeds placeholder strings for content and current-page key.
//    ‣ __ALL_PAGE_KEYS__ is taken from VITE_ALL_PAGE_KEYS env var.
//
//  Dev mode  (npm run dev, no VITE_BUILD_TEMPLATE)
//    ‣ Scans REPO_ROOT for all README.md files.
//    ‣ Processes them with Shiki.
//    ‣ Embeds the full __README_MAP__ for SPA / hash-routing.
// ---------------------------------------------------------------------------
const isTemplateBuild = !!process.env.VITE_BUILD_TEMPLATE

// ---------------------------------------------------------------------------
// Directory walker (used in dev mode only).
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
        results.push({ dirKey: relDir, abs: absPath })
      }
    }
  }

  walk(rootDir, '')

  const seen = new Set<string>()
  return results.filter(r => {
    if (seen.has(r.dirKey)) return false
    seen.add(r.dirKey)
    return true
  })
}

// ---------------------------------------------------------------------------
// Shiki helper (used in dev mode only).
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

// ---------------------------------------------------------------------------
// Compute the defines to pass to Vite.
// ---------------------------------------------------------------------------
let defines: Record<string, string>

if (isTemplateBuild) {
  // Template build — placeholders only.
  const allPageKeys: string[] = process.env.VITE_ALL_PAGE_KEYS
    ? JSON.parse(process.env.VITE_ALL_PAGE_KEYS)
    : ['']

  defines = {
    __README_MAP__: JSON.stringify({ [KEY_PLACEHOLDER]: CONTENT_PLACEHOLDER }),
    __ALL_PAGE_KEYS__: JSON.stringify(allPageKeys),
    __CURRENT_PAGE_KEY__: JSON.stringify(KEY_PLACEHOLDER),
    __PAGE_TITLE__: JSON.stringify(pageTitle),
    __REPO_FULL_NAME__: JSON.stringify(repoFullName),
  }
} else {
  // Dev mode — scan REPO_ROOT and load all READMEs.
  const legacyReadmePath = process.env.README_PATH || ''
  const repoRoot =
    process.env.REPO_ROOT ||
    (legacyReadmePath ? '' : path.resolve(process.cwd(), '../..'))

  let entries: ReadmeEntry[]
  if (legacyReadmePath) {
    entries = [{ dirKey: '', abs: legacyReadmePath }]
  } else {
    entries = walkReadmes(repoRoot)
    if (entries.length === 0) entries = [{ dirKey: '', abs: '' }]
  }

  const sortedKeys = [...entries]
    .sort((a, b) => {
      if (a.dirKey === '') return -1
      if (b.dirKey === '') return 1
      return a.dirKey.localeCompare(b.dirKey)
    })
    .map(e => e.dirKey)

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

  const readmeMap: Record<string, string> = {}
  for (const { dirKey, abs } of entries) {
    const raw =
      abs && fs.existsSync(abs)
        ? fs.readFileSync(abs, 'utf-8')
        : '# Documentation\n\nNo README.md found.'
    readmeMap[dirKey] = await applyShiki(raw, highlighter)
  }

  defines = {
    // In dev mode the full map is available — App.tsx uses SPA/hash routing.
    __README_MAP__: JSON.stringify(readmeMap),
    __ALL_PAGE_KEYS__: JSON.stringify(sortedKeys),
    __CURRENT_PAGE_KEY__: JSON.stringify(''),
    __PAGE_TITLE__: JSON.stringify(pageTitle),
    __REPO_FULL_NAME__: JSON.stringify(repoFullName),
  }
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
  define: defines,
})
