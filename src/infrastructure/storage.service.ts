import { Effect, Schema } from "effect";
import { STORAGE_KEY_COUNT, STORAGE_KEY_LAST_SYNC, STORAGE_KEY_STATUS } from "@domain/constants";
import { Logger } from "./logger.service";
import { StorageDecodeError, StorageGetError, StorageSetError } from "./storage.errors";

export const SyncData = Schema.Struct({
	lastSync: Schema.optional(Schema.String),
	status: Schema.optional(Schema.String),
	count: Schema.optional(Schema.String),
});
export type SyncData = Schema.Schema.Type<typeof SyncData>;

export class StorageService extends Effect.Service<StorageService>()("StorageService", {
	accessors: true,
	dependencies: [Logger.Default],
	effect: Effect.gen(function* () {
		const log = yield* Logger;

		const getSyncData = Effect.fn("StorageService.getSyncData")(function* () {
			const raw = yield* Effect.tryPromise({
				try: () =>
					chrome.storage.local.get([STORAGE_KEY_LAST_SYNC, STORAGE_KEY_STATUS, STORAGE_KEY_COUNT]),
				catch: (cause) =>
					new StorageGetError({
						message: "Failed to get sync data from storage",
						cause: String(cause),
					}),
			});

			const candidate = {
				lastSync: raw[STORAGE_KEY_LAST_SYNC],
				status: raw[STORAGE_KEY_STATUS],
				count: raw[STORAGE_KEY_COUNT],
			};

			return yield* Schema.decodeUnknown(SyncData)(candidate).pipe(
				Effect.catchTag("ParseError", (err) =>
					Effect.fail(new StorageDecodeError({ message: String(err) })),
				),
			);
		});

		const saveSyncSuccess = Effect.fn("StorageService.saveSyncSuccess")(
			(timestamp: string, status: string) =>
				Effect.tryPromise({
					try: () =>
						chrome.storage.local.set({
							[STORAGE_KEY_LAST_SYNC]: timestamp,
							[STORAGE_KEY_STATUS]: status,
							[STORAGE_KEY_COUNT]: "Categorized",
						}),
					catch: (cause) =>
						new StorageSetError({
							message: "Failed to save sync success to storage",
							cause: String(cause),
						}),
				}).pipe(Effect.tapError((error) => log.error(error.message, { error }))),
		);

		const updateStatus = Effect.fn("StorageService.updateStatus")((status: string) =>
			Effect.tryPromise({
				try: () => chrome.storage.local.set({ [STORAGE_KEY_STATUS]: status }),
				catch: (cause) =>
					new StorageSetError({
						message: "Failed to update status in storage",
						cause: String(cause),
					}),
			}).pipe(Effect.tapError((error) => log.error(error.message, { error }))),
		);

		return { getSyncData, saveSyncSuccess, updateStatus };
	}),
}) {}
