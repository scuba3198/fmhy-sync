import { Schema } from "effect";

export const UrlString = Schema.String.pipe(Schema.pattern(/^https?:\/\/.+/));
export type UrlString = Schema.Schema.Type<typeof UrlString>;

export type BookmarkLeaf = {
	title: string;
	url: UrlString;
};

export type BookmarkFolder = {
	title: string;
	children: ReadonlyArray<BookmarkNode>;
};

export type BookmarkNode = BookmarkLeaf | BookmarkFolder;

export const BookmarkLeafSchema: Schema.Schema<BookmarkLeaf> = Schema.Struct({
	title: Schema.String,
	url: UrlString,
});

export const BookmarkNodeSchema: Schema.Schema<BookmarkNode> = Schema.suspend(() =>
	Schema.Union(BookmarkLeafSchema, BookmarkFolderSchema),
);

export const BookmarkFolderSchema: Schema.Schema<BookmarkFolder> = Schema.Struct({
	title: Schema.String,
	children: Schema.Array(BookmarkNodeSchema),
});

/**
 * Type guard: check if a BookmarkNode is a folder.
 */
export function isBookmarkFolder(node: BookmarkNode): node is BookmarkFolder {
	return "children" in node;
}
