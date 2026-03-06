import { describe, expect, it } from "vitest";
import { Effect, FiberRef, Layer, ManagedRuntime, Option } from "effect";
import { SyncService } from "./sync.service";
import { Correlation, type CorrelationId as CorrelationIdType } from "./correlation.service";
import { Logger } from "@infrastructure/logger.service";
import { HttpService } from "@infrastructure/http.service";
import { FetchBookmarksNetworkError } from "@infrastructure/http.errors";
import { StorageService } from "@infrastructure/storage.service";
import { StorageSetError } from "@infrastructure/storage.errors";
import { BookmarksService } from "@infrastructure/bookmarks.service";
import { ChromeOffscreenService } from "@infrastructure/chrome-offscreen.service";
import { STATUS_ERROR_PREFIX, STATUS_SUCCESS, STATUS_SYNCING } from "@domain/constants";

const NoopLoggerLive = Layer.succeed(
	Logger,
	Logger.make({
		info: (_message: string, _data?: Record<string, unknown>) => Effect.void,
		warn: (_message: string, _data?: Record<string, unknown>) => Effect.void,
		error: (_message: string, _data?: Record<string, unknown>) => Effect.void,
	}),
);

function CorrelationTestLive(correlationId: string) {
	return Layer.succeed(
		Correlation,
		Correlation.make({
			fiberRef: FiberRef.unsafeMake<Option.Option<CorrelationIdType>>(Option.none()),
			get: () => Effect.succeed(Option.some(correlationId as CorrelationIdType)),
			set: () => Effect.void,
			clear: () => Effect.void,
			makeNew: () => Effect.succeed(correlationId as CorrelationIdType),
		}),
	);
}

describe("SyncService", () => {
	it("happy path: updates status, parses, writes bookmarks, saves success", async () => {
		const statusUpdates: Array<string> = [];
		const successes: Array<{ timestamp: string; status: string }> = [];
		const ensureRootCalls: Array<null> = [];
		const createTreeCalls: Array<{ parentId: string; created: number; failed: number }> = [];

		const HttpTestLive = Layer.succeed(
			HttpService,
			HttpService.make({
				fetchBookmarksHtml: () => Effect.succeed("<html>ok</html>"),
			}),
		);

		const StorageTestLive = Layer.succeed(
			StorageService,
			StorageService.make({
				getSyncData: () =>
					Effect.succeed({ lastSync: undefined, status: undefined, count: undefined }),
				saveSyncSuccess: (timestamp: string, status: string) =>
					Effect.sync(() => {
						successes.push({ timestamp, status });
					}),
				updateStatus: (status: string) =>
					Effect.sync(() => {
						statusUpdates.push(status);
					}),
			}),
		);

		const BookmarksTestLive = Layer.succeed(
			BookmarksService,
			BookmarksService.make({
				ensureRootFolder: () =>
					Effect.sync(() => {
						ensureRootCalls.push(null);
						return "root";
					}),
				createTree: (_nodes, parentId: string) =>
					Effect.sync(() => {
						createTreeCalls.push({ parentId, created: 3, failed: 0 });
						return { created: 3, failed: 0 };
					}),
			}),
		);

		const OffscreenTestLive = Layer.succeed(
			ChromeOffscreenService,
			ChromeOffscreenService.make({
				ensureOffscreenDocument: () => Effect.void,
				sendMessage: () =>
					Effect.succeed({
						_tag: "ParseSuccess",
						tree: [{ title: "A", url: "https://example.com" }],
					}),
			}),
		);

		const DepsTestLive = Layer.mergeAll(
			NoopLoggerLive,
			CorrelationTestLive("test-correlation" as CorrelationIdType),
			HttpTestLive,
			StorageTestLive,
			BookmarksTestLive,
			OffscreenTestLive,
		);

		const MainTestLive = SyncService.DefaultWithoutDependencies.pipe(
			Layer.provideMerge(DepsTestLive),
		);

		const runtime = ManagedRuntime.make(MainTestLive);
		await runtime.runPromise(SyncService.syncBookmarks());

		expect(statusUpdates[0]).toBe(STATUS_SYNCING);
		expect(successes).toHaveLength(1);
		expect(successes[0]?.status).toBe(STATUS_SUCCESS);
		expect(ensureRootCalls).toHaveLength(1);
		expect(createTreeCalls).toEqual([{ parentId: "root", created: 3, failed: 0 }]);
	});

	it("offscreen parse failure: writes an error status", async () => {
		const statusUpdates: Array<string> = [];

		const DepsTestLive = Layer.mergeAll(
			NoopLoggerLive,
			CorrelationTestLive("test-correlation" as CorrelationIdType),
			Layer.succeed(
				HttpService,
				HttpService.make({ fetchBookmarksHtml: () => Effect.succeed("<html />") }),
			),
			Layer.succeed(
				StorageService,
				StorageService.make({
					getSyncData: () =>
						Effect.succeed({ lastSync: undefined, status: undefined, count: undefined }),
					saveSyncSuccess: () => Effect.fail(new StorageSetError({ message: "should not happen" })),
					updateStatus: (status: string) =>
						Effect.sync(() => {
							statusUpdates.push(status);
						}),
				}),
			),
			Layer.succeed(
				BookmarksService,
				BookmarksService.make({
					ensureRootFolder: () => Effect.succeed("root"),
					createTree: () => Effect.succeed({ created: 0, failed: 0 }),
				}),
			),
			Layer.succeed(
				ChromeOffscreenService,
				ChromeOffscreenService.make({
					ensureOffscreenDocument: () => Effect.void,
					sendMessage: () =>
						Effect.succeed({
							_tag: "ParseFailure",
							error: { _tag: "BookmarksSchemaDecodeError", message: "bad html" },
						}),
				}),
			),
		);

		const MainTestLive = SyncService.DefaultWithoutDependencies.pipe(
			Layer.provideMerge(DepsTestLive),
		);

		const runtime = ManagedRuntime.make(MainTestLive);
		await runtime.runPromise(SyncService.syncBookmarks());

		expect(statusUpdates.at(0)).toBe(STATUS_SYNCING);
		expect(statusUpdates.at(-1)).toContain(
			`${STATUS_ERROR_PREFIX}BookmarksSchemaDecodeError: bad html`,
		);
	});

	it("fetch failure: writes an error status", async () => {
		const statusUpdates: Array<string> = [];

		const DepsTestLive = Layer.mergeAll(
			NoopLoggerLive,
			CorrelationTestLive("test-correlation" as CorrelationIdType),
			Layer.succeed(
				HttpService,
				HttpService.make({
					fetchBookmarksHtml: () =>
						Effect.fail(new FetchBookmarksNetworkError({ message: "network down" })),
				}),
			),
			Layer.succeed(
				StorageService,
				StorageService.make({
					getSyncData: () =>
						Effect.succeed({ lastSync: undefined, status: undefined, count: undefined }),
					saveSyncSuccess: () => Effect.fail(new StorageSetError({ message: "should not happen" })),
					updateStatus: (status: string) =>
						Effect.sync(() => {
							statusUpdates.push(status);
						}),
				}),
			),
			Layer.succeed(
				BookmarksService,
				BookmarksService.make({
					ensureRootFolder: () => Effect.succeed("root"),
					createTree: () => Effect.succeed({ created: 0, failed: 0 }),
				}),
			),
			Layer.succeed(
				ChromeOffscreenService,
				ChromeOffscreenService.make({
					ensureOffscreenDocument: () => Effect.void,
					sendMessage: () =>
						Effect.succeed({
							_tag: "ParseSuccess",
							tree: [{ title: "A", url: "https://example.com" }],
						}),
				}),
			),
		);

		const MainTestLive = SyncService.DefaultWithoutDependencies.pipe(
			Layer.provideMerge(DepsTestLive),
		);

		const runtime = ManagedRuntime.make(MainTestLive);
		await runtime.runPromise(SyncService.syncBookmarks());

		expect(statusUpdates.at(0)).toBe(STATUS_SYNCING);
		expect(statusUpdates.at(-1)).toBe(`${STATUS_ERROR_PREFIX}network down`);
	});
});
