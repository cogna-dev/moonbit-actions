# setup — Install MoonBit

A composite GitHub Action that installs and configures the [MoonBit](https://www.moonbitlang.com/) toolchain on any runner OS (Linux, macOS, Windows).

## Usage

```yaml
- name: Setup MoonBit
  uses: cogna-dev/moonbit-actions/setup@v0
```

### Pin to a specific version

```yaml
- name: Setup MoonBit
  uses: cogna-dev/moonbit-actions/setup@v0
  with:
    version: 'v0.1.20250101'
```

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `version` | No | `latest` | MoonBit version to install. Accepts `"latest"` or a specific tag such as `"v0.1.20250101"`. |

## What it does

1. **Linux / macOS** — downloads and runs the official shell installer (`https://cli.moonbitlang.com/install/unix.sh`) then adds `~/.moon/bin` to `GITHUB_PATH`.
2. **Windows** — downloads and runs the PowerShell installer (`https://cli.moonbitlang.com/install/win.ps1`) then adds `%USERPROFILE%\.moon\bin` to `GITHUB_PATH`.
3. Runs `moon version` to verify the installation.

After this step runs, the `moon` CLI is available in all subsequent steps.

## Example workflow

```yaml
name: CI

on: [push, pull_request]

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup MoonBit
        uses: cogna-dev/moonbit-actions/setup@v0

      - run: moon check
      - run: moon fmt --check
      - run: moon build
      - run: moon test
```

### Matrix build (multiple OS)

```yaml
jobs:
  ci:
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: cogna-dev/moonbit-actions/setup@v0
      - run: moon build
```

## Permissions

No special permissions required. This action only modifies the runner's `PATH`.
