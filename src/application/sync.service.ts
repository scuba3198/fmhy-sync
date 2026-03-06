import {
	ACTION_PARSE_BOOKMARKS,
	FOLDER_NAME,
	STATUS_ERROR_PREFIX,
	STATUS_SUCCESS,
	STATUS_SYNCING,
} from "@domain/constants";
import { ParseBookmarksResponse } from "@domain/offscreen.protocol";
import { Effect, Schema } from "effect";
import { Correlation, type CorrelationId, withCorrelationId } from "./correlation.service";
import { OffscreenInvalidResponseError, OffscreenParserError } from "./sync.errors";
import { BookmarksService } from "@infrastructure/bookmarks.service";
import type { BookmarksError } from "@infrastructure/bookmarks.errors";
import { ChromeOffscreenService } from "@infrastructure/chrome-offscreen.service";
import type { OffscreenError } from "@infrastructure/offscreen.errors";
import { HttpService } from "@infrastructure/http.service";
import type { FetchBookmarksError } from "@infrastructure/http.errors";
import { Logger } from "@infrastructure/logger.service";
import { StorageService } from "@infrastructure/storage.service";
import type { StorageError } from "@infrastructure/storage.errors";

/**
 * Service orchestration for the FMHY sync use case.
 * Why: Application layer to keep logic separated from infrastructure and presentation.
 */
export type SyncServiceError =
	| FetchBookmarksError
	| StorageError
	| BookmarksError
	| OffscreenError
	| OffscreenInvalidResponseError
	| OffscreenParserError;

export class SyncService extends Effect.Service<SyncService>()("SyncService", {
	accessors: true,
	dependencies: [
		Logger.Default,
		Correlation.Default,
		HttpService.Default,
		StorageService.Default,
		BookmarksService.Default,
		ChromeOffscreenService.Default,
	],
	effect: Effect.gen(function* () {
		const log = yield* Logger;
		const http = yield* HttpService;
		const storage = yield* StorageService;
		const bookmarks = yield* BookmarksService;
		const offscreen = yield* ChromeOffscreenService;

		const parseWithOffscreen = Effect.fn("SyncService.parseWithOffscreen")(
			(html: string, correlationId: CorrelationId) =>
				Effect.gen(function* () {
					yield* offscreen.ensureOffscreenDocument();

					yield* log.info("Sending message to offscreen document...");
					const response = yield* offscreen.sendMessage({
						action: ACTION_PARSE_BOOKMARKS,
						html,
						folderName: FOLDER_NAME,
						correlationId,
					});

					const decoded = yield* Schema.decodeUnknown(ParseBookmarksResponse)(response).pipe(
						Effect.catchTag(
							"ParseError",
							(err) =>
								new OffscreenInvalidResponseError({
									message: `Invalid offscreen response: ${String(err)}`,
								}),
						),
					);

					if (decoded._tag === "ParseFailure") {
						return yield* new OffscreenParserError({
							parserTag: decoded.error._tag,
							message: decoded.error.message,
						});
					}

					return decoded.tree;
				}),
		);

		const syncBookmarks = Effect.fn("SyncService.syncBookmarks")(function* () {
			const correlationId = yield* Correlation.makeNew();

			yield* withCorrelationId(
				correlationId,
				Effect.gen(function* () {
					yield* log.info("Starting FMHY bookmark sync...");
					yield* storage.updateStatus(STATUS_SYNCING);

					const html = yield* http.fetchBookmarksHtml();
					yield* log.info("Fetched bookmarks HTML", { htmlLength: html.length });

					const bookmarkTree = yield* parseWithOffscreen(html, correlationId);
					yield* log.info("Parsed bookmarks tree", { nodeCount: bookmarkTree.length });

					const rootId = yield* bookmarks.ensureRootFolder();
					const stats = yield* bookmarks.createTree(bookmarkTree, rootId);
					yield* log.info("Bookmarks updated", stats);

					const timestamp = new Date().toLocaleString();
					yield* storage.saveSyncSuccess(timestamp, STATUS_SUCCESS);
					yield* log.info("Sync complete successfully.");
				}).pipe(
					Effect.catchTags({
						FetchBookmarksNetworkError: (error) =>
							log
								.error("Sync failed while fetching bookmarks", { error })
								.pipe(
									Effect.andThen(storage.updateStatus(`${STATUS_ERROR_PREFIX}${error.message}`)),
								),
						FetchBookmarksHttpStatusError: (error) =>
							log
								.error("Sync failed due to HTTP status", { error })
								.pipe(
									Effect.andThen(storage.updateStatus(`${STATUS_ERROR_PREFIX}${error.message}`)),
								),
						StorageSetError: (error) =>
							log
								.error("Sync failed due to storage write error", { error })
								.pipe(
									Effect.andThen(storage.updateStatus(`${STATUS_ERROR_PREFIX}${error.message}`)),
								),
						BookmarksSearchError: (error) =>
							log
								.error("Sync failed due to bookmarks search error", { error })
								.pipe(
									Effect.andThen(storage.updateStatus(`${STATUS_ERROR_PREFIX}${error.message}`)),
								),
						BookmarksGetChildrenError: (error) =>
							log
								.error("Sync failed due to bookmarks getChildren error", { error })
								.pipe(
									Effect.andThen(storage.updateStatus(`${STATUS_ERROR_PREFIX}${error.message}`)),
								),
						BookmarksRemoveTreeError: (error) =>
							log
								.error("Sync failed due to bookmarks removeTree error", { error })
								.pipe(
									Effect.andThen(storage.updateStatus(`${STATUS_ERROR_PREFIX}${error.message}`)),
								),
						BookmarksCreateError: (error) =>
							log
								.error("Sync failed due to bookmarks create error", { error })
								.pipe(
									Effect.andThen(storage.updateStatus(`${STATUS_ERROR_PREFIX}${error.message}`)),
								),
						OffscreenGetContextsError: (error) =>
							log
								.error("Sync failed while checking offscreen contexts", { error })
								.pipe(
									Effect.andThen(storage.updateStatus(`${STATUS_ERROR_PREFIX}${error.message}`)),
								),
						OffscreenCreateDocumentError: (error) =>
							log
								.error("Sync failed while creating offscreen document", { error })
								.pipe(
									Effect.andThen(storage.updateStatus(`${STATUS_ERROR_PREFIX}${error.message}`)),
								),
						OffscreenSendMessageError: (error) =>
							log
								.error("Sync failed while sending offscreen message", { error })
								.pipe(
									Effect.andThen(storage.updateStatus(`${STATUS_ERROR_PREFIX}${error.message}`)),
								),
						OffscreenInvalidResponseError: (error) =>
							log
								.error("Sync failed due to invalid offscreen response", { error })
								.pipe(
									Effect.andThen(storage.updateStatus(`${STATUS_ERROR_PREFIX}${error.message}`)),
								),
						OffscreenParserError: (error) =>
							log
								.error("Sync failed due to offscreen parse error", { error })
								.pipe(
									Effect.andThen(
										storage.updateStatus(
											`${STATUS_ERROR_PREFIX}${error.parserTag}: ${error.message}`,
										),
									),
								),
					}),
				),
			);
		});

		return { syncBookmarks };
	}),
}) {}
