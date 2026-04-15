# Contributing to moonbit-actions

Thanks for your interest in contributing! This guide focuses on developing the **`document`** action, which is the most complex component — a full React/Vite app that produces a self-contained `index.html`.

## Repository layout

```
moonbit-actions/
├── document/          ← Vite + React app (this guide's focus)
│   ├── src/           ← React source (App.tsx, components/, …)
│   ├── vite.config.ts ← Build config + Shiki pre-processing
│   ├── package.json
│   └── action.yml     ← GitHub Actions composite action
├── setup/             ← Composite action (action.yml only)
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

The dev server reads the markdown file to render from the `README_PATH` environment variable (falls back to `../../README.md` relative to the `document/` directory, which resolves to the repo root `README.md`).

```bash
# Use the repo's own README (default)
npm run dev

# Use a custom README
README_PATH=/path/to/your/README.md npm run dev
```

Open <http://localhost:5173> in your browser. The page hot-reloads whenever you edit source files under `src/`.

> **Note:** `README_PATH` changes require a full Vite restart because the file is read once at config-load time and embedded as a compile-time constant via `vite.config.ts`.

### 3 — Simulating the full action environment

The action also injects `VITE_PAGE_TITLE` and `VITE_REPO_FULL_NAME` at build time:

```bash
README_PATH=/path/to/README.md \
VITE_PAGE_TITLE="My Library" \
VITE_REPO_FULL_NAME="my-org/my-repo" \
npm run dev
```

### 4 — Production build

```bash
# Default: resolves README from ../../README.md (repo root)
npm run build

# Explicit path
README_PATH=/path/to/README.md npm run build
```

The output is a single self-contained `dist/index.html` with all JS/CSS inlined.

### 5 — Preview the production build

```bash
npm run preview
```

Opens a local server pointing at `dist/`. Useful for verifying the final output before pushing.

## How the build pipeline works

```
README.md
  │
  ▼ (vite.config.ts, build time)
Shiki highlights fenced code blocks → raw HTML strings with CSS-variable colours
  │
  ▼ (vite define)
__README_CONTENT__ / __PAGE_TITLE__ / __REPO_FULL_NAME__ embedded as JS constants
  │
  ▼ (React + rehype-slug + rehype-raw)
Markdown rendered to DOM — Shiki <pre> blocks passed through as raw HTML
  │
  ▼ (vite-plugin-singlefile)
All JS + CSS inlined → dist/index.html (single file, no external requests)
```

Key files:

| File | Role |
|------|------|
| `vite.config.ts` | Reads README, runs Shiki at build time, injects constants |
| `src/App.tsx` | Layout shell — header, ASCII hero, content area, right-side TOC |
| `src/components/markdown-renderer.tsx` | Maps markdown AST nodes to styled React components |
| `src/index.css` | Tailwind setup + Shiki dual-theme CSS variable rules |

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
