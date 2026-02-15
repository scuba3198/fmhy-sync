import { BookmarkNode, BookmarkFolder, ParseBookmarksRequest } from './types';
import { ACTION_PARSE_BOOKMARKS } from './constants';

/**
 * Listen for messages from the background script.
 */
chrome.runtime.onMessage.addListener((request: unknown, _sender, sendResponse) => {
    if (
        typeof request === 'object' &&
        request !== null &&
        'action' in request &&
        (request as { action: unknown }).action === ACTION_PARSE_BOOKMARKS
    ) {
        const req = request as ParseBookmarksRequest; // Now safe to cast
        const tree = parseNetscapeBookmarks(req.html, req.folderName);
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
        if (!(child instanceof HTMLElement)) continue;

        if (child.tagName === 'DT') {
            const h3 = child.querySelector('h3');
            const a = child.querySelector('a');
            const nestedDL = child.querySelector('dl');

            if (h3) {
                const folderName = h3.textContent.trim();

                // Skip placeholders like "/"
                if (folderName === '/') {
                    // ...
                    const nextSibling = child.nextElementSibling;
                    const siblingDL = (nextSibling?.tagName === 'DL') ? nextSibling : null;
                    const targetDL = nestedDL ?? siblingDL;

                    if (targetDL) {
                        processDL(targetDL, parentNode);
                    }
                    continue;
                }

                currentFolderNode = { title: folderName, children: [] };
                parentNode.children.push(currentFolderNode);

                // Check for nested DL inside DT or as next sibling
                const nextSibling = child.nextElementSibling;
                const siblingDL = (nextSibling?.tagName === 'DL') ? nextSibling : null;
                const targetDL = nestedDL ?? siblingDL;

                if (targetDL) {
                    processDL(targetDL, currentFolderNode);
                }
            } else if (a) {
                parentNode.children.push({
                    title: a.textContent.trim(),
                    url: a.href
                });
            }
        } else if (child.tagName === 'DL') {
            const prev = child.previousElementSibling;
            const prevH3 = prev ? prev.querySelector('h3') : null;

            if (!prevH3) {
                // Sometimes a DL appears without a preceding H3 (rare in Netscape but possible)
                processDL(child, parentNode);
            }
        }
    }
}
