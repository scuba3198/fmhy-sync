# FMHY Bookmark Sync (Chrome/Brave Extension)

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-orange?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

An automated tool to sync the [FMHY starred bookmarks](https://github.com/fmhy/bookmarks) directly into your browser bookmarks bar, neatly categorized.

## Features
- **Categorized Folders**: Maintains original categories and subcategories from the source.
- **Auto-Update**: Automatically checks for updates every Monday at 9:00 AM (local time).
- **Manual Sync**: Instant sync button in the extension popup.
- **Type Safe**: Fully written in TypeScript for reliability.
- **Modern Pipeline**: Built with Vite + CRXJS for optimal performance and developer experience.
- **Privacy First**: Runs entirely in your browser; no data is sent to external servers.

## Installation
Since this is a TypeScript project, you need to build it before installing:
1.  Clone this repository.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Build the extension:
    ```bash
    npm run build
    ```
4.  Open Chrome (or Brave) and navigate to `chrome://extensions`.
5.  Enable **Developer mode** in the top right.
6.  Click **Load unpacked** and select the **`dist`** folder in the project root.

## Usage
- After installation, a new folder named **"FMHY Starred"** will appear in your Bookmarks Bar.
- You can manually trigger a sync by clicking the extension icon and selecting **Sync Now**.

## Technology Stack
- **TypeScript**: Core logic and type safety.
- **Vite + CRXJS**: Build system and extension bundling.
- **Chrome Alarms API**: Scheduled synchronization.
- **Chrome Offscreen API**: HTML parsing in a service worker environment.

## License
MIT
