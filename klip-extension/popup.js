document.addEventListener('DOMContentLoaded', () => {
    const statusEl = document.getElementById('status');
    const configView = document.getElementById('config-view');
    const serverInput = document.getElementById('server-url');
    const modeSelect = document.getElementById('mode-select'); // New Element
    const settingsBtn = document.getElementById('settings-btn');

    // 1. Load Settings on open (URL and Mode)
    chrome.storage.sync.get(['serverUrl', 'mode'], (result) => {
        // Set URL
        if (result.serverUrl) {
            serverInput.value = result.serverUrl;
        } else {
            configView.classList.remove('hidden');
        }

        // Set Mode (Default to 'fast' if not set)
        if (result.mode) {
            modeSelect.value = result.mode;
        } else {
            modeSelect.value = 'fast';
        }
    });

    // 2. Settings Toggle
    settingsBtn.addEventListener('click', () => {
        configView.classList.toggle('hidden');
    });

    // 3. Save Config (URL + Mode)
    document.getElementById('save-config').addEventListener('click', () => {
        let url = serverInput.value.replace(/\/$/, "");
        if (url && !url.startsWith('http')) url = 'http://' + url;

        const mode = modeSelect.value; // Get selected mode

        chrome.storage.sync.set({ serverUrl: url, mode: mode }, () => {
            statusEl.innerText = "Settings saved!";
            statusEl.style.color = "green";

            setTimeout(() => {
                statusEl.innerText = "Ready";
                statusEl.style.color = "#666";
                configView.classList.add('hidden');
            }, 1000);
        });
    });

    // 4. Clip Actions
    document.getElementById('btn-epub').addEventListener('click', () => klip('epub'));
    document.getElementById('btn-pdf').addEventListener('click', () => klip('pdf'));

    async function klip(format) {
        statusEl.innerText = "Klipping...";
        statusEl.style.color = "#666";

        // Retrieve both URL and Mode
        const { serverUrl, mode } = await chrome.storage.sync.get(['serverUrl', 'mode']);

        if (!serverUrl) {
            statusEl.innerText = "Error: No Server URL";
            statusEl.style.color = "red";
            configView.classList.remove('hidden');
            return;
        }

        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        try {
            const response = await fetch(`${serverUrl}/clip`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: tab.url,
                    format: format,
                    // Use saved mode, default to 'fast' if missing
                    mode: mode || 'fast'
                })
            });

            if (response.ok) {
                statusEl.innerText = "Sent to Kindle!";
                statusEl.style.color = "green";
            } else {
                statusEl.innerText = "Server Error";
                statusEl.style.color = "red";
            }
        } catch (err) {
            statusEl.innerText = "Connection Failed";
            console.error(err);
            statusEl.style.color = "red";
        }
    }
});