import { Schema } from "effect";

export class OffscreenGetContextsError extends Schema.TaggedError<OffscreenGetContextsError>()(
	"OffscreenGetContextsError",
	{
		message: Schema.String,
		cause: Schema.optional(Schema.String),
	},
) {}

export class OffscreenCreateDocumentError extends Schema.TaggedError<OffscreenCreateDocumentError>()(
	"OffscreenCreateDocumentError",
	{
		message: Schema.String,
		cause: Schema.optional(Schema.String),
	},
) {}

export class OffscreenSendMessageError extends Schema.TaggedError<OffscreenSendMessageError>()(
	"OffscreenSendMessageError",
	{
		message: Schema.String,
		cause: Schema.optional(Schema.String),
	},
) {}

export type OffscreenError =
	| OffscreenGetContextsError
	| OffscreenCreateDocumentError
	| OffscreenSendMessageError;
