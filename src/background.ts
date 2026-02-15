import { BookmarkNode, isBookmarkFolder, ParseBookmarksRequest, ParseBookmarksResponse, SyncNowRequest, SyncNowResponse } from './types';

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

async function syncBookmarks(): Promise<void> {
    console.log('Starting FMHY bookmark sync via Offscreen API...');
    updateStatus('Syncing...');

    try {
        const response = await fetch(FMHY_URL);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const html = await response.text();

        // Use Offscreen Document to parse HTML since DOMParser is missing in Service Workers
        const bookmarkTree = await parseWithOffscreen(html);
        console.log('Parsed bookmark tree.');

        await updateBookmarkFolder(bookmarkTree);

        const timestamp = new Date().toLocaleString();
        chrome.storage.local.set({
            lastSync: timestamp,
            status: 'Success',
            count: 'Categorized'
        });
        console.log('Sync complete.');
    } catch (error: any) {
        console.error('Sync failed:', error);
        chrome.storage.local.set({
            status: 'Error: ' + error.message
        });
    }
}

async function parseWithOffscreen(html: string): Promise<BookmarkNode[]> {
    // Check if offscreen document already exists
    const contexts = await (chrome.runtime as any).getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT']
    });

    if (contexts.length === 0) {
        await chrome.offscreen.createDocument({
            url: 'offscreen.html',
            reasons: ['DOM_PARSER' as any],
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
chrome.runtime.onMessage.addListener((request: any, sender, sendResponse: (response: SyncNowResponse) => void) => {
    if (request.action === 'syncNow') {
        syncBookmarks().then(() => sendResponse({ success: true }));
        return true; // Keep channel open for async response
    }
});
