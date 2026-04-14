# moonbit-actions

GitHub Actions for MoonBit Software Development Life-Cycle

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A collection of reusable GitHub Actions for building, publishing, and documenting [MoonBit](https://www.moonbitlang.com/) projects.

| Action | Description |
|--------|-------------|
| [`setup`](#setup) | Install and configure the MoonBit toolchain |
| [`publish`](#publish) | Publish a package to [mooncakes.io](https://mooncakes.io) |
| [`document`](#document) | Build your README into a single-page site and deploy to GitHub Pages |

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
        uses: cogna-dev/moonbit-actions/setup@v1

      - name: Build
        run: moon build

      - name: Test
        run: moon test
```

Pin to a specific version:

```yaml
- uses: cogna-dev/moonbit-actions/setup@v1
  with:
    version: v0.1.20250101
```

---

## `publish`

Publishes a MoonBit package to the [mooncakes.io](https://mooncakes.io) registry.

> **Prerequisite:** The MoonBit toolchain must be installed. Add the [`setup`](#setup) action in an earlier step.

### Inputs

| Name | Required | Default | Description |
|------|----------|---------|-------------|
| `token` | **Yes** | — | API token for mooncakes.io. Store as a repository secret. |
| `package-path` | No | `.` | Path to the directory containing `moon.pkg.json`. |

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
        uses: cogna-dev/moonbit-actions/setup@v1

      - name: Publish to mooncakes.io
        uses: cogna-dev/moonbit-actions/publish@v1
        with:
          token: ${{ secrets.MOONCAKES_TOKEN }}
```

For a mono-repo with multiple packages:

```yaml
- uses: cogna-dev/moonbit-actions/publish@v1
  with:
    token: ${{ secrets.MOONCAKES_TOKEN }}
    package-path: packages/my-lib
```

---

## `document`

Builds your `README.md` into a beautifully styled, single-file `index.html` using **Vite** and **Shadcn UI** (React + Tailwind CSS), then deploys it to **GitHub Pages**. All assets are inlined — no external requests at runtime.

Features:
- 📄 Full GitHub Flavored Markdown (GFM) support, including tables, task lists, and strikethrough
- 🎨 Syntax-highlighted code blocks
- 🌙 Dark / light mode toggle
- 🔗 Auto-generated sidebar navigation from headings
- 📦 Single self-contained `index.html` — easy to host anywhere

### Prerequisites

Your repository must have **GitHub Pages** enabled. Go to *Settings → Pages* and set the source to **GitHub Actions**.

The workflow also needs the following permissions:

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

### Outputs

| Name | Description |
|------|-------------|
| `page-url` | URL of the deployed GitHub Pages site. |

### Example

```yaml
# .github/workflows/docs.yml
name: Deploy Docs

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

# Only one concurrent deployment
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
        uses: cogna-dev/moonbit-actions/document@v1
        with:
          title: My MoonBit Library
```

---

## End-to-end example

The workflow below covers the full lifecycle: build → test → publish → document.

```yaml
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
        uses: cogna-dev/moonbit-actions/setup@v1

      - name: Build & Test
        run: |
          moon build
          moon test

      - name: Publish to mooncakes.io
        uses: cogna-dev/moonbit-actions/publish@v1
        with:
          token: ${{ secrets.MOONCAKES_TOKEN }}

      - name: Deploy docs to GitHub Pages
        id: doc
        uses: cogna-dev/moonbit-actions/document@v1
```

---

## License

[MIT](LICENSE) © cogna-dev
