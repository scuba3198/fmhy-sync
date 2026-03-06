import { Effect } from "effect";
import { Logger } from "./logger.service";
import {
	OffscreenCreateDocumentError,
	OffscreenGetContextsError,
	OffscreenSendMessageError,
} from "./offscreen.errors";

export class ChromeOffscreenService extends Effect.Service<ChromeOffscreenService>()(
	"ChromeOffscreenService",
	{
		accessors: true,
		dependencies: [Logger.Default],
		effect: Effect.gen(function* () {
			const log = yield* Logger;

			const getOffscreenContexts = Effect.fn("ChromeOffscreenService.getOffscreenContexts")(() =>
				Effect.tryPromise({
					try: () =>
						chrome.runtime.getContexts({
							contextTypes: ["OFFSCREEN_DOCUMENT"],
						}),
					catch: (cause) =>
						new OffscreenGetContextsError({
							message: "Failed to list runtime contexts",
							cause: String(cause),
						}),
				}),
			);

			const ensureOffscreenDocument = Effect.fn("ChromeOffscreenService.ensureOffscreenDocument")(
				function* () {
					const contexts = yield* getOffscreenContexts();
					if (contexts.length > 0) return;

					yield* log.info("Creating offscreen document...");
					yield* Effect.tryPromise({
						try: () =>
							chrome.offscreen.createDocument({
								url: "offscreen.html",
								reasons: ["DOM_PARSER" as chrome.offscreen.Reason],
								justification: "To parse the FMHY Netscape-formatted bookmark file.",
							}),
						catch: (cause) =>
							new OffscreenCreateDocumentError({
								message: "Failed to create offscreen document",
								cause: String(cause),
							}),
					});
				},
			);

			const sendMessage = Effect.fn("ChromeOffscreenService.sendMessage")(
				(request: unknown): Effect.Effect<unknown, OffscreenSendMessageError> =>
					Effect.tryPromise({
						try: () => chrome.runtime.sendMessage(request),
						catch: (cause) =>
							new OffscreenSendMessageError({
								message: "Failed to send runtime message",
								cause: String(cause),
							}),
					}),
			);

			return { ensureOffscreenDocument, sendMessage };
		}),
	},
) {}
