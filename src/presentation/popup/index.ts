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
import { logger } from "@infrastructure/logger";

/**
 * Popup UI logic.
 * Why: Presentation layer for the user-facing popup.
 */

function updateUI(): void {
	chrome.storage.local.get(
		[STORAGE_KEY_LAST_SYNC, STORAGE_KEY_STATUS, STORAGE_KEY_COUNT],
		(data) => {
			const lastSyncEl = document.getElementById(STORAGE_KEY_LAST_SYNC);
			const statusEl = document.getElementById(STORAGE_KEY_STATUS);
			const countEl = document.getElementById(STORAGE_KEY_COUNT);
			const syncBtn = document.getElementById("syncBtn") as HTMLButtonElement | null;

			if (lastSyncEl) lastSyncEl.textContent = data[STORAGE_KEY_LAST_SYNC] ?? "Never";
			if (statusEl) statusEl.textContent = data[STORAGE_KEY_STATUS] ?? STATUS_READY;
			if (countEl) countEl.textContent = data[STORAGE_KEY_COUNT] ?? "0";

			if (syncBtn) {
				syncBtn.disabled = data[STORAGE_KEY_STATUS] === STATUS_SYNCING;
			}
		},
	);
}

function handleSyncClick(): void {
	const statusEl = document.getElementById(STORAGE_KEY_STATUS);
	const syncBtn = document.getElementById("syncBtn") as HTMLButtonElement | null;

	if (statusEl) statusEl.textContent = STATUS_SYNCING;
	if (syncBtn) syncBtn.disabled = true;

	logger.info("Triggering manual sync from popup UI.");
	chrome.runtime.sendMessage({ action: ACTION_SYNC_NOW }, undefined, () => {
		const lastError = (chrome.runtime as any).lastError;
		if (lastError) {
			logger.error({ error: lastError }, "Manual sync message failed");
			if (statusEl) statusEl.textContent = `${STATUS_ERROR_PREFIX}Sync failed`;
		}
		updateUI();
	});
}

document.getElementById("syncBtn")?.addEventListener("click", handleSyncClick);

// Initial UI update and interval
updateUI();
setInterval(updateUI, POPUP_UPDATE_INTERVAL_MS);
