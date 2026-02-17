import type { BookmarkNode } from "@domain/bookmark.domain";
import { isBookmarkFolder } from "@domain/bookmark.domain";
import { FOLDER_NAME } from "@domain/constants";
import { logger } from "./logger";

/**
 * Infrastructure wrapper for chrome.bookmarks API.
 * Why: Encapsulate Chrome-specific bookmark operations.
 */
export class BookmarkService {
	/**
	 * Finds or creates the root folder for the extension.
	 */
	async ensureRootFolder(): Promise<string> {
		try {
			const nodes = await chrome.bookmarks.search({ title: FOLDER_NAME });
			const existingFolder = nodes.find((n) => !n.url);

			if (existingFolder) {
				// Clear existing content
				const children = await chrome.bookmarks.getChildren(existingFolder.id);
				for (const child of children) {
					await chrome.bookmarks.removeTree(child.id);
				}
				return existingFolder.id;
			}

			const createdFolder = await chrome.bookmarks.create({
				parentId: "1", // Bookmarks Bar
				title: FOLDER_NAME,
			});
			return createdFolder.id;
		} catch (error) {
			logger.error({ error }, "Failed to ensure root bookmark folder");
			throw error;
		}
	}

	/**
	 * Recursively creates a bookmark tree starting from a parent ID.
	 */
	async createTree(nodes: BookmarkNode[], parentId: string): Promise<void> {
		for (const node of nodes) {
			try {
				if (isBookmarkFolder(node)) {
					const folder = await chrome.bookmarks.create({
						parentId: parentId,
						title: node.title,
					});
					await this.createTree(node.children, folder.id);
				} else {
					await chrome.bookmarks.create({
						parentId: parentId,
						title: node.title,
						url: node.url,
					});
				}
			} catch (error) {
				logger.warn({ error, node }, "Failed to create bookmark node");
				// Continue with other nodes instead of failing the whole sync
			}
		}
	}
}

export const bookmarkService = new BookmarkService();
