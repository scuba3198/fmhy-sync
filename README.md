# FMHY Sync

FMHY Sync is a local-only Manifest V3 Chromium extension that downloads FMHY’s public starred-bookmark export and rebuilds it under `FMHY Starred` in the bookmarks bar.

## Install

### From a release

1. Download the latest `fmhy-sync-v*.zip` from [GitHub Releases](https://github.com/scuba3198/fmhy-sync/releases).
2. Extract the ZIP to a folder.
3. Open `chrome://extensions` (or the equivalent page in another Chromium browser).
4. Enable **Developer mode**, choose **Load unpacked**, and select the extracted folder containing `manifest.json`.

### From source

```bash
npm ci
npm run build
```

Then load the generated `dist` folder as an unpacked extension.

## Features

- Manual **Sync bookmarks** action in the popup.
- Automatic sync after installation and every Monday morning.
- Staged bookmark rebuilds that keep the existing `FMHY Starred` folder safe if a write fails.
- Preserves the folder’s position on the bookmarks bar when syncing.
- Contextual error logging in the service worker console.
- No account, analytics, or upload service; the export is fetched directly by the browser.

## Development

Requires Node.js 18 or newer.

```bash
npm ci
npm test
npm run build
```

The build output is written to `dist/`. The test suite covers export parsing, Unicode folder names, staged bookmark writes, folder-position preservation, and interrupted-sync recovery.

The extension requests only `bookmarks`, `storage`, and `alarms` permissions, plus access to the public FMHY export at `raw.githubusercontent.com`.
