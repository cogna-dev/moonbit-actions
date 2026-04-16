# publish — Publish a MoonBit Package

A composite GitHub Action that publishes a MoonBit package to the [mooncakes.io](https://mooncakes.io) registry.

## Usage

```yaml
- name: Publish to mooncakes.io
  uses: cogna-dev/moonbit-actions/publish@v0
  with:
    token: ${{ secrets.MOONCAKES_TOKEN }}
```

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `token` | **Yes** | — | API token for mooncakes.io. Store it as a repository secret. |
| `package-path` | No | `.` | Path to the directory containing `moon.pkg`. |
| `dry-run` | No | `false` | If `true`, runs `moon publish --dry-run` instead of publishing. |

## What it does

1. Authenticates with `moon login --token <token>`.
2. Runs `moon publish` in the specified package directory.

## Setup

1. Create a mooncakes.io account at <https://mooncakes.io>.
2. Generate an API token from your account settings.
3. Add the token as a repository secret named `MOONCAKES_TOKEN`:
   - Go to **Settings → Secrets and variables → Actions → New repository secret**.

## Example workflow

```yaml
name: Publish

on:
  push:
    tags: ['v*']

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup MoonBit
        uses: cogna-dev/moonbit-actions/setup@v0

      - name: Publish package
        uses: cogna-dev/moonbit-actions/publish@v0
        with:
          token: ${{ secrets.MOONCAKES_TOKEN }}
```

### Publishing a package in a subdirectory

```yaml
- uses: cogna-dev/moonbit-actions/publish@v0
  with:
    token: ${{ secrets.MOONCAKES_TOKEN }}
    package-path: packages/my-lib
```

### Publish on every push (ignore version conflicts)

If you want to attempt publishing on every push without failing the workflow when
the version already exists, wrap the step with `continue-on-error: true`:

```yaml
- uses: cogna-dev/moonbit-actions/publish@v0
  continue-on-error: true
  with:
    token: ${{ secrets.MOONCAKES_TOKEN }}
```

### Validate publish without releasing

```yaml
- uses: cogna-dev/moonbit-actions/publish@v0
  with:
    token: ${{ secrets.MOONCAKES_TOKEN }}
    dry-run: 'true'
```

## Permissions

No special GitHub permissions required. The action only communicates with mooncakes.io using the provided API token.
