import { ACTION_PARSE_BOOKMARKS } from "@domain/constants";
import { parseNetscapeBookmarks } from "@domain/parser.logic";
import { createScopedLogger } from "@infrastructure/logger";

/**
 * Offscreen document logic.
 * Why: Presentation layer for DOM access in a Service Worker environment.
 */

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
	if (request && typeof request === "object" && request.action === ACTION_PARSE_BOOKMARKS) {
		const correlationId = request.correlationId ?? "unknown";
		const log = createScopedLogger(correlationId);

		log.info("Starting parsing in offscreen document.");

		try {
			const parser = new DOMParser();
			const tree = parseNetscapeBookmarks(request.html, request.folderName, parser);
			log.info({ nodeCount: tree.length }, "Parsing complete in offscreen document.");
			sendResponse({ tree });
		} catch (error) {
			log.error({ error }, "Parsing failed in offscreen document.");
			sendResponse({ error: String(error) });
		}
	}
	return false;
});
