import { Effect } from "effect";
import { FMHY_URL } from "@domain/constants";
import { Logger } from "./logger.service";
import {
	FetchBookmarksHttpStatusError,
	FetchBookmarksNetworkError,
	type FetchBookmarksError,
} from "./http.errors";

export class HttpService extends Effect.Service<HttpService>()("HttpService", {
	accessors: true,
	dependencies: [Logger.Default],
	effect: Effect.gen(function* () {
		const log = yield* Logger;

		const fetchBookmarksHtml = Effect.fn("HttpService.fetchBookmarksHtml")(function* () {
			yield* log.info("Fetching FMHY bookmarks HTML", { url: FMHY_URL });

			const response = yield* Effect.tryPromise({
				try: () => fetch(FMHY_URL),
				catch: (cause) =>
					new FetchBookmarksNetworkError({
						message: "Failed to fetch FMHY bookmarks HTML",
						cause: String(cause),
					}),
			});

			if (!response.ok) {
				return yield* new FetchBookmarksHttpStatusError({
					status: response.status,
					message: `HTTP error! status: ${response.status.toString()}`,
				});
			}

			return yield* Effect.tryPromise({
				try: () => response.text(),
				catch: (cause) =>
					new FetchBookmarksNetworkError({
						message: "Failed to read FMHY bookmarks response body",
						cause: String(cause),
					}),
			});
		});

		return { fetchBookmarksHtml };
	}),
}) {}

export type HttpServiceError = FetchBookmarksError;
