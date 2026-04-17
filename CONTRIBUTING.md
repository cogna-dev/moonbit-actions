# Contributing to moonbit-actions

Thanks for your interest in contributing! This guide focuses on developing the **`document`** action, which is the most complex component — a full React/Vite app that produces a self-contained `index.html`.

## Repository layout

```
moonbit-actions/
├── document/          ← Vite + React app (this guide's focus)
│   ├── src/           ← React source (App.tsx, components/, …)
│   ├── vite.config.ts ← Build config + Shiki pre-processing + README scanning
│   ├── package.json
│   └── action.yml     ← GitHub Actions composite action
├── setup/             ← Composite action (action.yml only)
├── build/             ← Composite action (action.yml only)
├── publish/           ← Composite action (action.yml only)
├── example/           ← Minimal MoonBit hello-world project
└── README.md
```

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | ≥ 20 | Run the Vite dev server and build |
| npm | ≥ 10 | Dependency management |

## Local development of the `document` action

### 1 — Install dependencies

```bash
cd document
npm install
```

### 2 — Start the Vite dev server

The dev server scans the directory tree set by the `REPO_ROOT` environment variable (falls back to `../../` relative to `document/`, which resolves to the monorepo root).

```bash
# Scan the repo root (default — picks up all README.md files)
npm run dev

# Scan a specific directory
REPO_ROOT=/path/to/your/project npm run dev
```

Open <http://localhost:5173> in your browser. The page hot-reloads whenever you edit source files under `src/`.

> **Note:** `REPO_ROOT` changes require a full Vite restart because all README files are read at config-load time and embedded as compile-time constants.

### Single-file (legacy) mode

To render only one README file instead of the whole tree, use the `README_PATH` variable:

```bash
README_PATH=/path/to/README.md npm run dev
```

When `README_PATH` is set, directory scanning is skipped and only that file is rendered.

### 3 — Simulating the full action environment

The action also injects `VITE_PAGE_TITLE` and `VITE_REPO_FULL_NAME` at build time:

```bash
REPO_ROOT=/path/to/project \
VITE_PAGE_TITLE="My Library" \
VITE_REPO_FULL_NAME="my-org/my-repo" \
npm run dev
```

### 4 — Production build

```bash
# Scan repo root (default)
npm run build

# Explicit root
REPO_ROOT=/path/to/project npm run build
```

The output is a single self-contained `dist/index.html` with all JS/CSS inlined.

### 5 — Preview the production build

```bash
npm run preview
```

Opens a local server pointing at `dist/`. Useful for verifying the final output before pushing.

## How the build pipeline works

```
Repository directory tree
  │
  ▼ (vite.config.ts, build time)
Walk REPO_ROOT → find all README.md files
  │
  ▼ (Shiki, per file)
Highlight fenced code blocks → HTML with CSS-variable colours
  │
  ▼ (vite define)
__README_MAP__ embedded as a JS constant (Record<dirKey, content>)
  │
  ▼ (React + hash routing)
#/ → root README, #/src → src/README.md, etc.
Relative links in markdown automatically rewritten to hash routes
Left sidebar shows the directory tree; right sidebar shows per-page TOC
  │
  ▼ (vite-plugin-singlefile)
All JS + CSS inlined → dist/index.html (single file, no external requests)
```

Key files:

| File | Role |
|------|------|
| `vite.config.ts` | Scans README files, runs Shiki, injects `__README_MAP__` |
| `src/App.tsx` | Layout shell — header, hero, left file tree, content, right TOC; hash routing |
| `src/components/markdown-renderer.tsx` | Renders markdown; intercepts relative README links for in-app navigation |
| `src/index.css` | Tailwind setup + Shiki dual-theme CSS variable rules |

## Multi-directory support

`vite.config.ts` walks `REPO_ROOT` recursively and collects every `README.md` it finds (hidden directories and `node_modules` are skipped). Each file is keyed by its parent directory path relative to `REPO_ROOT`:

| File | Key | Hash route |
|------|-----|-----------|
| `README.md` | `""` | `#/` |
| `src/README.md` | `"src"` | `#/src` |
| `src/utils/README.md` | `"src/utils"` | `#/src/utils` |

Relative links in each README are resolved against the file's own directory and rewritten to the corresponding hash route automatically. For example, a link `./src/README.md` in the root README becomes `#/src`.

When there is only one README (or when `README_PATH` single-file mode is used), the left sidebar is hidden and the layout stays exactly as before.

## Syntax highlighting (Shiki)

Code blocks are highlighted **at build time** inside `vite.config.ts` using [Shiki](https://shiki.matsu.io/). The output uses `defaultColor: false` so every `<span>` carries both `--shiki-light` and `--shiki-dark` CSS variables. The active theme is selected purely in CSS:

```css
/* light (default) */
.shiki span { color: var(--shiki-light) !important; }

/* dark */
.dark .shiki span { color: var(--shiki-dark) !important; }
```

To add a language, append it to the `langs` array in `vite.config.ts`:

```ts
langs: [
  // … existing entries …
  'swift',  // ← add here
],
```

## Making changes

1. Fork the repository and create a feature branch.
2. `cd document && npm install && npm run dev` to iterate locally.
3. Run `npm run build` and verify `dist/index.html` looks correct with `npm run preview`.
4. Open a pull request — CI will build the docs and run type-checks.

## Code style

- TypeScript strict mode is enabled (`tsconfig.app.json`).
- Tailwind utility classes are preferred over custom CSS.
- Keep the Vite config synchronous where possible; `await` at the top level is intentional for Shiki.
