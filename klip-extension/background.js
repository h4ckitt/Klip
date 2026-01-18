chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.removeAll();

    chrome.contextMenus.create({
        id: "klip-root",
        title: "Klip to Kindle",
        contexts: ["page"]
    });

    chrome.contextMenus.create({
        id: "klip-epub",
        parentId: "klip-root",
        title: "Klip as EPUB",
        contexts: ["page"]
    });

    chrome.contextMenus.create({
        id: "klip-pdf",
        parentId: "klip-root",
        title: "Klip as PDF",
        contexts: ["page"]
    });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === "klip-epub" || info.menuItemId === "klip-pdf") {
        const format = info.menuItemId === "klip-pdf" ? "pdf" : "epub";
        const targetUrl = info.linkUrl || info.pageUrl;
        await sendToServer(targetUrl, format);
    }
});

async function sendToServer(url, format) {
    // 1. Set Loading Badge (FIXED COLOR)
    chrome.action.setBadgeText({ text: "..." });
    chrome.action.setBadgeBackgroundColor({ color: "#2196F3" });

    try {
        const { serverUrl, mode } = await chrome.storage.sync.get(['serverUrl', 'mode']);

        if (!serverUrl) {
            chrome.action.setBadgeText({ text: "CFG" });
            chrome.action.setBadgeBackgroundColor({ color: "#FF9800" }); // Orange
            return;
        }

        const response = await fetch(`${serverUrl}/clip`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                url: url,
                format: format,
                mode: mode || 'fast' // Use the setting from popup, or default to fast
            })
        });

        if (response.ok) {
            chrome.action.setBadgeText({ text: "OK" });
            chrome.action.setBadgeBackgroundColor({ color: "#4CAF50" }); // Green
        } else {
            chrome.action.setBadgeText({ text: "ERR" });
            chrome.action.setBadgeBackgroundColor({ color: "#F44336" }); // Red
        }

    } catch (err) {
        console.error(err);
        chrome.action.setBadgeText({ text: "FAIL" });
        chrome.action.setBadgeBackgroundColor({ color: "#F44336" }); // Red
    }

    setTimeout(() => {
        chrome.action.setBadgeText({ text: "" });
    }, 3000);
}