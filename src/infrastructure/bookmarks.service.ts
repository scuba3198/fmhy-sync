import { Effect } from "effect";
import type { BookmarkNode } from "@domain/bookmark.domain";
import { isBookmarkFolder } from "@domain/bookmark.domain";
import { FOLDER_NAME } from "@domain/constants";
import { Logger } from "./logger.service";
import {
	BookmarksCreateError,
	BookmarksGetChildrenError,
	BookmarksRemoveTreeError,
	BookmarksSearchError,
} from "./bookmarks.errors";

export type CreateTreeStats = {
	created: number;
	failed: number;
};

export class BookmarksService extends Effect.Service<BookmarksService>()("BookmarksService", {
	accessors: true,
	dependencies: [Logger.Default],
	effect: Effect.gen(function* () {
		const log = yield* Logger;

		const ensureRootFolder = Effect.fn("BookmarksService.ensureRootFolder")(function* () {
			const nodes = yield* Effect.tryPromise({
				try: () => chrome.bookmarks.search({ title: FOLDER_NAME }),
				catch: (cause) =>
					new BookmarksSearchError({
						message: "Failed to search bookmarks for root folder",
						cause: String(cause),
					}),
			});

			const existingFolder = nodes.find((n) => !n.url);
			if (existingFolder) {
				const children = yield* Effect.tryPromise({
					try: () => chrome.bookmarks.getChildren(existingFolder.id),
					catch: (cause) =>
						new BookmarksGetChildrenError({
							message: "Failed to list children of existing root folder",
							cause: String(cause),
						}),
				});

				yield* Effect.forEach(children, (child) =>
					Effect.tryPromise({
						try: () => chrome.bookmarks.removeTree(child.id),
						catch: (cause) =>
							new BookmarksRemoveTreeError({
								message: "Failed to remove existing bookmark subtree",
								cause: String(cause),
							}),
					}),
				);

				return existingFolder.id;
			}

			const createdFolder = yield* Effect.tryPromise({
				try: () =>
					chrome.bookmarks.create({
						parentId: "1", // Bookmarks Bar
						title: FOLDER_NAME,
					}),
				catch: (cause) =>
					new BookmarksCreateError({
						message: "Failed to create root bookmark folder",
						cause: String(cause),
					}),
			});

			return createdFolder.id;
		});

		const createNode = Effect.fn("BookmarksService.createNode")(
			(
				node: BookmarkNode,
				parentId: string,
			): Effect.Effect<CreateTreeStats, BookmarksCreateError> =>
				Effect.gen(function* () {
					if (isBookmarkFolder(node)) {
						const folder = yield* Effect.tryPromise({
							try: () =>
								chrome.bookmarks.create({
									parentId,
									title: node.title,
								}),
							catch: (cause) =>
								new BookmarksCreateError({
									message: "Failed to create bookmark folder",
									cause: String(cause),
								}),
						});

						const stats = yield* createTree(node.children, folder.id);
						return { created: 1 + stats.created, failed: stats.failed };
					}

					yield* Effect.tryPromise({
						try: () =>
							chrome.bookmarks.create({
								parentId,
								title: node.title,
								url: node.url,
							}),
						catch: (cause) =>
							new BookmarksCreateError({
								message: "Failed to create bookmark leaf",
								cause: String(cause),
							}),
					});

					return { created: 1, failed: 0 };
				}),
		);

		const createTree = Effect.fn("BookmarksService.createTree")(
			(nodes: ReadonlyArray<BookmarkNode>, parentId: string): Effect.Effect<CreateTreeStats> =>
				Effect.gen(function* () {
					const stats = yield* Effect.forEach(
						nodes,
						(node) =>
							createNode(node, parentId).pipe(
								Effect.catchTag("BookmarksCreateError", (error) =>
									log
										.warn("Failed to create bookmark node", { error, parentId })
										.pipe(Effect.as({ created: 0, failed: 1 })),
								),
							),
						{ concurrency: 1 },
					);

					let created = 0;
					let failed = 0;
					for (const stat of stats) {
						created += stat.created;
						failed += stat.failed;
					}

					return { created, failed };
				}),
		);

		return { ensureRootFolder, createTree };
	}),
}) {}
