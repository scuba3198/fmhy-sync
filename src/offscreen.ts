import { BookmarkNode, BookmarkFolder, ParseBookmarksRequest } from './types';
import { ACTION_PARSE_BOOKMARKS } from './constants';

/**
 * Listen for messages from the background script.
 */
chrome.runtime.onMessage.addListener((request: ParseBookmarksRequest, _sender, sendResponse) => {
    if (request.action === ACTION_PARSE_BOOKMARKS) {
        const tree = parseNetscapeBookmarks(request.html, request.folderName);
        sendResponse({ tree });
    }
    return false; // Synchronous response
});

function parseNetscapeBookmarks(html: string, folderName: string): BookmarkNode[] {
    const root: BookmarkFolder = { title: folderName, children: [] };
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const dl = doc.querySelector('dl');
    if (dl) {
        processDL(dl, root);
    }

    return root.children;
}

function processDL(dlElement: Element, parentNode: BookmarkFolder): void {
    // Use a more robust approach: iterate through all children (DT, DL, P)
    // and maintain state about the current folder.
    const children = Array.from(dlElement.children);
    let currentFolderNode: BookmarkFolder | null = null;

    for (const child of children) {
        if (child.tagName === 'DT') {
            const h3 = child.querySelector('h3');
            const a = child.querySelector('a') as HTMLAnchorElement | null;
            const nestedDL = child.querySelector('dl');

            if (h3) {
                const folderName = h3.textContent?.trim() || '';

                // Skip placeholders like "/"
                if (folderName === '/') {
                    // If there's a DL inside this DT or a sibling DL, process it into the parent
                    const targetDL = nestedDL || (child.nextElementSibling && child.nextElementSibling.tagName === 'DL' ? child.nextElementSibling : null);
                    if (targetDL) {
                        processDL(targetDL, parentNode);
                    }
                    continue;
                }

                currentFolderNode = { title: folderName, children: [] };
                parentNode.children.push(currentFolderNode);

                // Check for nested DL inside DT or as next sibling
                const targetDL = nestedDL || (child.nextElementSibling && child.nextElementSibling.tagName === 'DL' ? child.nextElementSibling : null);
                if (targetDL) {
                    processDL(targetDL, currentFolderNode);
                }
            } else if (a) {
                parentNode.children.push({
                    title: a.textContent?.trim() || '',
                    url: a.href
                });
            }
        } else if (child.tagName === 'DL' && !child.previousElementSibling?.querySelector('h3')) {
            // Sometimes a DL appears without a preceding H3 (rare in Netscape but possible)
            processDL(child, parentNode);
        }
    }
}
