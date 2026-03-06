import { Schema } from "effect";

export class StorageGetError extends Schema.TaggedError<StorageGetError>()("StorageGetError", {
	message: Schema.String,
	cause: Schema.optional(Schema.String),
}) {}

export class StorageSetError extends Schema.TaggedError<StorageSetError>()("StorageSetError", {
	message: Schema.String,
	cause: Schema.optional(Schema.String),
}) {}

export class StorageDecodeError extends Schema.TaggedError<StorageDecodeError>()(
	"StorageDecodeError",
	{
		message: Schema.String,
	},
) {}

export type StorageError = StorageGetError | StorageSetError | StorageDecodeError;
