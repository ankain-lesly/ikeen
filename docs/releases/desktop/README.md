# iKeen Desktop Release & Packaging Guide

This document establishes the release requirements, CI/CD pipeline setup, signing secrets, and packaging workflows for `@repo/desktop` (`com.techforgelee.ikeen-desktop`), powered by **Tauri v2**, **Rust**, and **React 19**.

For general monorepo release policies, refer to [docs/releases/RELEASE_PROCESS.md](../RELEASE_PROCESS.md).

---

## 1. Supported Release Matrix & Targets

The automated release workflow ([`.github/workflows/desktop-release.yml`](../../../.github/workflows/desktop-release.yml)) produces native installers and signed updater bundles across 4 target platforms:

| Platform | Target Architecture | Runner OS | Output Bundles | In-App Updater Target |
| :--- | :--- | :--- | :--- | :--- |
| **Windows x64** | `x86_64-pc-windows-msvc` | `windows-latest` | NSIS (`.exe`), WiX (`.msi`) | `iKeen_0.1.0_x64-setup.exe.sig` |
| **macOS Apple Silicon** | `aarch64-apple-darwin` | `macos-latest` | DMG (`.dmg`), App Bundle (`.app`) | `iKeen.app.tar.gz.sig` |
| **macOS Intel** | `x86_64-apple-darwin` | `macos-13` | DMG (`.dmg`), App Bundle (`.app`) | `iKeen.app.tar.gz.sig` |
| **Linux x64** | `x86_64-unknown-linux-gnu` | `ubuntu-22.04` | Debian (`.deb`), AppImage (`.AppImage`) | `iKeen.AppImage.tar.gz.sig` |

---

## 2. GitHub Actions Setup & Requirements

### Required Secrets
Configure these in **GitHub Repository > Settings > Secrets and variables > Actions**:

| Secret Name | Required | Description & Source |
| :--- | :---: | :--- |
| `VITE_API_URL` | **Yes** (or Variable) | Production backend API base URL (e.g. `https://api.yourdomain.com/api/v1`). Injected at build time into desktop release bundles so no environment URLs are hardcoded in source. Can be set as an Action Secret or Variable. |
| `TAURI_SIGNING_PRIVATE_KEY` | **Yes** | The unencrypted Ed25519 private key generated via `tauri signer generate --ci`. Stored in local development at `apps/desktop/src-tauri/ikeen.key`. Used by `tauri-action` to sign release packages and generate cryptographic signatures (`.sig`). |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | No | Private key password. Leave unset or blank when using unencrypted CI keys generated with the `--ci` flag. |
| `APPLE_CERTIFICATE` | Optional | Base64-encoded `.p12` code-signing certificate for Apple Developer program. |
| `APPLE_CERTIFICATE_PASSWORD` | Optional | Password for the `.p12` certificate. |
| `APPLE_SIGNING_IDENTITY` | Optional | Developer ID Application identity (e.g. `Developer ID Application: Company (TEAM_ID)`). |
| `APPLE_ID` | Optional | Apple account email for notarization. |
| `APPLE_PASSWORD` | Optional | App-Specific Password generated on appleid.apple.com for `altool`/`notarytool`. |
| `APPLE_TEAM_ID` | Optional | 10-character Apple Developer Team ID. |

### Required Repository Permissions
1. Navigate to **Settings > Actions > General**.
2. Under **Workflow permissions**, select **"Read and write permissions"**.
3. Check **"Allow GitHub Actions to create and approve pull requests"**.
4. Click **Save**.

*Note: Without write permissions, `tauri-action` will fail when attempting to publish GitHub releases and upload `.exe`, `.msi`, `.dmg`, `.AppImage`, and `latest.json` assets.*

---

## 3. In-App Updater Architecture

The desktop application integrates `@tauri-apps/plugin-updater` v2. When a release is cut on GitHub, `tauri-action` automatically creates or updates `latest.json` on the release tag.

### Public Key Configuration
The updater public key is stored in [`apps/desktop/src-tauri/tauri.conf.json`](../../../apps/desktop/src-tauri/tauri.conf.json):
```json
"plugins": {
  "updater": {
    "pubkey": "dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHB1YmxpYyBrZXk6IEZGODVFNkYwQTg3Nzk4M0MKUldROG1IZW84T2FGLzUxdzVFOVdvYkhoUTkzTjE4V2ZmY2lndmRXeE1HMUJNWVY0R0NJMXRPanEK",
    "endpoints": [
      "https://github.com/ankain-lesly/ikeen/releases/latest/download/latest.json"
    ]
  }
}
```

### Manifest Format (`latest.json`)
The client polls this endpoint on startup or on demand via `useUpdater()` in Settings. An example manifest:
```json
{
  "version": "0.1.0",
  "notes": "Feature release notes",
  "pub_date": "2026-11-08T22:00:00Z",
  "platforms": {
    "windows-x86_64": {
      "signature": "dW50cnVzdGVkIGNvbW1lbnQ6IHNpZ25hdHVyZSBmcm9tIHRhdXJpIHNlY3JldCBrZXkK...",
      "url": "https://github.com/ankain-lesly/ikeen/releases/download/v0.1.0-desktop/iKeen_0.1.0_x64-setup.exe"
    }
  }
}
```

---

## 4. Cutting a Desktop Release

Coding agents and developers must strictly follow SemVer and annotated Git tagging standards:

### Step 1: Bump Version Metadata
Synchronize version strings in:
1. `apps/desktop/package.json` (`"version": "x.y.z"`)
2. `apps/desktop/src-tauri/tauri.conf.json` (`"version": "x.y.z"`)
3. `apps/desktop/src-tauri/Cargo.toml` (`version = "x.y.z"`)

### Step 2: Run Pre-Flight Quality Gates Locally
```bash
# 1. Typecheck desktop workspace
bun x tsc --noEmit -p apps/desktop/tsconfig.json

# 2. Verify frontend asset build
bun run --cwd apps/desktop build

# 3. Dry-run native packaging & signing
$env:TAURI_SIGNING_PRIVATE_KEY = (Get-Content apps/desktop/src-tauri/ikeen.key -Raw)
bun run package:desktop
```

### Step 3: Tag and Trigger the Workflow
Commit your version changes, then push an annotated tag:
```bash
git tag -a v0.1.0-desktop -m "Release v0.1.0 for Desktop"
git push origin v0.1.0-desktop
```

Or trigger manually:
- Open **GitHub Actions > Desktop Release**.
- Click **Run workflow**, enter `v0.1.0-desktop`, and submit.

---

## 5. Local Dry-Run Packaging Commands

To package without publishing to GitHub:

### Windows (PowerShell)
```powershell
$env:TAURI_SIGNING_PRIVATE_KEY = (Get-Content apps/desktop/src-tauri/ikeen.key -Raw)
bun run package:desktop
```
Artifacts output to `apps/desktop/src-tauri/target/release/bundle/`:
- `nsis/iKeen_<version>_x64-setup.exe` (~3.97 MB)
- `nsis/iKeen_<version>_x64-setup.exe.sig`
- `msi/iKeen_<version>_x64_en-US.msi` (~5.38 MB)
- `msi/iKeen_<version>_x64_en-US.msi.sig`

### macOS / Linux (Bash)
```bash
export TAURI_SIGNING_PRIVATE_KEY="$(cat apps/desktop/src-tauri/ikeen.key)"
bun run package:desktop
```
