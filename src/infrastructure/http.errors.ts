import { Schema } from "effect";

export class FetchBookmarksNetworkError extends Schema.TaggedError<FetchBookmarksNetworkError>()(
	"FetchBookmarksNetworkError",
	{
		message: Schema.String,
		cause: Schema.optional(Schema.String),
	},
) {}

export class FetchBookmarksHttpStatusError extends Schema.TaggedError<FetchBookmarksHttpStatusError>()(
	"FetchBookmarksHttpStatusError",
	{
		status: Schema.Number,
		message: Schema.String,
	},
) {}

export type FetchBookmarksError = FetchBookmarksNetworkError | FetchBookmarksHttpStatusError;
