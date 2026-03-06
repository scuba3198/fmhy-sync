import { Effect, Schema } from "effect";
import { BookmarkNodeSchema, type BookmarkNode } from "./bookmark.domain";
import { BookmarksSchemaDecodeError } from "./parser.errors";

type MutableBookmarkFolder = {
	title: string;
	children: BookmarkNode[];
};

/**
 * Pure logic for parsing Netscape-formatted bookmarks HTML using DOMParser.
 */
export function parseNetscapeBookmarks(
	html: string,
	folderName: string,
	parser: DOMParser,
): Effect.Effect<ReadonlyArray<BookmarkNode>, BookmarksSchemaDecodeError> {
	const root: MutableBookmarkFolder = { title: folderName, children: [] };
	const doc = parser.parseFromString(html, "text/html");

	// Netscape bookmarks usually start with a <DL> or <dl>
	const dl = doc.querySelector("dl") ?? doc.querySelector("DL");
	if (dl) {
		processDL(dl, root);
	}

	return Schema.decodeUnknown(Schema.Array(BookmarkNodeSchema))(root.children).pipe(
		Effect.catchTag("ParseError", (err) =>
			Effect.fail(new BookmarksSchemaDecodeError({ message: String(err) })),
		),
	);
}

function processDL(dlElement: Element, parentNode: MutableBookmarkFolder): void {
	const children = Array.from(dlElement.children);

	for (const child of children) {
		const tagName = child.tagName.toUpperCase();

		if (tagName === "DT") {
			const h3 = child.querySelector("h3") ?? child.querySelector("H3");
			const a = child.querySelector("a") ?? child.querySelector("A");
			const nestedDL = child.querySelector("dl") ?? child.querySelector("DL");

			if (h3) {
				const name = h3.textContent?.trim() ?? "Unnamed Folder";

				// Handle placeholder folders by merging their children into the parent
				const isPlaceholder = name === "/" || name === "";

				const targetFolder: MutableBookmarkFolder = isPlaceholder
					? parentNode
					: { title: name, children: [] };

				if (!isPlaceholder) {
					parentNode.children.push(targetFolder);
				}

				// Check for nested DL inside current DT
				if (nestedDL) {
					processDL(nestedDL, targetFolder);
				}
				// Check for nested DL as next sibling (common in Netscape format)
				else {
					const next = child.nextElementSibling;
					if (next && next.tagName.toUpperCase() === "DL") {
						processDL(next, targetFolder);
					}
				}
			} else if (a) {
				parentNode.children.push({
					title: a.textContent?.trim() ?? "Untitled Bookmark",
					url: a.href,
				});
			}
		} else if (tagName === "DL") {
			// If we hit a DL that wasn't handled by a preceding DT/H3,
			// it might be a direct child or a malformed list.
			const prev = child.previousElementSibling;
			const isAlreadyProcessed =
				prev?.tagName.toUpperCase() === "DT" &&
				(prev.querySelector("h3") ?? prev.querySelector("H3"));

			if (!isAlreadyProcessed) {
				processDL(child, parentNode);
			}
		}
	}
}
