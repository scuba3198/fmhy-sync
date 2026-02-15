import {
    SyncStorageData,
    SyncNowRequest
} from './types';
import {
    STORAGE_KEY_LAST_SYNC,
    STORAGE_KEY_STATUS,
    STORAGE_KEY_COUNT,
    ACTION_SYNC_NOW,
    STATUS_SYNCING,
    STATUS_READY,
    POPUP_UPDATE_INTERVAL_MS,
    STATUS_ERROR_PREFIX
} from './constants';

/**
 * Updates the popup UI with data from local storage.
 */
function updateUI(): void {
    chrome.storage.local.get([
        STORAGE_KEY_LAST_SYNC,
        STORAGE_KEY_STATUS,
        STORAGE_KEY_COUNT
    ], (data: SyncStorageData) => {
        const lastSyncEl = document.getElementById(STORAGE_KEY_LAST_SYNC);
        const statusEl = document.getElementById(STORAGE_KEY_STATUS);
        const countEl = document.getElementById(STORAGE_KEY_COUNT);
        const syncBtn = document.getElementById('syncBtn') as HTMLButtonElement | null;

        if (lastSyncEl) lastSyncEl.textContent = data[STORAGE_KEY_LAST_SYNC] ?? 'Never';
        if (statusEl) statusEl.textContent = data[STORAGE_KEY_STATUS] ?? STATUS_READY;
        if (countEl) countEl.textContent = data[STORAGE_KEY_COUNT] ?? '0';

        if (syncBtn) {
            syncBtn.disabled = (data[STORAGE_KEY_STATUS] === STATUS_SYNCING);
        }
    });
}

/**
 * Triggered when the user clicks the "Sync Now" button.
 */
function handleSyncClick(): void {
    const statusEl = document.getElementById(STORAGE_KEY_STATUS);
    const syncBtn = document.getElementById('syncBtn') as HTMLButtonElement | null;

    if (statusEl) statusEl.textContent = STATUS_SYNCING;
    if (syncBtn) syncBtn.disabled = true;

    const message: SyncNowRequest = { action: ACTION_SYNC_NOW };

    chrome.runtime.sendMessage(message, undefined, () => {
        // In strict mode with chrome-types, lastError might be missing from the namespace definition 
        // or require specific access. Casting to any is safe here as we know it exists at runtime.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
        const runtime = chrome.runtime as any;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
        const lastError = runtime.lastError;

        if (lastError) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            console.error('Manual sync failed:', lastError.message);
            if (statusEl) statusEl.textContent = `${STATUS_ERROR_PREFIX}Background sync failed`;
        }
        updateUI();
    });
}

document.getElementById('syncBtn')?.addEventListener('click', handleSyncClick);

// Update UI every second while popup is open to catch status changes
setInterval(updateUI, POPUP_UPDATE_INTERVAL_MS);
updateUI();
