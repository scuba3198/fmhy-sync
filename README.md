# FMHY Sync

FMHY Sync is a browser extension that automatically synchronizes the [FMHY starred bookmarks](https://github.com/fmhy/bookmarks) directly into your browser's bookmarks bar. It keeps your bookmarks neatly organized, categorized, and up-to-date.

## 🚀 Features

- **Automated Syncing**: Fetches the latest FMHY bookmarks daily (or manually on demand).
- **Auto-Organization**: Automatically creates and updates folders to match the FMHY structure.
- **Privacy First**: Runs entirely in your browser with no external tracking.
- **Clean UI**: Simple popup to monitor sync status and last update time.

## 🛠️ Installation

### Option 1: Load Unpacked (For Developers/Manual Install)
1. Download this repository as a ZIP and extract it.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** in the top right corner.
4. Click **Load unpacked** and select the `dist` folder from the extracted files.

### Option 2: Github Releases
1. Go to the [Releases](https://github.com/scuba3198/fmhy-sync/releases) page.
2. Download the latest `fmhy-sync-v*.zip` file.
3. Follow the steps in Option 1 to load the extension.

## 📖 Usage

- After installation, the extension will automatically perform its first sync.
- You can find the FMHY folder in your **Bookmarks Bar**.
- Click the extension icon in the toolbar to see the status or manually trigger a sync by clicking the **Sync Now** button.

---

## 💻 Contribution & Development

If you'd like to contribute or build from source, follow these steps:

### Technical Architecture
The project follows a strictly typed **Hexagonal Architecture**:
- `domain/`: Pure business logic and data validation (Zod).
- `infrastructure/`: Browser API wrappers and logging (Pino).
- `application/`: Service orchestration and request tracing.
- `presentation/`: Extension entry points (Popup, Background, Offscreen).

### Scripts Guide
- `npm run build`: Generates the production bundle in the `dist` folder.
- `npm run dev`: Build and watch for changes.
- `npm run check`: Run the full verification suite (Lint, Type-Check, Test).
- `npm run test`: Run unit tests with Vitest.
