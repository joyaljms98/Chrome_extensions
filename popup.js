document.addEventListener('DOMContentLoaded', () => {
    // --- Global Elements & State ---
    let currentTab;
    let bookmarksData = {};

    // --- Tab Elements ---
    const tabAddBtn = document.getElementById('tab-add');
    const tabSearchBtn = document.getElementById('tab-search');
    const panelAdd = document.getElementById('panel-add');
    const panelSearch = document.getElementById('panel-search');

    // --- Add Panel Elements ---
    const pageTitleInput = document.getElementById('page-title-input');
    const categorySelect = document.getElementById('category-select');
    const addButton = document.getElementById('add-button');
    const openManagerButton = document.getElementById('open-manager-button');
    const newCategoryInput = document.getElementById('new-category-input');
    const addCategoryButton = document.getElementById('add-category-button');
    const noteInput = document.getElementById('note-input');

    // --- Search Panel Elements ---
    const searchInput = document.getElementById('popup-search-input');
    const searchResultsContainer = document.getElementById('popup-search-results');


    // --- Tab Switching Logic ---
    const showPanel = (panelToShow) => {
        [panelAdd, panelSearch].forEach(p => p.classList.remove('active'));
        [tabAddBtn, tabSearchBtn].forEach(b => b.classList.remove('active'));

        if (panelToShow === 'add') {
            panelAdd.classList.add('active');
            tabAddBtn.classList.add('active');
        } else {
            panelSearch.classList.add('active');
            tabSearchBtn.classList.add('active');
        }
    };

    tabAddBtn.addEventListener('click', () => showPanel('add'));
    tabSearchBtn.addEventListener('click', () => showPanel('search'));


    // --- "Add Link" Panel Logic ---
    const populateCategories = () => {
        categorySelect.innerHTML = '';
        const categories = Object.keys(bookmarksData);

        if (categories.length > 0) {
            categories.sort().forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                categorySelect.appendChild(option);
            });
            addButton.disabled = false;
            addButton.textContent = "Add to LinkNest";
        } else {
            const option = document.createElement('option');
            option.textContent = "Create a category first";
            categorySelect.appendChild(option);
            addButton.disabled = true;
            addButton.textContent = "Create a Category to Add";
        }
    };

    const handleAddCategory = () => {
        const newCategoryName = newCategoryInput.value.trim();
        if (newCategoryName && !bookmarksData[newCategoryName]) {
            const now = new Date().toISOString();
            bookmarksData[newCategoryName] = {
                links: [],
                created: now,
                modified: now
            };
            chrome.storage.sync.set({ bookmarks: bookmarksData }, () => {
                if (chrome.runtime.lastError) {
                    console.error("Error saving new category:", chrome.runtime.lastError);
                    delete bookmarksData[newCategoryName];
                    return;
                }
                populateCategories();
                categorySelect.value = newCategoryName;
                newCategoryInput.value = '';
                newCategoryInput.focus();
            });
        }
    };

    // --- "Search" Panel Logic ---
    const performPopupSearch = (query) => {
        const normalizedQuery = query.toLowerCase().trim();
        if (!normalizedQuery) {
            searchResultsContainer.innerHTML = '<p class="search-placeholder">Start typing to search your saved links.</p>';
            return;
        }

        const results = [];
        for (const category in bookmarksData) {
            if (bookmarksData[category] && bookmarksData[category].links) {
                for (const parent of bookmarksData[category].links) {
                    for (const sublink of parent.sublinks) {
                        const titleMatch = sublink.title.toLowerCase().includes(normalizedQuery);
                        const urlMatch = sublink.url.toLowerCase().includes(normalizedQuery);
                        const notesMatch = sublink.notes && sublink.notes.toLowerCase().includes(normalizedQuery);
                        if (titleMatch || urlMatch || notesMatch) {
                            results.push({ ...sublink, category: category, domain: parent.domain });
                        }
                    }
                }
            }
        }
        renderSearchResults(results);
    };

    const renderSearchResults = (results) => {
        searchResultsContainer.innerHTML = '';
        if (results.length === 0) {
            searchResultsContainer.innerHTML = '<p class="search-placeholder">No matches found.</p>';
            return;
        }

        results.forEach(res => {
            const resultDiv = document.createElement('div');
            resultDiv.className = 'popup-search-result';
            
            const titleLink = document.createElement('a');
            titleLink.href = res.url;
            titleLink.textContent = res.title;
            titleLink.target = '_blank';
            titleLink.title = `Open link: ${res.url}`;
            resultDiv.appendChild(titleLink);

            if (res.notes) {
                const noteContainer = document.createElement('div');
                noteContainer.className = 'note-snippet-container';

                const noteSnippet = document.createElement('p');
                noteSnippet.className = 'result-note-snippet';
                noteSnippet.textContent = res.notes;
                noteContainer.appendChild(noteSnippet);

                const isLongNote = res.notes.split('\n').length > 2 || res.notes.length > 120;
                if (isLongNote) {
                    noteSnippet.classList.add('collapsed');
                    const expandBtn = document.createElement('button');
                    expandBtn.className = 'expand-note-btn';
                    expandBtn.textContent = 'Show more';
                    expandBtn.onclick = () => {
                        const isCollapsed = noteSnippet.classList.toggle('collapsed');
                        expandBtn.textContent = isCollapsed ? 'Show more' : 'Show less';
                    };
                    noteContainer.appendChild(expandBtn);
                }
                resultDiv.appendChild(noteContainer);
            }

            const contextDiv = document.createElement('div');
            contextDiv.className = 'result-context-wrapper';
            
            const contextSpan = document.createElement('span');
            contextSpan.className = 'result-context';
            contextSpan.textContent = `In: ${res.category} (${res.domain})`;
            contextDiv.appendChild(contextSpan);

            const gotoBtn = document.createElement('button');
            gotoBtn.className = 'popup-goto-btn';
            gotoBtn.textContent = 'Go to Location';
            gotoBtn.title = 'Open this link in the LinkNest Manager';
            gotoBtn.onclick = () => {
                chrome.runtime.openOptionsPage(() => {
                    setTimeout(() => {
                        chrome.runtime.sendMessage({
                            action: "navigateToLink",
                            payload: {
                                url: res.url,
                                category: res.category
                            }
                        }, () => {
                            if (!chrome.runtime.lastError) window.close();
                        });
                    }, 150);
                });
            };
            contextDiv.appendChild(gotoBtn);
            
            resultDiv.appendChild(contextDiv);
            searchResultsContainer.appendChild(resultDiv);
        });
    };

    searchInput.addEventListener('input', () => performPopupSearch(searchInput.value));

    // NEW: Function to migrate old data structures if found
    const migrateDataForPopup = (bookmarks) => {
        let migrationOccurred = false;
        for (const categoryName in bookmarks) {
            // Check if a category is still an array (the old format)
            if (Array.isArray(bookmarks[categoryName])) {
                console.log(`LinkNest Popup: Migrating old category '${categoryName}'.`);
                const linksArray = bookmarks[categoryName];
                const now = new Date().toISOString();
                
                bookmarks[categoryName] = {
                    links: linksArray,
                    created: now, // We can't know the original creation date here, so we use 'now'
                    modified: now
                };
                migrationOccurred = true;
            }
        }
        // If we migrated something, it's good practice to save the corrected structure back.
        if (migrationOccurred) {
            chrome.storage.sync.set({ bookmarks: bookmarks });
        }
        return bookmarks;
    };


    // --- Initial Load ---
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        currentTab = tabs[0];
        if (currentTab) {
            pageTitleInput.value = currentTab.title;
        }
    });

    chrome.storage.sync.get(['bookmarks', 'settings'], (data) => {
        let bookmarks = data.bookmarks || {};
        // NEW: Run the migration function before using the data
        bookmarksData = migrateDataForPopup(bookmarks);

        populateCategories();
        if (data.settings && data.settings.theme) {
            document.body.className = data.settings.theme;
        }
    });

    // --- Event Listeners for "Add" panel ---
    addCategoryButton.addEventListener('click', handleAddCategory);
    newCategoryInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') handleAddCategory();
    });

    addButton.addEventListener('click', () => {
        const newCategoryName = newCategoryInput.value.trim();
        const selectedCategory = categorySelect.value;
        const newTitle = pageTitleInput.value.trim();
        let targetCategory;

        if (newCategoryName) {
            targetCategory = newCategoryName;
        } else {
            targetCategory = selectedCategory;
        }

        if (!currentTab || !targetCategory || !newTitle || addButton.disabled) {
            return;
        }

        const proceedWithAddingLink = (category) => {
            chrome.runtime.sendMessage({
                action: "addLink",
                payload: {
                    url: currentTab.url,
                    title: newTitle,
                    category: category,
                    notes: noteInput.value.trim()
                }
            }, (response) => {
                if (!chrome.runtime.lastError) {
                    window.close();
                } else {
                    console.error("Error adding link:", chrome.runtime.lastError.message);
                }
            });
        };

        if (newCategoryName && !bookmarksData[newCategoryName]) {
            const now = new Date().toISOString();
            bookmarksData[newCategoryName] = {
                links: [],
                created: now,
                modified: now
            };

            chrome.storage.sync.set({ bookmarks: bookmarksData }, () => {
                if (chrome.runtime.lastError) {
                    console.error("Error saving new category:", chrome.runtime.lastError);
                    return;
                }
                proceedWithAddingLink(newCategoryName);
            });
        } else {
            proceedWithAddingLink(targetCategory);
        }
    });

    openManagerButton.addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });
});