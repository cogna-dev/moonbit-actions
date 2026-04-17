# build — Build a MoonBit Package

A composite GitHub Action that installs MoonBit and runs `moon build` for your package.

## Usage

```yaml
- name: Build package (native target)
  uses: cogna-dev/moonbit-actions/build@v0
  with:
    package-path: example/hello
```

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `version` | No | `latest` | MoonBit version to install. Accepts `"latest"` or a specific version tag such as `"v0.1.20250101"`. |
| `package-path` | No | `.` | Path to the package directory to build. |
| `target` | No | `native` | Build target passed to `moon build --target`. |

## Example workflow (OS/Arch matrix, native target)

```yaml
name: Native Build Matrix

on: [push, pull_request]

jobs:
  build-native:
    strategy:
      fail-fast: false
      matrix:
        include:
          - os: linux
            arch: x86_64
            runner: ubuntu-24.04
          - os: linux
            arch: aarch64
            runner: ubuntu-24.04-arm
          - os: darwin
            arch: x86_64
            runner: macos-13
          - os: darwin
            arch: aarch64
            runner: macos-14
          - os: windows
            arch: x86_64
            runner: windows-2022
          - os: windows
            arch: aarch64
            runner: windows-11-arm
    runs-on: ${{ matrix.runner }}
    steps:
      - uses: actions/checkout@v4
      - name: Build native (${{ matrix.os }}/${{ matrix.arch }})
        uses: cogna-dev/moonbit-actions/build@v0
        with:
          package-path: example/hello
          target: native
```
