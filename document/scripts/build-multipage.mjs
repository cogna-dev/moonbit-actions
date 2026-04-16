/**
 * build-multipage.mjs
 *
 * Orchestration script for the multi-page documentation build.
 *
 * Steps:
 *  1. Walk REPO_ROOT (or fall back to the monorepo root in dev) to find all README.md files.
 *  2. Process every README with Shiki (dual-theme code highlighting, done once up-front).
 *  3. Run the Vite build once to produce a TEMPLATE index.html with placeholder strings for
 *     the per-page content and page key.  All other constants (__ALL_PAGE_KEYS__ etc.) are
 *     baked in at this step because they are the same for every page.
 *  4. For each README, substitute the placeholders with the real values and write the output
 *     to dist/<key>/index.html (or dist/index.html for the root README).
 *
 * The placeholder approach works because:
 *  - Vite/esbuild never changes string literal VALUES during minification — only variable names.
 *  - The placeholder strings are unique enough that false-positive matches are impossible.
 *  - `vite-plugin-singlefile` inlines all JS/CSS, so there are no separate asset files whose
 *    URLs would need updating.
 */

import { execFileSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createHighlighter } from 'shiki'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const docDir = path.resolve(__dirname, '..')

// ---------------------------------------------------------------------------
// Placeholder strings — must survive JS minification (they do: esbuild/rollup
// never alters string literal values).
// ---------------------------------------------------------------------------
export const CONTENT_PLACEHOLDER = 'MOONBIT_DOCS_README_CONTENT__PLACEHOLDER__V1'
// NOTE: hyphens are required — esbuild would remove quotes from a pure-ASCII
// alphanumeric/underscore key, turning  { "KEY": "..." }  into  { KEY: "..." }
// which would then not match the quoted substitution pattern.
export const KEY_PLACEHOLDER = 'moonbit-docs-page-key--placeholder--v1'

// ---------------------------------------------------------------------------
// Resolve the repository root directory.
//  1. REPO_ROOT env var (set by action.yml for multi-README mode)
//  2. README_PATH env var → skip directory scanning (legacy single-file mode)
//  3. Fall back to the monorepo root (../../ from document/)
// ---------------------------------------------------------------------------
const legacyReadmePath = process.env.README_PATH || ''
const repoRoot =
  process.env.REPO_ROOT ||
  (legacyReadmePath ? '' : path.resolve(docDir, '../..'))

const pageTitle =
  process.env.VITE_PAGE_TITLE || path.basename(repoRoot) || 'Documentation'
const repoFullName = process.env.VITE_REPO_FULL_NAME || ''

// ---------------------------------------------------------------------------
// Walk a directory tree collecting all README.md files.
// Returns [{dirKey, abs}] where dirKey is the slash-separated path of the
// *directory* containing the README, relative to rootDir ("" for root README).
// Skips hidden directories and node_modules.
// ---------------------------------------------------------------------------
function walkReadmes(rootDir) {
  const results = []

  function walk(absDir, relDir) {
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

  // De-duplicate by dirKey (first README.md found wins — handles case-insensitive fs).
  const seen = new Set()
  return results.filter(r => {
    if (seen.has(r.dirKey)) return false
    seen.add(r.dirKey)
    return true
  })
}

// ---------------------------------------------------------------------------
// Build the list of README entries.
// ---------------------------------------------------------------------------
let entries
if (legacyReadmePath) {
  entries = [{ dirKey: '', abs: legacyReadmePath }]
} else {
  entries = walkReadmes(repoRoot)
  if (entries.length === 0) {
    entries = [{ dirKey: '', abs: '' }]
  }
}

// Sort: root first, then alphabetical.
entries.sort((a, b) => {
  if (a.dirKey === '') return -1
  if (b.dirKey === '') return 1
  return a.dirKey.localeCompare(b.dirKey)
})

const sortedKeys = entries.map(e => e.dirKey)

console.log(`\n📚 Found ${entries.length} README file(s):`)
for (const e of entries) {
  console.log(`   ${e.dirKey || '(root)'}  →  ${e.abs}`)
}

// ---------------------------------------------------------------------------
// Shiki: process ALL READMEs up-front (creates the highlighter once).
// ---------------------------------------------------------------------------
console.log('\n🎨 Processing with Shiki…')

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

function applyShiki(markdown) {
  return markdown.replace(
    /^```([\w+-]*)\n([\s\S]*?)^```/gm,
    (_, lang, code) => {
      const language = lang.trim() || 'text'
      let highlighted
      try {
        highlighted = highlighter.codeToHtml(code.trimEnd(), {
          lang: language,
          themes: { light: 'github-light', dark: 'github-dark' },
          defaultColor: false,
        })
      } catch {
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

/** @type {Record<string, string>} key → processed markdown */
const processedMap = {}
for (const { dirKey, abs } of entries) {
  const raw =
    abs && fs.existsSync(abs)
      ? fs.readFileSync(abs, 'utf-8')
      : '# Documentation\n\nNo README.md found.'
  processedMap[dirKey] = applyShiki(raw)
}

// ---------------------------------------------------------------------------
// Vite template build.
// Build once with placeholder content/key so that vite-plugin-singlefile
// produces a single inlined dist/index.html we can use as a template.
// __ALL_PAGE_KEYS__ is the same for every page, so it's baked in here.
// ---------------------------------------------------------------------------
console.log('\n⚙️  Running Vite template build…')

const tsc = path.join(docDir, 'node_modules/.bin/tsc')
const vite = path.join(docDir, 'node_modules/.bin/vite')

// Type-check first (runs from docDir, so tsconfig.app.json is used by tsc -b).
execFileSync(tsc, ['-b'], { cwd: docDir, stdio: 'inherit' })

// Vite build with special env vars that tell vite.config.ts to use placeholders.
execFileSync(vite, ['build'], {
  cwd: docDir,
  stdio: 'inherit',
  env: {
    ...process.env,
    VITE_BUILD_TEMPLATE: '1',
    VITE_ALL_PAGE_KEYS: JSON.stringify(sortedKeys),
    VITE_PAGE_TITLE: pageTitle,
    VITE_REPO_FULL_NAME: repoFullName,
  },
})

// ---------------------------------------------------------------------------
// Per-page HTML generation via placeholder substitution.
// ---------------------------------------------------------------------------
console.log('\n📄 Generating per-page HTML files…')

const templateHtml = fs.readFileSync(path.join(docDir, 'dist/index.html'), 'utf-8')

// Sanity check: the placeholders must actually be present in the template.
if (
  !templateHtml.includes(`"${CONTENT_PLACEHOLDER}"`) ||
  !templateHtml.includes(`"${KEY_PLACEHOLDER}"`)
) {
  throw new Error(
    'Template HTML is missing expected placeholder strings. ' +
    'Ensure VITE_BUILD_TEMPLATE=1 is respected by vite.config.ts.',
  )
}

/**
 * Escape a string for use in an HTML title element.
 * The title content is plain text, so only < > & need escaping.
 */
function escapeHtmlTitle(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

for (const { dirKey } of entries) {
  const content = processedMap[dirKey]

  // Replace both placeholder strings with the page-specific values.
  // All occurrences are replaced (the content placeholder appears once;
  // the key placeholder appears twice — once in the map object and once
  // as the standalone __CURRENT_PAGE_KEY__ constant).
  let html = templateHtml
    .replaceAll(`"${CONTENT_PLACEHOLDER}"`, JSON.stringify(content))
    .replaceAll(`"${KEY_PLACEHOLDER}"`, JSON.stringify(dirKey))

  // Update the <title> tag for SEO.
  const label = dirKey
    ? dirKey.split('/').pop()
    : (repoFullName.split('/')[1] || pageTitle)
  const titleText =
    label === pageTitle
      ? escapeHtmlTitle(pageTitle)
      : `${escapeHtmlTitle(label)} — ${escapeHtmlTitle(pageTitle)}`
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${titleText}</title>`)

  const outFile = dirKey
    ? path.join(docDir, 'dist', ...dirKey.split('/'), 'index.html')
    : path.join(docDir, 'dist', 'index.html')

  fs.mkdirSync(path.dirname(outFile), { recursive: true })
  fs.writeFileSync(outFile, html)
  console.log(`   ✓  ${outFile.replace(path.join(docDir, 'dist'), 'dist')}`)
}

console.log('\n✅ Multi-page build complete.\n')
