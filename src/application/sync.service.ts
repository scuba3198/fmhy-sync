import type { BookmarkNode } from "@domain/bookmark.domain";
import {
	ACTION_PARSE_BOOKMARKS,
	FOLDER_NAME,
	STATUS_ERROR_PREFIX,
	STATUS_SUCCESS,
	STATUS_SYNCING,
} from "@domain/constants";
import { bookmarkService } from "@infrastructure/bookmarks";
import { httpService } from "@infrastructure/http";
import { createScopedLogger } from "@infrastructure/logger";
import { storageService } from "@infrastructure/storage";
import { generateCorrelationId } from "./correlation";

/**
 * Service orchestration for the FMHY sync use case.
 * Why: Application layer to keep logic separated from infrastructure and presentation.
 */
export class SyncService {
	/**
	 * Main sync flow.
	 */
	async syncBookmarks(): Promise<void> {
		const correlationId = generateCorrelationId();
		const log = createScopedLogger(correlationId);

		log.info("Starting FMHY bookmark sync...");
		await storageService.updateStatus(STATUS_SYNCING);

		try {
			// 1. Fetch
			const html = await httpService.fetchBookmarksHtml();
			log.info({ htmlLength: html.length }, "Fetched bookmarks HTML");

			// 2. Parse (via offscreen)
			const bookmarkTree = await this.parseWithOffscreen(html, correlationId);
			log.info({ nodeCount: bookmarkTree.length }, "Parsed bookmarks tree");

			// 3. Update Bookmarks
			const rootId = await bookmarkService.ensureRootFolder();
			await bookmarkService.createTree(bookmarkTree, rootId);

			// 4. Success
			const timestamp = new Date().toLocaleString();
			await storageService.saveSyncSuccess(timestamp, STATUS_SUCCESS);
			log.info("Sync complete successfully.");
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			log.error({ error, correlationId }, "Sync failed");
			await storageService.updateStatus(`${STATUS_ERROR_PREFIX}${message}`);
		}
	}

	/**
	 * Triggers the offscreen document to parse the HTML.
	 */
	private async parseWithOffscreen(html: string, correlationId: string): Promise<BookmarkNode[]> {
		const log = createScopedLogger(correlationId);

		// Ensure offscreen document exists
		const contexts = await chrome.runtime.getContexts({
			contextTypes: ["OFFSCREEN_DOCUMENT"],
		});

		if (contexts.length === 0) {
			log.info("Creating offscreen document...");
			await chrome.offscreen.createDocument({
				url: "offscreen.html",
				reasons: ["DOM_PARSER" as chrome.offscreen.Reason],
				justification: "To parse the FMHY Netscape-formatted bookmark file.",
			});
		}

		log.info("Sending message to offscreen document...");
		const response = await chrome.runtime.sendMessage({
			action: ACTION_PARSE_BOOKMARKS,
			html: html,
			folderName: FOLDER_NAME,
			correlationId,
		});

		if (!response || !response.tree) {
			throw new Error("Failed to get response from offscreen parser");
		}

		return response.tree as BookmarkNode[];
	}
}

export const syncService = new SyncService();
