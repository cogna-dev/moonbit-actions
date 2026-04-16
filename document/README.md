# document — Build MoonBit Documentation

A composite GitHub Action that scans all `README.md` files in your repository, highlights code with [Shiki](https://shiki.matsu.io/), and builds a polished multi-page documentation site as a collection of self-contained HTML files — one per README.

The output is optionally deployed to GitHub Pages.

## Usage

```yaml
- name: Build and deploy docs
  uses: cogna-dev/moonbit-actions/document@v0
  with:
    deploy: 'true'
```

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `repo-root` | No | `.` | Directory to scan for `README.md` files, relative to the repository root. All READMEs found are included and the folder hierarchy is preserved. |
| `title` | No | repo name | Page title shown in the browser tab. |
| `deploy` | No | `false` | Set to `'true'` to upload the built site as a GitHub Pages artifact and deploy it. |
| `readme-path` | No | — | _Deprecated._ Path to a single README file. When set, only that file is rendered (single-page mode). |

## Outputs

| Output | Description |
|--------|-------------|
| `dist-path` | Absolute path to the built documentation directory. |
| `page-url` | URL of the deployed GitHub Pages site (only set when `deploy: 'true'`). |

## What it does

1. Walks `repo-root` recursively to find all `README.md` files.
2. Processes each file with Shiki — fenced code blocks become pre-highlighted HTML
   using `github-light` / `github-dark` dual-theme CSS variables.
3. Builds a React + Vite site where each README becomes its own `index.html`:
   - Root `README.md` → `dist/index.html`
   - `setup/README.md` → `dist/setup/index.html`
   - `a/b/README.md` → `dist/a/b/index.html`
4. Relative links in markdown that point to another README are automatically
   rewritten to the correct relative HTML path.
5. Optionally uploads the `dist/` directory as a GitHub Pages artifact and deploys.

## Example workflow — deploy to GitHub Pages

```yaml
name: Deploy Docs

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.doc.outputs.page-url }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build and deploy docs
        id: doc
        uses: cogna-dev/moonbit-actions/document@v0
        with:
          deploy: 'true'
```

### Build only (no deploy)

```yaml
- name: Build docs
  id: doc
  uses: cogna-dev/moonbit-actions/document@v0

- name: Upload artifact
  uses: actions/upload-artifact@v4
  with:
    name: docs
    path: ${{ steps.doc.outputs.dist-path }}
```

### Scan a subdirectory only

```yaml
- uses: cogna-dev/moonbit-actions/document@v0
  with:
    repo-root: docs
    title: 'My Library Docs'
    deploy: 'true'
```

## Local development

See [CONTRIBUTING.md](../CONTRIBUTING.md) for full instructions on running the
Vite dev server locally, the build pipeline diagram, and how to extend Shiki
language support.

Quick start:

```bash
cd document
npm install
REPO_ROOT=.. npm run dev        # dev server at http://localhost:5173
REPO_ROOT=.. npm run build      # production build → dist/
```

## Permissions

When `deploy: 'true'` the calling workflow must have:

```yaml
permissions:
  pages: write
  id-token: write
```
