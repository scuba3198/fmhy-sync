import { Schema } from "effect";

export class OffscreenInvalidResponseError extends Schema.TaggedError<OffscreenInvalidResponseError>()(
	"OffscreenInvalidResponseError",
	{
		message: Schema.String,
	},
) {}

export class OffscreenParserError extends Schema.TaggedError<OffscreenParserError>()(
	"OffscreenParserError",
	{
		parserTag: Schema.String,
		message: Schema.String,
	},
) {}
