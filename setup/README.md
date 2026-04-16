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

For the current runner OS, it:

1. Installs MoonBit using the official installer script (`unix.sh` on Linux/macOS, `win.ps1` on Windows).
2. Adds the MoonBit binary directory to `GITHUB_PATH`.
3. Runs `moon update` to refresh MoonBit packages.
4. Runs `moon version` to verify the installation.

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
