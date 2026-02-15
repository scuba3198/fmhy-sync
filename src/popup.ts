import { SyncStorageData, SyncNowRequest, SyncNowResponse } from './types';

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

document.getElementById('syncBtn')?.addEventListener('click', () => {
    const statusEl = document.getElementById('status');
    const syncBtn = document.getElementById('syncBtn') as HTMLButtonElement | null;

    if (statusEl) statusEl.textContent = 'Syncing...';
    if (syncBtn) syncBtn.disabled = true;

    (chrome.runtime.sendMessage as any)({ action: 'syncNow' }, (response: any) => {
        if ((chrome.runtime as any).lastError) {
            if (statusEl) statusEl.textContent = 'Error: Background sync failed';
        }
        updateUI();
    });
});

// Update UI every second while popup is open to catch status changes
setInterval(updateUI, 1000);
updateUI();
