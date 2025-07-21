// Create a context menu item
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "linknest-add",
        title: "Add to LinkNest",
        contexts: ["link", "page"]
    });

    // Set up a default category on first install using the correct data structure
    chrome.storage.sync.get('bookmarks', (data) => {
        if (!data.bookmarks || Object.keys(data.bookmarks).length === 0) {
            const now = new Date().toISOString();
            chrome.storage.sync.set({
                bookmarks: {
                    "Getting Started": {
                        links: [],
                        created: now,
                        modified: now
                    }
                }
            });
        }
    });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "linknest-add") {
        const urlToAdd = info.linkUrl || info.pageUrl;

        // When using the context menu, we don't know the category.
        // So, we open the options page and pre-fill the input field.
        // The user can then choose a category and confirm.
        chrome.runtime.openOptionsPage(() => {
            // Use a small delay to ensure the options page's listener is ready.
            setTimeout(() => {
                 chrome.runtime.sendMessage({
                    action: "populateLinkInput", // New action
                    payload: {
                        url: urlToAdd,
                        title: info.selectionText || tab.title
                    }
                });
            }, 200);
        });
    }
});

// Handle messages from the popup or options page
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "addLink") {
        // Get the current bookmarks from storage
        chrome.storage.sync.get('bookmarks', (data) => {
            const bookmarks = data.bookmarks || {};
            const { url, title, category, notes, timestamp, modifiedTimestamp } = request.payload;

            let fullUrl = url.trim();
            if (!fullUrl.startsWith('http://') && !fullUrl.startsWith('https://')) {
                fullUrl = 'https://' + fullUrl;
            }

            try {
                const parsedUrl = new URL(fullUrl);
                const domain = parsedUrl.hostname;

                if (!bookmarks[category]) {
                    const now = new Date().toISOString();
                    bookmarks[category] = { links: [], created: now, modified: now };
                }

                const categoryData = bookmarks[category].links;
                let parent = categoryData.find(p => p.domain === domain);

                if (!parent) {
                    parent = { domain: domain, favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=32`, sublinks: [] };
                    categoryData.push(parent);
                }

                if (parent.sublinks.some(s => s.url === fullUrl)) {
                    sendResponse({ status: "duplicate" });
                    return;
                }

                const now = new Date().toISOString();
                parent.sublinks.push({
                    url: fullUrl,
                    title: title || fullUrl,
                    timestamp: timestamp || now,
                    modifiedTimestamp: modifiedTimestamp || timestamp || now,
                    notes: notes || ''
                });

                bookmarks[category].modified = now;

                chrome.storage.sync.set({ bookmarks: bookmarks }, () => {
                    sendResponse({ status: "success" });
                });

            } catch (e) {
                console.error("Invalid URL in background script:", url, e);
                sendResponse({ status: "error", message: "Invalid URL" });
            }
        });

        return true; // Indicates that the response is sent asynchronously
    }
});