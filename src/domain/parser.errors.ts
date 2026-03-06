import { Schema } from "effect";

export class BookmarksSchemaDecodeError extends Schema.TaggedError<BookmarksSchemaDecodeError>()(
	"BookmarksSchemaDecodeError",
	{
		message: Schema.String,
	},
) {}
