import { z } from "zod";

/**
 * Zod schema for a bookmark leaf.
 */
export const BookmarkLeafSchema = z.object({
	title: z.string().describe("The display name of the bookmark"),
	url: z.string().url().describe("The destination URL"),
});

/**
 * Zod schema for a bookmark folder.
 * Recursive definition for nested folders.
 */
export type BookmarkFolder = {
	title: string;
	children: BookmarkNode[];
};

export type BookmarkLeaf = z.infer<typeof BookmarkLeafSchema>;
export type BookmarkNode = BookmarkLeaf | BookmarkFolder;

export const BookmarkFolderSchema: z.ZodType<BookmarkFolder> = z.lazy(() =>
	z.object({
		title: z.string().describe("The name of the folder"),
		children: z.array(BookmarkNodeSchema).describe("Ordered list of sub-nodes"),
	}),
);

export const BookmarkNodeSchema: z.ZodType<BookmarkNode> = z.union([
	BookmarkLeafSchema,
	BookmarkFolderSchema,
]);

/**
 * Type guard: check if a BookmarkNode is a folder.
 */
export function isBookmarkFolder(node: BookmarkNode): node is BookmarkFolder {
	return "children" in node;
}
