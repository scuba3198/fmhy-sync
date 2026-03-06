import {
	ACTION_SYNC_NOW,
	POPUP_UPDATE_INTERVAL_MS,
	STATUS_READY,
	STATUS_SYNCING,
	STATUS_ERROR_PREFIX,
	STORAGE_KEY_COUNT,
	STORAGE_KEY_LAST_SYNC,
	STORAGE_KEY_STATUS,
} from "@domain/constants";
import { StorageService } from "@infrastructure/storage.service";
import { Logger } from "@infrastructure/logger.service";
import { Duration, Effect, ManagedRuntime, Schedule, Schema } from "effect";
import { PopupLive } from "../layers";

class PopupSendMessageError extends Schema.TaggedError<PopupSendMessageError>()(
	"PopupSendMessageError",
	{
		message: Schema.String,
		cause: Schema.optional(Schema.String),
	},
) {}

/**
 * Popup UI logic.
 * Why: Presentation layer for the user-facing popup.
 */

const runtime = ManagedRuntime.make(PopupLive);

const updateUI = Effect.fn("Popup.updateUI")(function* () {
	const data = yield* StorageService.getSyncData();

	yield* Effect.sync(() => {
		const lastSyncEl = document.getElementById(STORAGE_KEY_LAST_SYNC);
		const statusEl = document.getElementById(STORAGE_KEY_STATUS);
		const countEl = document.getElementById(STORAGE_KEY_COUNT);
		const syncBtn = document.getElementById("syncBtn") as HTMLButtonElement | null;

		const status = data.status ?? STATUS_READY;

		if (lastSyncEl) lastSyncEl.textContent = data.lastSync ?? "Never";
		if (statusEl) statusEl.textContent = status;
		if (countEl) countEl.textContent = data.count ?? "0";

		if (syncBtn) syncBtn.disabled = status === STATUS_SYNCING;
	});
});

function handleSyncClick(): void {
	const program = Effect.gen(function* () {
		const log = yield* Logger;

		yield* Effect.sync(() => {
			const statusEl = document.getElementById(STORAGE_KEY_STATUS);
			const syncBtn = document.getElementById("syncBtn") as HTMLButtonElement | null;
			if (statusEl) statusEl.textContent = STATUS_SYNCING;
			if (syncBtn) syncBtn.disabled = true;
		});

		yield* log.info("Triggering manual sync from popup UI.");

		yield* Effect.tryPromise({
			try: () => chrome.runtime.sendMessage({ action: ACTION_SYNC_NOW }),
			catch: (cause) =>
				new PopupSendMessageError({
					message: "Manual sync message failed",
					cause: String(cause),
				}),
		}).pipe(
			Effect.catchTag("PopupSendMessageError", (error) =>
				log.error(error.message, { error }).pipe(
					Effect.andThen(
						Effect.sync(() => {
							const statusEl = document.getElementById(STORAGE_KEY_STATUS);
							if (statusEl) statusEl.textContent = `${STATUS_ERROR_PREFIX}Sync failed`;
						}),
					),
				),
			),
		);

		yield* updateUI();
	});

	runtime.runFork(program);
}

document.getElementById("syncBtn")?.addEventListener("click", handleSyncClick);

runtime.runFork(
	updateUI().pipe(Effect.repeat(Schedule.spaced(Duration.millis(POPUP_UPDATE_INTERVAL_MS)))),
);
