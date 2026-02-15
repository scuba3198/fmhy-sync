import { BookmarkNode, isBookmarkFolder, ParseBookmarksResponse, SyncNowResponse } from './types';

const FMHY_URL = 'https://raw.githubusercontent.com/fmhy/bookmarks/main/fmhy_in_bookmarks_starred_only.html';
const FOLDER_NAME = 'FMHY Starred';

// Schedule sync for every Monday at 9:00 AM
chrome.runtime.onInstalled.addListener(() => {
    setupAlarm();
    syncBookmarks(); // Initial sync on install
});

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'weekly-sync') {
        syncBookmarks();
    }
});

function setupAlarm(): void {
    const now = new Date();
    const nextMonday = new Date();

    // Day 1 is Monday. 0 is Sunday.
    const day = now.getDay();
    const daysUntilMonday = (1 + 7 - day) % 7;

    nextMonday.setDate(now.getDate() + (daysUntilMonday === 0 ? 7 : daysUntilMonday));
    nextMonday.setHours(9, 0, 0, 0);

    console.log(`Scheduling next sync for: ${nextMonday}`);

    chrome.alarms.create('weekly-sync', {
        when: nextMonday.getTime(),
        periodInMinutes: 7 * 24 * 60 // 1 week
    });
}

/**
 * Main entry point for synchronizing bookmarks from the remote source.
 * Fetches HTML, parses it via an offscreen document, and updates the local bookmark tree.
 */
async function syncBookmarks(): Promise<void> {
    console.log('Starting FMHY bookmark sync...');
    updateStatus('Syncing...');

    try {
        const html = await fetchFMHYBookmarks();
        const bookmarkTree = await parseWithOffscreen(html);

        await updateBookmarkFolder(bookmarkTree);
        await saveSyncSuccess();

        console.log('Sync complete.');
    } catch (error) {
        handleSyncError(error);
    }
}

/**
 * Fetches the raw HTML from the FMHY GitHub repository.
 */
async function fetchFMHYBookmarks(): Promise<string> {
    const response = await fetch(FMHY_URL);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.text();
}

/**
 * Handles errors during the sync process.
 */
function handleSyncError(error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Sync failed:', message);
    chrome.storage.local.set({
        status: `Error: ${message}`
    });
}

/**
 * Saves the successful sync state to storage.
 */
async function saveSyncSuccess(): Promise<void> {
    const timestamp = new Date().toLocaleString();
    await chrome.storage.local.set({
        lastSync: timestamp,
        status: 'Success',
        count: 'Categorized'
    });
}

/**
 * Leverages the Offscreen API to parse HTML content using DOMParser.
 * Passes the heavy lifting to an offscreen document since Service Workers lack DOM access.
 */
async function parseWithOffscreen(html: string): Promise<BookmarkNode[]> {
    // Check if offscreen document already exists
    const contexts = await chrome.runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT']
    });

    if (contexts.length === 0) {
        await chrome.offscreen.createDocument({
            url: 'offscreen.html',
            reasons: ['DOM_PARSER'],
            justification: 'To parse the FMHY Netscape-formatted bookmark file.'
        });
    }

    const result = await (chrome.runtime.sendMessage({
        action: 'parseBookmarks',
        html: html,
        folderName: FOLDER_NAME
    }) as Promise<ParseBookmarksResponse>);

    return result.tree;
}

async function updateBookmarkFolder(bookmarkTree: BookmarkNode[]): Promise<void> {
    // 1. Find or create the root FMHY folder
    let rootFolderId: string;
    const nodes = await chrome.bookmarks.search({ title: FOLDER_NAME });
    const existingFolder = nodes.find(n => !n.url);

    if (existingFolder) {
        rootFolderId = existingFolder.id;
        // Clear existing content
        const children = await chrome.bookmarks.getChildren(rootFolderId);
        for (const child of children) {
            await chrome.bookmarks.removeTree(child.id);
        }
    } else {
        const createdFolder = await chrome.bookmarks.create({
            parentId: '1', // Bookmarks Bar
            title: FOLDER_NAME
        });
        rootFolderId = createdFolder.id;
    }

    // 2. Recursively create the tree
    await createBookmarkTree(bookmarkTree, rootFolderId);
}

async function createBookmarkTree(nodes: BookmarkNode[], parentId: string): Promise<void> {
    for (const node of nodes) {
        if (isBookmarkFolder(node)) {
            // Create folder
            const folder = await chrome.bookmarks.create({
                parentId: parentId,
                title: node.title
            });
            // Recurse
            await createBookmarkTree(node.children, folder.id);
        } else {
            // Create bookmark
            await chrome.bookmarks.create({
                parentId: parentId,
                title: node.title,
                url: node.url
            });
        }
    }
}

function updateStatus(status: string): void {
    chrome.storage.local.set({ status });
}

// Allow manual trigger from popup
chrome.runtime.onMessage.addListener((request: any, _sender, sendResponse: (response: SyncNowResponse) => void) => {
    if (request.action === 'syncNow') {
        syncBookmarks().then(() => sendResponse({ success: true }));
        return true; // Keep channel open for async response
    }
    return false;
});
