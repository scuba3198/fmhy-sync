import { describe, it, expect } from "vitest";
import { parseNetscapeBookmarks } from "./parser.logic";
import { isBookmarkFolder } from "./bookmark.domain";
import { JSDOM } from "jsdom";

describe("parseNetscapeBookmarks", () => {
	it("should parse a simple Netscape bookmarks file", () => {
		const html = `
			<!DOCTYPE NETSCAPE-Bookmark-file-1>
			<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
			<TITLE>Bookmarks</TITLE>
			<H1>Bookmarks</H1>
			<DL><p>
				<DT><H3>Folder A</H3>
				<DL><p>
					<DT><A HREF="https://example.com/1">Link 1</A>
				</DL><p>
				<DT><A HREF="https://example.com/2">Link 2</A>
			</DL><p>
		`;

		const dom = new JSDOM(html);
		const parser = new dom.window.DOMParser();

		const tree = parseNetscapeBookmarks(html, "Root", parser);

		expect(tree).toHaveLength(2);
		const folder = tree[0];
		if (folder && isBookmarkFolder(folder)) {
			expect(folder.title).toBe("Folder A");
			expect(folder.children).toHaveLength(1);
		} else {
			throw new Error("Expected Folder A to be a folder");
		}
		const leaf = tree[1];
		if (leaf && !isBookmarkFolder(leaf)) {
			expect(leaf.title).toBe("Link 2");
			expect(leaf.url).toBe("https://example.com/2");
		} else {
			throw new Error("Expected Link 2 to be a leaf");
		}
	});

	it("should skip placeholder folders like '/'", () => {
		const html = `
			<DL>
				<DT><H3>/</H3>
				<DL>
					<DT><A HREF="https://example.com/nested">Nested</A>
				</DL>
			</DL>
		`;
		const dom = new JSDOM(html);
		const parser = new dom.window.DOMParser();
		const tree = parseNetscapeBookmarks(html, "Root", parser);

		expect(tree).toHaveLength(1);
		const first = tree[0];
		if (first && !isBookmarkFolder(first)) {
			expect(first.title).toBe("Nested");
		} else {
			throw new Error("Expected Nested to be a leaf");
		}
	});
});
