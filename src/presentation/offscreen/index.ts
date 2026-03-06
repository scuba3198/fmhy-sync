import { ACTION_PARSE_BOOKMARKS } from "@domain/constants";
import { ParseBookmarksRequest } from "@domain/offscreen.protocol";
import { BookmarksSchemaDecodeError } from "@domain/parser.errors";
import { parseNetscapeBookmarks } from "@domain/parser.logic";
import { type CorrelationId, withCorrelationId } from "@application/correlation.service";
import { Logger } from "@infrastructure/logger.service";
import { Effect, Either, ManagedRuntime, Schema } from "effect";
import { OffscreenLive } from "../layers";

/**
 * Offscreen document logic.
 * Why: Presentation layer for DOM access in a Service Worker environment.
 */

const runtime = ManagedRuntime.make(OffscreenLive);

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
	if (request && typeof request === "object" && request.action === ACTION_PARSE_BOOKMARKS) {
		const decoded = Schema.decodeUnknownEither(ParseBookmarksRequest)(request);
		if (Either.isLeft(decoded)) {
			sendResponse({
				_tag: "ParseFailure",
				error: { _tag: "ParseError", message: String(decoded.left) },
			});
			return false;
		}

		const program = Effect.gen(function* () {
			const correlationId = (decoded.right.correlationId ?? "unknown") as CorrelationId;

			yield* withCorrelationId(
				correlationId,
				Effect.gen(function* () {
					const log = yield* Logger;

					yield* log.info("Starting parsing in offscreen document.");

					const result = yield* parseNetscapeBookmarks(
						decoded.right.html,
						decoded.right.folderName,
						new DOMParser(),
					).pipe(Effect.either);

					if (Either.isLeft(result)) {
						const error: BookmarksSchemaDecodeError = result.left;
						yield* log.error("Parsing failed in offscreen document.", { error });
						yield* Effect.sync(() =>
							sendResponse({
								_tag: "ParseFailure",
								error: { _tag: error._tag, message: error.message },
							}),
						);
						return;
					}

					const tree = result.right;
					yield* log.info("Parsing complete in offscreen document.", { nodeCount: tree.length });
					yield* Effect.sync(() => sendResponse({ _tag: "ParseSuccess", tree }));
				}),
			);
		});

		void runtime.runPromise(program);
		return true;
	}
	return false;
});
