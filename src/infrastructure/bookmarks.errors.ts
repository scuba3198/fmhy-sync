import { Schema } from "effect";

export class BookmarksSearchError extends Schema.TaggedError<BookmarksSearchError>()(
	"BookmarksSearchError",
	{
		message: Schema.String,
		cause: Schema.optional(Schema.String),
	},
) {}

export class BookmarksGetChildrenError extends Schema.TaggedError<BookmarksGetChildrenError>()(
	"BookmarksGetChildrenError",
	{
		message: Schema.String,
		cause: Schema.optional(Schema.String),
	},
) {}

export class BookmarksRemoveTreeError extends Schema.TaggedError<BookmarksRemoveTreeError>()(
	"BookmarksRemoveTreeError",
	{
		message: Schema.String,
		cause: Schema.optional(Schema.String),
	},
) {}

export class BookmarksCreateError extends Schema.TaggedError<BookmarksCreateError>()(
	"BookmarksCreateError",
	{
		message: Schema.String,
		cause: Schema.optional(Schema.String),
	},
) {}

export type BookmarksError =
	| BookmarksSearchError
	| BookmarksGetChildrenError
	| BookmarksRemoveTreeError
	| BookmarksCreateError;
