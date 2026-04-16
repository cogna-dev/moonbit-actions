# moonbit-actions

GitHub Actions for MoonBit Software Development Life-Cycle

[![CI](https://github.com/cogna-dev/moonbit-actions/actions/workflows/ci.yml/badge.svg)](https://github.com/cogna-dev/moonbit-actions/actions/workflows/ci.yml)
[![Deploy Docs](https://github.com/cogna-dev/moonbit-actions/actions/workflows/docs.yml/badge.svg)](https://github.com/cogna-dev/moonbit-actions/actions/workflows/docs.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![MoonBit](https://img.shields.io/badge/language-MoonBit-orange)](https://www.moonbitlang.com/)

A collection of reusable GitHub Actions for building, publishing, and documenting [MoonBit](https://www.moonbitlang.com/) projects — covering the full Software Development Life-Cycle from CI to release to live documentation.

| Action | Description |
|--------|-------------|
| [`setup`](#setup) | Install the MoonBit toolchain on any runner OS |
| [`publish`](#publish) | Publish a package to [mooncakes.io](https://mooncakes.io) |
| [`document`](#document) | Build your README into a self-contained single-page site |

---

## `setup`

Installs the MoonBit toolchain (compiler, `moon` CLI, and standard library) and adds it to `PATH`. Works on **Linux**, **macOS**, and **Windows** runners.

### Inputs

| Name | Required | Default | Description |
|------|----------|---------|-------------|
| `version` | No | `latest` | MoonBit version to install, e.g. `v0.1.20250101`. |

### Example

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup MoonBit
        uses: cogna-dev/moonbit-actions/setup@v0

      - name: Check
        run: moon check

      - name: Format
        run: moon fmt --check

      - name: Build
        run: moon build

      - name: Test
        run: moon test
```

Pin to a specific version:

```yaml
- uses: cogna-dev/moonbit-actions/setup@v0
  with:
    version: v0.1.20250101
```

---

## `publish`

Publishes a MoonBit package to the [mooncakes.io](https://mooncakes.io) registry.

> **Prerequisite:** The MoonBit toolchain must be installed. Add the [`setup`](#setup) action in an earlier step.
> The action expects `token: ${{ secrets.MOONCAKES_TOKEN }}` where the secret is a base64-encoded credentials payload; it decodes and writes `~/.moon/credentials.json` before `moon whoami` and `moon publish`.

### Inputs

| Name | Required | Default | Description |
|------|----------|---------|-------------|
| `token` | **Yes** | — | API token for mooncakes.io. Store as a repository secret. |
| `package-path` | No | `.` | Path to the directory containing `moon.mod.json`. |

### Example

```yaml
# .github/workflows/publish.yml
name: Publish

on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup MoonBit
        uses: cogna-dev/moonbit-actions/setup@v0

      - name: Publish to mooncakes.io
        uses: cogna-dev/moonbit-actions/publish@v0
        with:
          token: ${{ secrets.MOONCAKES_TOKEN }}
```

For a mono-repo with multiple packages:

```yaml
- uses: cogna-dev/moonbit-actions/publish@v0
  with:
    token: ${{ secrets.MOONCAKES_TOKEN }}
    package-path: packages/my-lib
```

---

## `document`

Builds your `README.md` into a beautifully styled, single-file `index.html` using **Vite** and **Shadcn UI** (React + Tailwind CSS). All JS and CSS are inlined — no external requests at runtime. Optionally deploys the result to **GitHub Pages** or any other static host.

Features:
- 📄 Full GitHub Flavored Markdown (GFM) — tables, task lists, strikethrough, autolinks
- 🎨 Syntax-highlighted code blocks (60+ languages via highlight.js)
- 🌙 Dark / light mode toggle (respects system preference by default)
- 🔗 Auto-generated sidebar navigation from headings with scroll-spy
- 📦 Single self-contained `index.html` — deploy to any static host

### Prerequisites

To deploy to GitHub Pages, enable it in *Settings → Pages → Source: GitHub Actions*, and grant these workflow permissions:

```yaml
permissions:
  contents: read
  pages: write
  id-token: write
```

### Inputs

| Name | Required | Default | Description |
|------|----------|---------|-------------|
| `readme-path` | No | `README.md` | Path to the README, relative to the repo root. |
| `title` | No | repository name | Browser tab title. |
| `deploy` | No | `false` | Set to `'true'` to upload and deploy to GitHub Pages. |

### Outputs

| Name | Description |
|------|-------------|
| `dist-path` | Absolute path to the built `dist/` directory (contains `index.html`). |
| `page-url` | URL of the deployed GitHub Pages site (only set when `deploy: 'true'`). |

### Example — build only

Build the site and use the output artifact in a subsequent step (e.g., deploy to Cloudflare Pages, Netlify, or any host):

```yaml
# .github/workflows/docs.yml
name: Deploy Docs

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build docs
        id: doc
        uses: cogna-dev/moonbit-actions/document@v0
        with:
          title: My MoonBit Library
          # deploy defaults to 'false' — only build

      # The built index.html is at: ${{ steps.doc.outputs.dist-path }}/index.html
      # Use it with any deployment step, e.g.:
      - name: Deploy to Cloudflare Pages
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CF_API_TOKEN }}
          accountId: ${{ secrets.CF_ACCOUNT_ID }}
          command: pages deploy ${{ steps.doc.outputs.dist-path }} --project-name=my-lib
```

### Example — deploy to GitHub Pages

```yaml
# .github/workflows/docs.yml
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

      - name: Build and deploy to GitHub Pages
        id: doc
        uses: cogna-dev/moonbit-actions/document@v0
        with:
          deploy: 'true'
          title: My MoonBit Library
```

---

## Hello World example

A minimal MoonBit project is included under [`example/hello/`](example/hello/) to demonstrate the actions end-to-end.

**`example/hello/main/main.mbt`**

```moonbit
fn main {
  println("Hello, World!")
}
```

**`example/hello/moon.mod.json`**

```json
{
  "name": "your-org/hello",
  "version": "0.1.0",
  "license": "MIT"
}
```

**`example/hello/main/moon.pkg.json`**

```json
{
  "is-main": true,
  "import": []
}
```

---

## End-to-end release workflow

The workflow below covers the full lifecycle: check → build → test → publish → document.

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    tags:
      - 'v*'

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  release:
    environment:
      name: github-pages
      url: ${{ steps.doc.outputs.page-url }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup MoonBit
        uses: cogna-dev/moonbit-actions/setup@v0

      - name: Check / Format / Build / Test
        run: |
          moon check
          moon fmt --check
          moon build
          moon test

      - name: Publish to mooncakes.io
        uses: cogna-dev/moonbit-actions/publish@v0
        with:
          token: ${{ secrets.MOONCAKES_TOKEN }}

      - name: Deploy docs to GitHub Pages
        id: doc
        uses: cogna-dev/moonbit-actions/document@v0
        with:
          deploy: 'true'
```

---

## License

[MIT](LICENSE) © cogna-dev
