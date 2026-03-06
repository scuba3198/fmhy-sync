import { Schema } from "effect";
import { ACTION_PARSE_BOOKMARKS } from "./constants";
import { BookmarkNodeSchema } from "./bookmark.domain";

export const ParseBookmarksRequest = Schema.Struct({
	action: Schema.Literal(ACTION_PARSE_BOOKMARKS),
	html: Schema.String,
	folderName: Schema.String,
	correlationId: Schema.optional(Schema.String),
});
export type ParseBookmarksRequest = Schema.Schema.Type<typeof ParseBookmarksRequest>;

export const OffscreenParserErrorPayload = Schema.Struct({
	_tag: Schema.String,
	message: Schema.String,
});
export type OffscreenParserErrorPayload = Schema.Schema.Type<typeof OffscreenParserErrorPayload>;

export const ParseBookmarksSuccess = Schema.TaggedStruct("ParseSuccess", {
	tree: Schema.Array(BookmarkNodeSchema),
});
export type ParseBookmarksSuccess = Schema.Schema.Type<typeof ParseBookmarksSuccess>;

export const ParseBookmarksFailure = Schema.TaggedStruct("ParseFailure", {
	error: OffscreenParserErrorPayload,
});
export type ParseBookmarksFailure = Schema.Schema.Type<typeof ParseBookmarksFailure>;

export const ParseBookmarksResponse = Schema.Union(ParseBookmarksSuccess, ParseBookmarksFailure);
export type ParseBookmarksResponse = Schema.Schema.Type<typeof ParseBookmarksResponse>;
