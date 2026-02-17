import { z } from "zod";
import { BookmarkNodeSchema, type BookmarkFolder, type BookmarkNode } from "./bookmark.domain";

/**
 * Pure logic for parsing Netscape-formatted bookmarks HTML using DOMParser.
 */
export function parseNetscapeBookmarks(
	html: string,
	folderName: string,
	parser: DOMParser,
): BookmarkNode[] {
	const root: BookmarkFolder = { title: folderName, children: [] };
	const doc = parser.parseFromString(html, "text/html");

	// Netscape bookmarks usually start with a <DL> or <dl>
	const dl = doc.querySelector("dl") ?? doc.querySelector("DL");
	if (dl) {
		processDL(dl, root);
	}

	// Validate the result using Zod
	return z.array(BookmarkNodeSchema).parse(root.children);
}

function processDL(dlElement: Element, parentNode: BookmarkFolder): void {
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

				const targetFolder: BookmarkFolder = isPlaceholder
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
