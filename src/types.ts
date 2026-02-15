/** A leaf bookmark with a URL */
export interface BookmarkLeaf {
    title: string;
    url: string;
}

/** A folder that contains children (folders or leaves) */
export interface BookmarkFolder {
    title: string;
    children: BookmarkNode[];
}

/** Union type: a node is either a folder or a leaf */
export type BookmarkNode = BookmarkFolder | BookmarkLeaf;

/** Type guard: check if a BookmarkNode is a folder */
export function isBookmarkFolder(node: BookmarkNode): node is BookmarkFolder {
    return 'children' in node;
}

// ---- Chrome message payloads ----

/** Message sent from background -> offscreen to request parsing */
export interface ParseBookmarksRequest {
    action: 'parseBookmarks';
    html: string;
    folderName: string;
}

/** Response from offscreen -> background with parsed tree */
export interface ParseBookmarksResponse {
    tree: BookmarkNode[];
}

/** Message sent from popup -> background to trigger manual sync */
export interface SyncNowRequest {
    action: 'syncNow';
}

/** Response from background -> popup after sync completes */
export interface SyncNowResponse {
    success: boolean;
}

/** Union of all possible messages (for the listener discriminant) */
export type ExtensionMessage = ParseBookmarksRequest | SyncNowRequest;

// ---- Storage shapes ----

/** Shape of data stored in chrome.storage.local */
export interface SyncStorageData {
    lastSync?: string;
    status?: string;
    count?: string;
}
