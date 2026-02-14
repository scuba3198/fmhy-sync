function updateUI() {
    chrome.storage.local.get(['lastSync', 'status', 'count'], (data) => {
        document.getElementById('lastSync').textContent = data.lastSync || 'Never';
        document.getElementById('status').textContent = data.status || 'Ready';
        document.getElementById('count').textContent = data.count || '0';

        if (data.status === 'Syncing...') {
            document.getElementById('syncBtn').disabled = true;
        } else {
            document.getElementById('syncBtn').disabled = false;
        }
    });
}

document.getElementById('syncBtn').addEventListener('click', () => {
    document.getElementById('status').textContent = 'Syncing...';
    document.getElementById('syncBtn').disabled = true;

    chrome.runtime.sendMessage({ action: 'syncNow' }, (response) => {
        if (chrome.runtime.lastError) {
            document.getElementById('status').textContent = 'Error: Background sync failed';
        }
        updateUI();
    });
});

// Update UI every second while popup is open to catch status changes
setInterval(updateUI, 1000);
updateUI();
