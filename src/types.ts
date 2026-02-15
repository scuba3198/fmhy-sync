/**
 * A leaf bookmark with a URL.
 */
export interface BookmarkLeaf {
    /** The display name of the bookmark */
    readonly title: string;
    /** The destination URL */
    readonly url: string;
}

/**
 * A folder that contains children (folders or leaves).
 */
export interface BookmarkFolder {
    /** The name of the folder */
    readonly title: string;
    /** Ordered list of sub-nodes */
    readonly children: BookmarkNode[];
}

/**
 * Union type: a node is either a folder or a leaf.
 */
export type BookmarkNode = BookmarkFolder | BookmarkLeaf;

/**
 * Type guard: check if a BookmarkNode is a folder.
 * @param node The node to check.
 */
export function isBookmarkFolder(node: BookmarkNode): node is BookmarkFolder {
    return 'children' in (node as BookmarkFolder);
}

// ---- Chrome message payloads ----

/**
 * Message sent from background -> offscreen to request parsing.
 */
export interface ParseBookmarksRequest {
    readonly action: 'parseBookmarks';
    readonly html: string;
    readonly folderName: string;
}

/**
 * Response from offscreen -> background with parsed tree.
 */
export interface ParseBookmarksResponse {
    readonly tree: BookmarkNode[];
}

/**
 * Message sent from popup -> background to trigger manual sync.
 */
export interface SyncNowRequest {
    readonly action: 'syncNow';
}

/**
 * Response from background -> popup after sync completes.
 */
export interface SyncNowResponse {
    readonly success: boolean;
}

/**
 * Union of all possible messages.
 */
export type ExtensionMessage = ParseBookmarksRequest | SyncNowRequest;

// ---- Storage shapes ----

/**
 * Shape of data stored in chrome.storage.local.
 */
export interface SyncStorageData {
    /** Last successful sync timestamp (ISO or local locale string) */
    readonly lastSync?: string;
    /** Current status message or error */
    readonly status?: string;
    /** Number of bookmarks or category count */
    readonly count?: string;
}
