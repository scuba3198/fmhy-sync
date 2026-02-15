import { SyncStorageData } from './types';

/**
 * Updates the popup UI with data from local storage.
 */
function updateUI(): void {
    chrome.storage.local.get(['lastSync', 'status', 'count'], (data: SyncStorageData) => {
        const lastSyncEl = document.getElementById('lastSync');
        const statusEl = document.getElementById('status');
        const countEl = document.getElementById('count');
        const syncBtn = document.getElementById('syncBtn') as HTMLButtonElement | null;

        if (lastSyncEl) lastSyncEl.textContent = data.lastSync || 'Never';
        if (statusEl) statusEl.textContent = data.status || 'Ready';
        if (countEl) countEl.textContent = data.count || '0';

        if (syncBtn) {
            syncBtn.disabled = (data.status === 'Syncing...');
        }
    });
}

/**
 * Triggered when the user clicks the "Sync Now" button.
 */
function handleSyncClick(): void {
    const statusEl = document.getElementById('status');
    const syncBtn = document.getElementById('syncBtn') as HTMLButtonElement | null;

    if (statusEl) statusEl.textContent = 'Syncing...';
    if (syncBtn) syncBtn.disabled = true;

    (chrome.runtime.sendMessage as any)({ action: 'syncNow' }, () => {
        const runtime = chrome.runtime as any;
        if (runtime.lastError) {
            console.error('Manual sync failed:', runtime.lastError.message);
            if (statusEl) statusEl.textContent = 'Error: Background sync failed';
        }
        updateUI();
    });
}

document.getElementById('syncBtn')?.addEventListener('click', handleSyncClick);

// Update UI every second while popup is open to catch status changes
setInterval(updateUI, 1000);
updateUI();
