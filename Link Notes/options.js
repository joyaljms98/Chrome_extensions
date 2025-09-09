document.addEventListener('DOMContentLoaded', () => {
    document.documentElement.classList.add('options-html');

    // --- UI Elements ---
    const categoryList = document.getElementById('category-list');
    const newCategoryInput = document.getElementById('new-category-input');
    const addCategoryBtn = document.getElementById('add-category-btn');
    const categorySearchInput = document.getElementById('category-search-input');
    const categorySortSelect = document.getElementById('category-sort-select');
    const linksTree = document.getElementById('links-tree');
    const notesEditor = document.getElementById('notes-editor');
    const notesHeader = document.getElementById('notes-header');
    const notesPreview = document.getElementById('notes-preview');
    const notesViewToggleBtn = document.getElementById('notes-view-toggle-btn');
    const pasteLinkInput = document.getElementById('paste-link-input');
    const toggleThemeBtn = document.getElementById('toggle-theme-btn');
    const backupBtn = document.getElementById('backup-btn');
    const restoreBtn = document.getElementById('restore-btn');
    const restoreInput = document.getElementById('restore-input');
    const importChromeBtn = document.getElementById('import-chrome-btn');
    const importChromeInput = document.getElementById('import-chrome-input');
    const sortingControls = document.getElementById('sorting-controls');
    const sortSelect = document.getElementById('sort-select');
    const resizer = document.getElementById('resizer');
    const resizerLeft = document.getElementById('resizer-left');
    const mainContainer = document.getElementById('main-container');
    const panelLeft = document.querySelector('.panel-left');
    const panelCenter = document.querySelector('.panel-center');
    const panelRight = document.querySelector('.panel-right');
    const toggleLeftPanelBtn = document.getElementById('toggle-left-panel-btn');
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    const zoomSlider = document.getElementById('zoom-slider');
    const zoomValue = document.getElementById('zoom-value');
    const zoomResetBtn = document.getElementById('zoom-reset-btn');
    const dataOptionsBtn = document.getElementById('data-options-btn');
    const dataOptionsPopup = document.getElementById('data-options-popup');
    const restoreModalOverlay = document.getElementById('restore-modal-overlay');
    const restoreModalTitle = document.getElementById('restore-modal-title');
    const restoreMergeBtn = document.getElementById('restore-merge-btn');
    const restoreOverwriteBtn = document.getElementById('restore-overwrite-btn');
    const restoreCancelBtn = document.getElementById('restore-cancel-btn');
    const selectModeBtn = document.getElementById('select-mode-btn');
    const selectionActions = document.getElementById('selection-actions');
    const selectAllBtn = document.getElementById('select-all-btn');
    const moveSelectedBtn = document.getElementById('move-selected-btn');
    const deleteSelectedBtn = document.getElementById('delete-selected-btn');
    const cancelSelectionBtn = document.getElementById('cancel-selection-btn');
    const selectionControlsContainer = document.getElementById('selection-controls-container');
    const moveModalOverlay = document.getElementById('move-modal-overlay');
    const moveCategorySelect = document.getElementById('move-category-select');
    const moveNewCategoryInput = document.getElementById('move-new-category-input');
    const moveConfirmBtn = document.getElementById('move-confirm-btn');
    const moveCancelBtn = document.getElementById('move-cancel-btn');
    const aboutBtn = document.getElementById('about-btn');
    const aboutModalOverlay = document.getElementById('about-modal-overlay');
    const aboutModalCloseBtn = document.getElementById('about-modal-close-btn');


    // --- State object ---
    let state = {
        bookmarks: {},
        settings: { theme: 'light', leftPanelCollapsed: false, zoomLevel: 100, categorySortOrder: 'alpha-asc', notesView: 'edit' },
        activeCategory: null,
        activeSublinkUrl: null,
        notesSaveTimer: null,
        activeSortOrder: 'newest',
        viewMode: 'category', // 'category' or 'search'
        searchResults: [],
        selectionMode: false,
        selectedLinks: [], // a list of {url, category}
        importData: null, // Holds data from restore/import file
    };
    let draggedItem = null;
    let dataLoaded = false;
    let pendingNavigation = null;

    // --- Main Functions ---
    const saveData = () => {
        chrome.storage.sync.set({ bookmarks: state.bookmarks });
    };

    const saveSettings = () => {
        chrome.storage.sync.set({ settings: state.settings });
    };

    // --- NEW: Data Migration for new features ---
    const migrateData = (data) => {
        let migrationOccurred = false;
        const bookmarks = data.bookmarks || {};
        
        // Migrate category structure from array to object
        for (const categoryName in bookmarks) {
            if (Array.isArray(bookmarks[categoryName])) {
                const now = new Date().toISOString();
                // Find oldest link timestamp to estimate category creation date
                const links = bookmarks[categoryName];
                let oldestTimestamp = now;
                if (links.length > 0) {
                    oldestTimestamp = links.reduce((oldest, link) => {
                        return link.timestamp < oldest ? link.timestamp : oldest;
                    }, links[0].timestamp);
                }
                
                bookmarks[categoryName] = {
                    links: links,
                    created: oldestTimestamp,
                    modified: now
                };
                migrationOccurred = true;
            }
        }

        // Migrate sublinks to include modifiedTimestamp
        for (const categoryName in bookmarks) {
            if (bookmarks[categoryName] && bookmarks[categoryName].links) {
                bookmarks[categoryName].links.forEach(parent => {
                    parent.sublinks.forEach(sublink => {
                        if (typeof sublink.modifiedTimestamp === 'undefined') {
                            sublink.modifiedTimestamp = sublink.timestamp; // Set initial modified date
                            migrationOccurred = true;
                        }
                    });
                });
            }
        }

        state.bookmarks = bookmarks;
        if (migrationOccurred) {
            console.log("LinkNotes: Data structure updated for new features.");
            saveData(); // Save the migrated structure
        }
    };

    const loadData = () => {
        chrome.storage.sync.get(['bookmarks', 'settings'], (data) => {
            migrateData(data); // IMPORTANT: Run migration first

            state.settings = data.settings || { theme: 'light', leftPanelCollapsed: false, zoomLevel: 100, categorySortOrder: 'alpha-asc', notesView: 'edit' };
            if (typeof state.settings.leftPanelCollapsed === 'undefined') state.settings.leftPanelCollapsed = false;
            if (typeof state.settings.zoomLevel === 'undefined') state.settings.zoomLevel = 100;
            if (typeof state.settings.categorySortOrder === 'undefined') state.settings.categorySortOrder = 'alpha-asc';
            if (typeof state.settings.notesView === 'undefined') state.settings.notesView = 'edit';
            
            categorySortSelect.value = state.settings.categorySortOrder;
            
            renderCategories();
            applyTheme();
            applyLeftPanelState();
            applyZoom(state.settings.zoomLevel);
            toggleNotesView(state.settings.notesView, true);

            dataLoaded = true;
            if (pendingNavigation) {
                handleNavigation(pendingNavigation);
                pendingNavigation = null;
            }
        });
    };

    const applyTheme = () => {
        document.body.className = document.body.className.replace(/(light|dark|black)/g, '').trim();
        document.body.classList.add(state.settings.theme);
    };

    const applyLeftPanelState = () => {
        mainContainer.classList.toggle('left-panel-collapsed', state.settings.leftPanelCollapsed);

        // When toggling the left panel, we must clear any inline sizing styles
        // from the other panels. This allows them to flex and fill the available
        // space correctly, rather than being stuck at a fixed width.
        panelCenter.style.flexBasis = '';
        panelCenter.style.flexGrow = '';
        panelRight.style.flexBasis = '';
        panelRight.style.flexGrow = '';

        // For the left panel itself, we only need to clear its styles on collapse,
        // so the CSS rule for collapsing can apply.
        if (state.settings.leftPanelCollapsed) {
            panelLeft.style.flexBasis = '';
            panelLeft.style.flexGrow = '';
            panelLeft.style.flexShrink = '';
        }
    };
    
    const applyZoom = (level) => {
        const baseFontSize = 14;
        document.body.style.fontSize = `${baseFontSize * (level / 100)}px`;
        
        zoomSlider.value = level;
        zoomValue.textContent = `${level}%`;
        state.settings.zoomLevel = level;
    };

    // --- Markdown Parser ---
    const parseMarkdown = (text) => {
        if (!text) return '';
        let html = text
            // Escape HTML to prevent XSS
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');

        // Process line breaks
        html = html.split('\n').map(line => {
            // Headings
            if (line.startsWith('#')) {
                const level = line.match(/^#+/)[0].length;
                if (level <= 6) {
                    const content = line.slice(level).trim();
                    return `<h${level}>${content}</h${level}>`;
                }
            }
            // Unordered list
            if (line.startsWith('* ') || line.startsWith('- ')) {
                return `<li>${line.slice(2).trim()}</li>`;
            }
            return line;
        }).join('\n');

        // Wrap list items in <ul>
        html = html.replace(/<li>(.*?)<\/li>/gs, '<ul><li>$1</li></ul>')
                   .replace(/<\/ul>\n<ul>/g, '');
        
        // Bold and Italics
        html = html
            .replace(/\*\*(.*?)\*\*|__(.*?)__/g, '<strong>$1$2</strong>')
            .replace(/\*(.*?)\*|_(.*?)_/g, '<em>$1$2</em>');

        return html.replace(/\n/g, '<br>');
    };

    // --- Notes View Toggler ---
    const toggleNotesView = (view, force = false) => {
        if (!force) {
            state.settings.notesView = state.settings.notesView === 'edit' ? 'preview' : 'edit';
            saveSettings();
        } else {
            state.settings.notesView = view;
        }

        if (state.settings.notesView === 'preview') {
            notesEditor.style.display = 'none';
            notesPreview.style.display = 'block';
            notesViewToggleBtn.textContent = 'Edit';
            notesPreview.innerHTML = parseMarkdown(notesEditor.value);
        } else {
            notesEditor.style.display = 'block';
            notesPreview.style.display = 'none';
            notesViewToggleBtn.textContent = 'Preview';
        }
    };


    // --- View Management ---
    const updateView = () => {
        if (state.viewMode === 'search') {
            renderSearchResults();
        } else {
            updateCenterPanelForCategory();
        }
        updateSelectionUI();
    };

    const switchToCategoryView = () => {
        state.viewMode = 'category';
        searchInput.value = '';
        state.searchResults = [];
        toggleSelectionMode(false); // Exit selection mode when switching views
        updateView();
    };


    // --- Render Functions ---
    const renderCategories = (filterQuery = '') => {
        let categoryNames = Object.keys(state.bookmarks);
        
        // Filter categories based on search query
        const normalizedQuery = filterQuery.toLowerCase().trim();
        if (normalizedQuery) {
            categoryNames = categoryNames.filter(cat => cat.toLowerCase().includes(normalizedQuery));
        }

        // Sort categories
        categoryNames.sort((a, b) => {
            const catA = state.bookmarks[a];
            const catB = state.bookmarks[b];
            switch (state.settings.categorySortOrder) {
                case 'alpha-desc': return b.localeCompare(a);
                case 'created-newest': return new Date(catB.created) - new Date(catA.created);
                case 'created-oldest': return new Date(catA.created) - new Date(catB.created);
                case 'modified-newest': return new Date(catB.modified) - new Date(catA.modified);
                case 'modified-oldest': return new Date(catA.modified) - new Date(catB.modified);
                case 'alpha-asc': default: return a.localeCompare(b);
            }
        });

        const hasActiveCategory = state.activeCategory && (state.activeCategory === '--all-links--' || state.bookmarks[state.activeCategory]);

        categoryList.innerHTML = '';

        const allLinksLi = document.createElement('li');
        allLinksLi.textContent = 'All Links';
        allLinksLi.dataset.category = '--all-links--';
        allLinksLi.className = 'all-links-item';
        if (state.activeCategory === '--all-links--') {
            allLinksLi.classList.add('active');
        }
        categoryList.appendChild(allLinksLi);

        categoryNames.forEach(cat => {
            const li = document.createElement('li');
            li.textContent = cat;
            li.dataset.category = cat;
            if (cat === state.activeCategory) {
                li.classList.add('active');
            }
            const removeBtn = document.createElement('button');
            removeBtn.textContent = '✖';
            removeBtn.classList.add('remove-btn');
            removeBtn.onclick = (e) => {
                e.stopPropagation();
                removeCategory(cat);
            };
            li.appendChild(removeBtn);
            categoryList.appendChild(li);
        });

        if (!hasActiveCategory && categoryNames.length > 0) {
            state.activeCategory = categoryNames[0];
        } else if (!hasActiveCategory) {
            state.activeCategory = '--all-links--';
        }
        updateView();
    };


    const updateCenterPanelForCategory = () => {
        linksTree.innerHTML = '';
        linksTree.className = '';
        if (state.activeCategory) {
            sortingControls.style.display = 'flex';
            if (state.activeCategory === '--all-links--') {
                pasteLinkInput.style.display = 'none';
                selectionControlsContainer.style.display = 'flex';
                renderAllLinks();
            } else {
                pasteLinkInput.style.display = 'block';
                selectionControlsContainer.style.display = 'flex';
                renderLinks();
            }
        } else {
            pasteLinkInput.style.display = 'none';
            sortingControls.style.display = 'none';
            selectionControlsContainer.style.display = 'none';
        }
    };

    const renderAllLinks = () => {
        linksTree.classList.add('all-links-view');
        let allSublinks = [];
        for (const categoryName in state.bookmarks) {
            state.bookmarks[categoryName].links.forEach(parent => {
                parent.sublinks.forEach(sublink => {
                    allSublinks.push({ ...sublink, category: categoryName, domain: parent.domain, favicon: parent.favicon });
                });
            });
        }
        allSublinks.sort((a, b) => {
            switch (state.activeSortOrder) {
                case 'oldest': return new Date(a.timestamp) - new Date(b.timestamp);
                case 'alpha': return a.title.localeCompare(b.title);
                case 'modified-newest': return new Date(b.modifiedTimestamp) - new Date(a.modifiedTimestamp);
                case 'modified-oldest': return new Date(a.modifiedTimestamp) - new Date(b.modifiedTimestamp);
                case 'newest': default: return new Date(b.timestamp) - new Date(a.timestamp);
            }
        });
        allSublinks.forEach(sublink => {
            linksTree.appendChild(createSublinkElement(sublink, sublink.category));
        });
    };

    const renderLinks = () => {
        if (!state.activeCategory || !state.bookmarks[state.activeCategory]) {
            return;
        }
        let categoryData = [...state.bookmarks[state.activeCategory].links];
        
        const getTimestamp = (parent, type) => {
             if (!parent.sublinks || parent.sublinks.length === 0) return 0;
             const prop = type === 'created' ? 'timestamp' : 'modifiedTimestamp';
             return Math.max(...parent.sublinks.map(s => new Date(s[prop]).getTime()));
        };

        switch (state.activeSortOrder) {
            case 'oldest': categoryData.sort((a, b) => getTimestamp(a, 'created') - getTimestamp(b, 'created')); break;
            case 'alpha': categoryData.sort((a, b) => a.domain.localeCompare(b.domain)); break;
            case 'modified-newest': categoryData.sort((a, b) => getTimestamp(b, 'modified') - getTimestamp(a, 'modified')); break;
            case 'modified-oldest': categoryData.sort((a, b) => getTimestamp(a, 'modified') - getTimestamp(b, 'modified')); break;
            case 'newest': default: categoryData.sort((a, b) => getTimestamp(b, 'created') - getTimestamp(a, 'created')); break;
        }

        categoryData.forEach(parent => {
            const parentDiv = document.createElement('div');
            parentDiv.className = 'parent-item';
            parentDiv.dataset.domain = parent.domain;
            parentDiv.draggable = true;
            const parentHeader = document.createElement('div');
            parentHeader.className = 'parent-header';
            parentHeader.innerHTML = `<img src="${parent.favicon || 'icons/icon16.png'}" class="favicon"> ${parent.domain}`;
            parentDiv.appendChild(parentHeader);
            const sublinksContainer = document.createElement('div');
            sublinksContainer.className = 'sublinks-container';
            parent.sublinks.forEach(sublink => {
                sublinksContainer.appendChild(createSublinkElement(sublink, state.activeCategory));
            });
            parentDiv.appendChild(sublinksContainer);
            linksTree.appendChild(parentDiv);
        });
    };

    const createSublinkElement = (sublink, categoryName) => {
        const sublinkDiv = document.createElement('div');
        sublinkDiv.className = 'sublink-item';
        sublinkDiv.dataset.url = sublink.url;
        sublinkDiv.dataset.category = categoryName;
        sublinkDiv.draggable = !state.selectionMode;

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'selection-checkbox';
        checkbox.checked = state.selectedLinks.some(link => link.url === sublink.url);
        checkbox.dataset.url = sublink.url;
        checkbox.dataset.category = categoryName;
        sublinkDiv.appendChild(checkbox);

        const titleSpan = document.createElement('span');
        titleSpan.className = 'sublink-title';
        titleSpan.textContent = sublink.title;
        titleSpan.title = sublink.url;

        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'button-container';
        const openLinkBtn = document.createElement('button');
        openLinkBtn.className = 'open-link-btn';
        openLinkBtn.innerHTML = '&#x2197;';
        openLinkBtn.title = 'Open in new tab';
        
        const infoBtn = document.createElement('button');
        infoBtn.className = 'info-btn';
        infoBtn.innerHTML = 'i';
        const createdDate = new Date(sublink.timestamp).toLocaleString();
        const modifiedDate = new Date(sublink.modifiedTimestamp).toLocaleString();
        infoBtn.title = `Added: ${createdDate}\nModified: ${modifiedDate}`;

        const deleteLinkBtn = document.createElement('button');
        deleteLinkBtn.className = 'delete-link-btn';
        deleteLinkBtn.innerHTML = '&times;';
        deleteLinkBtn.title = 'Delete this link';
        buttonContainer.appendChild(openLinkBtn);
        buttonContainer.appendChild(infoBtn);
        buttonContainer.appendChild(deleteLinkBtn);
        sublinkDiv.appendChild(titleSpan);
        sublinkDiv.appendChild(buttonContainer);

        if (sublink.url === state.activeSublinkUrl) {
            sublinkDiv.classList.add('active');
        }
        if (checkbox.checked) {
            sublinkDiv.classList.add('selected');
        }
        return sublinkDiv;
    };

    const renderNotes = () => {
        notesEditor.disabled = true;
        notesEditor.value = '';
        notesPreview.innerHTML = '';
        notesHeader.textContent = "Notes";
        if (state.activeSublinkUrl) {
            let foundSublink = null;
            for (const category in state.bookmarks) {
                for (const parent of state.bookmarks[category].links) {
                    const sublink = parent.sublinks.find(s => s.url === state.activeSublinkUrl);
                    if (sublink) {
                        foundSublink = sublink;
                        break;
                    }
                }
                if (foundSublink) break;
            }
            if (foundSublink) {
                notesEditor.disabled = false;
                notesEditor.value = foundSublink.notes || '';
                notesPreview.innerHTML = parseMarkdown(foundSublink.notes || '');
                notesHeader.textContent = `Notes for: ${foundSublink.title.substring(0, 30)}...`;
            }
        }
    };

    // --- Search Functions ---
    const performSearch = (query) => {
        const normalizedQuery = query.toLowerCase().trim();
        if (!normalizedQuery) {
            switchToCategoryView();
            return;
        }
        toggleSelectionMode(false);
        state.searchResults = [];
        for (const category in state.bookmarks) {
            for (const parent of state.bookmarks[category].links) {
                for (const sublink of parent.sublinks) {
                    const titleMatch = sublink.title.toLowerCase().includes(normalizedQuery);
                    const urlMatch = sublink.url.toLowerCase().includes(normalizedQuery);
                    const notesMatch = sublink.notes && sublink.notes.toLowerCase().includes(normalizedQuery);
                    if (titleMatch || urlMatch || notesMatch) {
                        state.searchResults.push({
                            ...sublink,
                            category: category,
                            domain: parent.domain
                        });
                    }
                }
            }
        }
        state.viewMode = 'search';
        updateView();
    };

    const renderSearchResults = () => {
        linksTree.innerHTML = '';
        linksTree.className = 'search-results-view';
        sortingControls.style.display = 'none';
        pasteLinkInput.style.display = 'none';
        selectionControlsContainer.style.display = 'none';

        if (state.searchResults.length === 0) {
            linksTree.innerHTML = '<p style="text-align:center; margin-top: 20px;">No results found.</p>';
            return;
        }

        state.searchResults.forEach(result => {
            const resultItem = document.createElement('div');
            resultItem.className = 'search-result-item';
            const sublinkElement = createSublinkElement(result, result.category);
            resultItem.appendChild(sublinkElement);

            if (result.notes) {
                const noteContainer = document.createElement('div');
                noteContainer.className = 'note-snippet-container';

                const noteSnippet = document.createElement('div');
                noteSnippet.className = 'note-snippet';
                noteSnippet.textContent = result.notes;
                noteContainer.appendChild(noteSnippet);

                const isLongNote = result.notes.split('\n').length > 2 || result.notes.length > 120;
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
                resultItem.appendChild(noteContainer);
            }

            const contextDiv = document.createElement('div');
            contextDiv.className = 'search-result-context';
            contextDiv.innerHTML = `<span>In: ${result.category} / ${result.domain}</span>`;
            
            const gotoBtn = document.createElement('button');
            gotoBtn.className = 'goto-btn';
            gotoBtn.textContent = 'Go to location';
            
            gotoBtn.onclick = () => {
                handleNavigation({url: result.url, category: result.category});
            };
            
            contextDiv.appendChild(gotoBtn);
            resultItem.appendChild(contextDiv);
            linksTree.appendChild(resultItem);
        });
    };

    // --- Core Logic Functions ---
    const addCategory = () => {
        const name = newCategoryInput.value.trim();
        if (name && !state.bookmarks[name]) {
            const now = new Date().toISOString();
            state.bookmarks[name] = {
                links: [],
                created: now,
                modified: now
            };
            state.activeCategory = name;
            saveData();
            renderCategories();
            newCategoryInput.value = '';
        }
    };

    const removeCategory = (categoryName) => {
        if (confirm(`Are you sure you want to delete the category "${categoryName}"?`)) {
            delete state.bookmarks[categoryName];
            if (state.activeCategory === categoryName) {
                state.activeCategory = null;
            }
            saveData();
            renderCategories();
        }
    };

    const addLink = (url, title, category, notes, timestamp, modifiedTimestamp) => {
        chrome.runtime.sendMessage({
            action: "addLink",
            payload: { url, title, category, notes, timestamp, modifiedTimestamp }
        }, () => {
            if (!chrome.runtime.lastError) {
                loadData(); 
            } else {
                console.error("Error adding link:", chrome.runtime.lastError);
            }
        });
    };

    const deleteSingleLink = (url, categoryName) => {
        const category = state.bookmarks[categoryName];
        if (!category) return false;
        
        let parentIndexToDelete = -1;
        let parentModified = false;

        category.links.forEach((parent, parentIndex) => {
            const sublinkIndex = parent.sublinks.findIndex(s => s.url === url);
            if (sublinkIndex !== -1) {
                parent.sublinks.splice(sublinkIndex, 1);
                parentModified = true;
                if (parent.sublinks.length === 0) {
                    parentIndexToDelete = parentIndex;
                }
            }
        });
        if (parentModified) {
            if (parentIndexToDelete !== -1) {
                category.links.splice(parentIndexToDelete, 1);
            }
            if (state.activeSublinkUrl === url) {
                state.activeSublinkUrl = null;
                renderNotes();
            }
            category.modified = new Date().toISOString();
            return true;
        }
        return false;
    };

    const updateLinkTitle = (url, newTitle) => {
        let linkFound = false;
        for (const category in state.bookmarks) {
            for (const parent of state.bookmarks[category].links) {
                const sublink = parent.sublinks.find(s => s.url === url);
                if (sublink) {
                    sublink.title = newTitle;
                    sublink.modifiedTimestamp = new Date().toISOString();
                    state.bookmarks[category].modified = sublink.modifiedTimestamp;
                    linkFound = true;
                    break;
                }
            }
            if (linkFound) break;
        }
        if (linkFound) {
            saveData();
            updateView(); 
            if (state.activeSublinkUrl === url) {
                renderNotes();
            }
        }
    };
    
    const handleNavigation = ({ url, category }) => {
        state.activeCategory = category;
        state.activeSublinkUrl = url;
        switchToCategoryView();
        renderCategories(); 

        requestAnimationFrame(() => {
            const elementToActivate = linksTree.querySelector(`.sublink-item[data-url="${CSS.escape(url)}"]`);
            if (elementToActivate) {
                elementToActivate.scrollIntoView({ behavior: 'smooth', block: 'center' });
                
                elementToActivate.style.transition = 'box-shadow 0.3s ease-in-out';
                elementToActivate.style.boxShadow = '0 0 0 3px rgba(255, 215, 0, 0.7)';

                setTimeout(() => {
                    elementToActivate.style.boxShadow = '';
                }, 1200);
            }
            renderNotes();
        });
    };


    // --- Backup and Restore ---
    const handleBackup = () => {
        chrome.storage.sync.get(['bookmarks', 'settings'], (data) => {
            const dataToBackup = { bookmarks: data.bookmarks || {}, settings: data.settings || {} };
            const blob = new Blob([JSON.stringify(dataToBackup, null, 2)], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `LinkNotes_backup_${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(a.href);
        });
    };

    const mergeBookmarks = (newBookmarks) => {
        for (const categoryName in newBookmarks) {
             const restoredCategory = newBookmarks[categoryName];
            // This handles both old array format and new object format for categories
            const linksToMerge = Array.isArray(restoredCategory) ? restoredCategory : restoredCategory.links;
            
            // If category doesn't exist, add the whole category object
            if (!state.bookmarks[categoryName]) {
                state.bookmarks[categoryName] = restoredCategory; 
                continue;
            }

            const currentCategoryLinks = state.bookmarks[categoryName].links;

            // Merge links within the existing category
            for (const restoredParent of linksToMerge) {
                let currentParent = currentCategoryLinks.find(p => p.domain === restoredParent.domain);

                // If domain group doesn't exist, add it
                if (!currentParent) {
                    currentCategoryLinks.push(restoredParent);
                    continue;
                }

                // Add new sublinks to existing domain group
                for (const restoredSublink of restoredParent.sublinks) {
                    const sublinkExists = currentParent.sublinks.some(s => s.url === restoredSublink.url);
                    if (!sublinkExists) {
                        // Ensure timestamps are present
                        if(!restoredSublink.timestamp) restoredSublink.timestamp = new Date().toISOString();
                        if(!restoredSublink.modifiedTimestamp) restoredSublink.modifiedTimestamp = restoredSublink.timestamp;
                        currentParent.sublinks.push(restoredSublink);
                    }
                }
            }
            state.bookmarks[categoryName].modified = new Date().toISOString();
        }
    };

    const handleRestore = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const restoredData = JSON.parse(e.target.result);
                if (!restoredData.bookmarks) {
                    alert('Backup file seems to be invalid or empty.');
                    return;
                }
                
                state.importData = restoredData;
                restoreModalTitle.textContent = "Restore from Backup";
                restoreModalOverlay.style.display = 'flex';

            } catch (error) {
                console.error("Restore error:", error);
                alert('Error reading or parsing the backup file.');
            } finally {
                event.target.value = null;
            }
        };
        reader.readAsText(file);
    };

    // --- REWRITTEN Chrome Import ---
    const parseChromeHtml = (htmlString) => {
        const doc = new DOMParser().parseFromString(htmlString, "text/html");
        const importedBookmarks = {};
        const now = new Date().toISOString();
    
        const addBookmark = (categoryName, linkElement) => {
            if (!categoryName || !linkElement) return;
    
            const url = linkElement.href;
            const title = linkElement.textContent.trim();
            if (!url || url.startsWith("javascript:")) return;
    
            // Ensure the category exists in the final object
            if (!importedBookmarks[categoryName]) {
                importedBookmarks[categoryName] = {
                    links: [],
                    created: now,
                    modified: now,
                };
            }
    
            try {
                const parsedUrl = new URL(url);
                const domain = parsedUrl.hostname;
    
                let parent = importedBookmarks[categoryName].links.find((p) => p.domain === domain);
                if (!parent) {
                    parent = {
                        domain: domain,
                        favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=32`,
                        sublinks: [],
                    };
                    importedBookmarks[categoryName].links.push(parent);
                }
    
                if (!parent.sublinks.some((s) => s.url === url)) {
                    parent.sublinks.push({
                        url: url,
                        title: title || url,
                        timestamp: linkElement.getAttribute("add_date") ? new Date(parseInt(linkElement.getAttribute("add_date")) * 1000).toISOString() : now,
                        modifiedTimestamp: linkElement.getAttribute("last_modified") ? new Date(parseInt(linkElement.getAttribute("last_modified")) * 1000).toISOString() : now,
                        notes: "",
                    });
                }
            } catch (e) {
                console.warn(`Skipping invalid URL during import: ${url}`);
            }
        };
    
        const processDl = (dlElement, currentCategory) => {
            if (!dlElement) return;
    
            // Iterate over the direct children of the DL element
            for (const child of dlElement.children) {
                // Handle the <p> tag wrapper that Chrome sometimes adds
                if (child.tagName.toLowerCase() === 'p') {
                    processDl(child, currentCategory); // Recurse into the <P> tag
                    continue;
                }
                
                if (child.tagName.toLowerCase() !== 'dt') {
                    continue;
                }
    
                const h3 = child.querySelector('h3');
                const a = child.querySelector('a');
                
                if (h3) {
                    // It's a folder. The links are in the next sibling, which is a DL.
                    const folderName = h3.textContent.trim();
                    const nextDl = child.nextElementSibling;
                    if (folderName && nextDl && nextDl.tagName.toLowerCase() === 'dl') {
                        // Create a nested category name, e.g., "Work/Projects"
                        const newCategoryName = currentCategory ? `${currentCategory}/${folderName}` : folderName;
                        processDl(nextDl, newCategoryName);
                    }
                } else if (a && currentCategory) {
                    // It's a bookmark. Add it to the current category.
                    addBookmark(currentCategory, a);
                }
            }
        };
    
        // Find the first DL after the main H1 title
        const firstDl = doc.querySelector('h1 + dl');
        if (firstDl) {
            // Start with a default category for top-level bookmarks (like those on the bookmarks bar)
            processDl(firstDl, "Imported"); 
        } else {
            // Fallback if the H1 is missing
            const bodyDl = doc.body.querySelector('dl');
            if (bodyDl) {
                processDl(bodyDl, "Imported");
            }
        }
    
        return { bookmarks: importedBookmarks };
    };

    const handleChromeImport = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const parsedData = parseChromeHtml(e.target.result);
                if (Object.keys(parsedData.bookmarks).length === 0) {
                     alert('Could not find any valid bookmark folders in the selected file.');
                     return;
                }

                state.importData = parsedData;
                restoreModalTitle.textContent = "Import from Chrome";
                restoreModalOverlay.style.display = 'flex';

            } catch (error) {
                console.error("Chrome Import error:", error);
                alert('Error reading or parsing the HTML file.');
            } finally {
                event.target.value = null; // Reset file input
            }
        };
        reader.readAsText(file);
    };

    // --- Selection Logic ---
    const toggleSelectionMode = (forceState) => {
        state.selectionMode = typeof forceState === 'boolean' ? forceState : !state.selectionMode;

        if (!state.selectionMode) {
            state.selectedLinks = [];
        }

        updateView();
    };
    
    const updateSelectionUI = () => {
        mainContainer.classList.toggle('selection-active', state.selectionMode);
        selectionActions.style.display = state.selectionMode ? 'flex' : 'none';
        pasteLinkInput.parentElement.style.display = state.selectionMode ? 'none' : 'flex';
        sortingControls.style.display = state.selectionMode ? 'none' : (state.activeCategory ? 'flex' : 'none');
    };

    const handleSelectionChange = (url, category, isSelected) => {
        const linkIndex = state.selectedLinks.findIndex(link => link.url === url);
        if (isSelected && linkIndex === -1) {
            state.selectedLinks.push({ url, category });
        } else if (!isSelected && linkIndex > -1) {
            state.selectedLinks.splice(linkIndex, 1);
        }
        const itemElement = linksTree.querySelector(`.sublink-item[data-url="${CSS.escape(url)}"]`);
        if (itemElement) {
            itemElement.classList.toggle('selected', isSelected);
        }
    };

    const selectAllLinks = () => {
        const allVisibleCheckboxes = linksTree.querySelectorAll('.selection-checkbox');
        allVisibleCheckboxes.forEach(checkbox => {
            if (!checkbox.checked) {
                checkbox.checked = true;
                handleSelectionChange(checkbox.dataset.url, checkbox.dataset.category, true);
            }
        });
    };

    const deleteSelectedLinks = () => {
        if (state.selectedLinks.length === 0) return;
        if (confirm(`Are you sure you want to delete ${state.selectedLinks.length} selected link(s)?`)) {
            state.selectedLinks.forEach(link => {
                deleteSingleLink(link.url, link.category);
            });
            saveData();
            toggleSelectionMode(false);
        }
    };
    
    const moveSelectedLinks = (targetCategory) => {
        if (state.selectedLinks.length === 0 || !targetCategory) return;
        
        const linksToMove = [];
        state.selectedLinks.forEach(selected => {
            for (const categoryName in state.bookmarks) {
                if (categoryName === selected.category) {
                     for (const parent of state.bookmarks[categoryName].links) {
                        const sublink = parent.sublinks.find(s => s.url === selected.url);
                        if (sublink) {
                            linksToMove.push({ ...sublink, originalCategory: selected.category });
                            break;
                        }
                    }
                }
            }
        });

        linksToMove.forEach(link => {
            addLink(link.url, link.title, targetCategory, link.notes, link.timestamp, link.modifiedTimestamp);
        });

        linksToMove.forEach(link => {
            deleteSingleLink(link.url, link.originalCategory);
        });

        alert(`${linksToMove.length} link(s) moved to "${targetCategory}".`);
        toggleSelectionMode(false);
    };


    // --- Event Listeners ---
    addCategoryBtn.addEventListener('click', addCategory);
    newCategoryInput.addEventListener('keyup', (e) => { if (e.key === 'Enter') addCategory(); });

    notesViewToggleBtn.addEventListener('click', () => toggleNotesView());

    categorySearchInput.addEventListener('input', (e) => {
        renderCategories(e.target.value);
    });

    categorySortSelect.addEventListener('change', (e) => {
        state.settings.categorySortOrder = e.target.value;
        saveSettings();
        renderCategories(categorySearchInput.value);
    });


    categoryList.addEventListener('click', (e) => {
        if (state.selectionMode) return;
        const li = e.target.closest('li');
        if (li && li.dataset.category) {
            state.activeCategory = li.dataset.category;
            state.activeSublinkUrl = null;
            switchToCategoryView();
            renderCategories();
            renderNotes();
        }
    });

    linksTree.addEventListener('click', (e) => {
        const checkbox = e.target.closest('.selection-checkbox');
        if (state.selectionMode && checkbox) {
            handleSelectionChange(checkbox.dataset.url, checkbox.dataset.category, checkbox.checked);
            return;
        }

        if (state.selectionMode) {
            const sublinkItem = e.target.closest('.sublink-item');
            if (sublinkItem) {
                const associatedCheckbox = sublinkItem.querySelector('.selection-checkbox');
                if (associatedCheckbox) {
                    associatedCheckbox.checked = !associatedCheckbox.checked;
                    handleSelectionChange(associatedCheckbox.dataset.url, associatedCheckbox.dataset.category, associatedCheckbox.checked);
                }
            }
            return;
        }

        const openBtn = e.target.closest('.open-link-btn');
        if (openBtn) {
            chrome.tabs.create({ url: openBtn.closest('.sublink-item').dataset.url });
            return;
        }
        const deleteBtn = e.target.closest('.delete-link-btn');
        if (deleteBtn) {
            const sublinkItem = deleteBtn.closest('.sublink-item');
            const urlToDelete = sublinkItem.dataset.url;
            const category = sublinkItem.dataset.category;
            if (confirm('Are you sure you want to delete this link?')) {
                if(deleteSingleLink(urlToDelete, category)) {
                    saveData();
                    updateView();
                }
            }
            return;
        }
        const sublinkItem = e.target.closest('.sublink-item');
        if (sublinkItem && !e.target.closest('.expand-note-btn')) {
            state.activeSublinkUrl = sublinkItem.dataset.url;
            document.querySelectorAll('.sublink-item.active').forEach(el => el.classList.remove('active'));
            sublinkItem.classList.add('active');
            renderNotes();
        }
    });

    linksTree.addEventListener('dblclick', (e) => {
        if(state.selectionMode) return;
        const titleSpan = e.target.closest('.sublink-title');
        if (!titleSpan) return;
        titleSpan.contentEditable = true;
        titleSpan.focus();
        const range = document.createRange();
        range.selectNodeContents(titleSpan);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        const originalText = titleSpan.textContent;
        const sublinkUrl = titleSpan.closest('.sublink-item').dataset.url;
        const saveTitleChange = () => {
            titleSpan.contentEditable = false;
            const newTitle = titleSpan.textContent.trim();
            if (newTitle && newTitle !== originalText) {
                updateLinkTitle(sublinkUrl, newTitle);
            } else {
                titleSpan.textContent = originalText;
            }
            titleSpan.removeEventListener('blur', saveTitleChange);
            titleSpan.removeEventListener('keydown', handleKeydown);
        };
        const handleKeydown = (ev) => {
            if (ev.key === 'Enter') {
                ev.preventDefault();
                saveTitleChange();
            } else if (ev.key === 'Escape') {
                titleSpan.textContent = originalText;
                saveTitleChange();
            }
        };
        titleSpan.addEventListener('blur', saveTitleChange);
        titleSpan.addEventListener('keydown', handleKeydown);
    });

    pasteLinkInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter' && state.activeCategory && state.activeCategory !== '--all-links--') {
            const url = pasteLinkInput.value.trim();
            addLink(url, url, state.activeCategory); 
            pasteLinkInput.value = '';
        }
    });

    notesEditor.addEventListener('keyup', () => {
        clearTimeout(state.notesSaveTimer);
        // Live preview update
        if (state.settings.notesView === 'preview') {
            notesPreview.innerHTML = parseMarkdown(notesEditor.value);
        }
        state.notesSaveTimer = setTimeout(() => {
            if (state.activeSublinkUrl) {
                for (const category in state.bookmarks) {
                    for (const parent of state.bookmarks[category].links) {
                        const sublink = parent.sublinks.find(s => s.url === state.activeSublinkUrl);
                        if (sublink) {
                            const now = new Date().toISOString();
                            sublink.notes = notesEditor.value;
                            sublink.modifiedTimestamp = now;
                            state.bookmarks[category].modified = now;
                            saveData();
                            updateView(); 
                            return;
                        }
                    }
                }
            }
        }, 500);
    });

    toggleThemeBtn.addEventListener('click', () => {
        const themes = ['light', 'dark', 'black'];
        const currentThemeIndex = themes.indexOf(state.settings.theme);
        state.settings.theme = themes[(currentThemeIndex + 1) % themes.length];
        applyTheme();
        saveSettings();
    });

    toggleLeftPanelBtn.addEventListener('click', () => {
        state.settings.leftPanelCollapsed = !state.settings.leftPanelCollapsed;
        applyLeftPanelState();
        saveSettings();
    });

    sortSelect.addEventListener('change', (e) => {
        state.activeSortOrder = e.target.value;
        updateView();
    });

    backupBtn.addEventListener('click', handleBackup);
    restoreBtn.addEventListener('click', () => restoreInput.click());
    restoreInput.addEventListener('change', handleRestore);
    importChromeBtn.addEventListener('click', () => importChromeInput.click());
    importChromeInput.addEventListener('change', handleChromeImport);


    // Modal Button Listeners
    restoreMergeBtn.addEventListener('click', () => {
        if (!state.importData) return;
        mergeBookmarks(state.importData.bookmarks);
        saveData();
        alert('Data merged successfully! The page will now refresh.');
        window.location.reload();
    });

    restoreOverwriteBtn.addEventListener('click', () => {
        if (!state.importData) return;
        if (confirm('OVERWRITE: Are you sure you want to replace all current data with the file content? This cannot be undone.')) {
            state.bookmarks = state.importData.bookmarks || {};
            // Run migration on the newly imported data to ensure its structure is up-to-date
            migrateData({ bookmarks: state.bookmarks });
            
            // Apply settings from backup if they exist
            if (state.importData.settings) {
                state.settings = { ...state.settings, ...state.importData.settings };
                saveSettings();
            }
            saveData();
            alert('Data overwritten successfully! The page will now refresh.');
            window.location.reload();
        } else {
            alert('Action cancelled.');
            restoreModalOverlay.style.display = 'none';
        }
    });

    restoreCancelBtn.addEventListener('click', () => {
        state.importData = null;
        restoreModalOverlay.style.display = 'none';
    });


    searchBtn.addEventListener('click', () => performSearch(searchInput.value));
    searchInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') performSearch(searchInput.value);
    });
    searchInput.addEventListener('input', (e) => {
        if (e.target.value === '') switchToCategoryView();
    });

    zoomSlider.addEventListener('input', () => {
        applyZoom(zoomSlider.value);
    });
    zoomSlider.addEventListener('change', () => {
        saveSettings();
    });
    zoomResetBtn.addEventListener('click', () => {
        applyZoom(100);
        saveSettings();
    });
    dataOptionsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dataOptionsPopup.style.display = dataOptionsPopup.style.display === 'block' ? 'none' : 'block';
    });
    document.addEventListener('click', () => {
        dataOptionsPopup.style.display = 'none';
    });


    selectModeBtn.addEventListener('click', () => toggleSelectionMode(true));
    cancelSelectionBtn.addEventListener('click', () => toggleSelectionMode(false));
    selectAllBtn.addEventListener('click', selectAllLinks);
    deleteSelectedBtn.addEventListener('click', deleteSelectedLinks);
    moveSelectedBtn.addEventListener('click', () => {
        if (state.selectedLinks.length === 0) {
            alert("No links selected.");
            return;
        }
        moveCategorySelect.innerHTML = '';
        Object.keys(state.bookmarks).sort().forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            moveCategorySelect.appendChild(option);
        });
        moveNewCategoryInput.value = '';
        moveModalOverlay.style.display = 'flex';
    });

    moveCancelBtn.addEventListener('click', () => {
        moveModalOverlay.style.display = 'none';
    });
    moveConfirmBtn.addEventListener('click', () => {
        const newCatName = moveNewCategoryInput.value.trim();
        const existingCat = moveCategorySelect.value;
        let targetCategory;

        if (newCatName) {
            targetCategory = newCatName;
            if (!state.bookmarks[targetCategory]) {
                const now = new Date().toISOString();
                state.bookmarks[targetCategory] = { links: [], created: now, modified: now };
            }
        } else if (existingCat) {
            targetCategory = existingCat;
        } else {
            alert("Please select an existing category or provide a new one.");
            return;
        }

        moveSelectedLinks(targetCategory);
        moveModalOverlay.style.display = 'none';
    });


    aboutBtn.addEventListener('click', () => {
        aboutModalOverlay.style.display = 'flex';
    });
    aboutModalCloseBtn.addEventListener('click', () => {
        aboutModalOverlay.style.display = 'none';
    });
    aboutModalOverlay.addEventListener('click', (e) => {
        if (e.target === aboutModalOverlay) {
            aboutModalOverlay.style.display = 'none';
        }
    });


    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "populateLinkInput") {
            if (state.activeCategory && state.activeCategory !== '--all-links--') {
                pasteLinkInput.value = request.payload.url;
                pasteLinkInput.focus();
                sendResponse({ status: "input populated" });
            } else {
                alert("Please select a category before adding a link from the context menu.");
                sendResponse({ status: "failed, no category selected" });
            }
        } else if (request.action === "navigateToLink") {
            if (!dataLoaded) {
                pendingNavigation = request.payload;
            } else {
                handleNavigation(request.payload);
            }
            sendResponse({ status: "received" });
        }
        return true;
    });

    linksTree.addEventListener('dragstart', (e) => {
        if (state.selectionMode || state.viewMode === 'search' || state.activeCategory === '--all-links--') {
            e.preventDefault();
            return;
        }
        draggedItem = e.target.closest('.parent-item, .sublink-item');
        if (draggedItem) {
            setTimeout(() => draggedItem.classList.add('dragging'), 0);
        }
    });

    linksTree.addEventListener('dragover', (e) => { e.preventDefault(); });

    linksTree.addEventListener('drop', (e) => {
        e.preventDefault();
        if (!draggedItem) return;

        const dropTarget = e.target.closest('.sublink-item, .parent-item');
        draggedItem.classList.remove('dragging');

        if (!dropTarget) {
            draggedItem = null;
            return;
        }
        
        const categoryData = state.bookmarks[state.activeCategory].links;
        if (draggedItem.classList.contains('sublink-item') && dropTarget.classList.contains('sublink-item')) {
            const parentContainer = dropTarget.closest('.parent-item');
            if (draggedItem.closest('.parent-item') === parentContainer) {
                const parentObj = categoryData.find(p => p.domain === parentContainer.dataset.domain);
                const sublinks = parentObj.sublinks;
                const draggedIndex = sublinks.findIndex(s => s.url === draggedItem.dataset.url);
                const targetIndex = sublinks.findIndex(s => s.url === dropTarget.dataset.url);
                if (draggedIndex > -1 && targetIndex > -1) {
                    const [removed] = sublinks.splice(draggedIndex, 1);
                    sublinks.splice(targetIndex, 0, removed);
                    state.bookmarks[state.activeCategory].modified = new Date().toISOString();
                    saveData();
                    renderLinks();
                }
            }
        } else if (draggedItem.classList.contains('parent-item') && dropTarget.classList.contains('parent-item')) {
            const draggedIndex = categoryData.findIndex(p => p.domain === draggedItem.dataset.domain);
            const targetIndex = categoryData.findIndex(p => p.domain === dropTarget.dataset.domain);
            if (draggedIndex > -1 && targetIndex > -1) {
                const [removed] = categoryData.splice(draggedIndex, 1);
                categoryData.splice(targetIndex, 0, removed);
                state.bookmarks[state.activeCategory].modified = new Date().toISOString();
                saveData();
                renderLinks();
            }
        }
        draggedItem = null;
    });

    linksTree.addEventListener('dragend', () => {
        if (draggedItem) {
            draggedItem.classList.remove('dragging');
            draggedItem = null;
        }
    });

    const initLeftResizing = () => {
        resizerLeft.addEventListener('mousedown', (e) => {
            e.preventDefault();
            document.body.style.cursor = 'col-resize';
            mainContainer.style.userSelect = 'none';

            const onMouseMove = (moveEvent) => {
                const newLeftWidth = moveEvent.clientX - mainContainer.getBoundingClientRect().left;
                const remainingWidth = mainContainer.offsetWidth - newLeftWidth - resizerLeft.offsetWidth - resizer.offsetWidth;
                
                if (newLeftWidth > 150 && remainingWidth > 305) { // 150px for center + 150px for right + 5px for resizer
                    panelLeft.style.flexBasis = `${newLeftWidth}px`;
                    panelLeft.style.flexGrow = '0';
                    panelLeft.style.flexShrink = '0';
                }
            };
            const onMouseUp = () => {
                document.body.style.cursor = 'default';
                mainContainer.style.userSelect = 'auto';
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    };

    const initResizing = () => {
        resizer.addEventListener('mousedown', () => {
            document.body.style.cursor = 'col-resize';
            mainContainer.style.userSelect = 'none';

            const onMouseMove = (e) => {
                const leftPanelWidth = mainContainer.classList.contains('left-panel-collapsed') ? 0 : panelLeft.offsetWidth;
                const totalWidth = mainContainer.offsetWidth - resizer.offsetWidth - leftPanelWidth;
                const newCenterWidth = e.clientX - mainContainer.getBoundingClientRect().left - leftPanelWidth;
                const newRightWidth = totalWidth - newCenterWidth;
                if (newCenterWidth > 150 && newRightWidth > 150) {
                    panelCenter.style.flexBasis = `${newCenterWidth}px`;
                    panelRight.style.flexBasis = `${newRightWidth}px`;
                    panelCenter.style.flexGrow = '0';
                    panelRight.style.flexGrow = '0';
                }
            };
            const onMouseUp = () => {
                document.body.style.cursor = 'default';
                mainContainer.style.userSelect = 'auto';
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    };

    // --- Initial Load ---
    loadData();
    initResizing();
    initLeftResizing();

    // NEW: Listen for storage changes to auto-refresh the UI
    chrome.storage.onChanged.addListener((changes, namespace) => {
        // Check if the 'bookmarks' data has changed in sync storage
        if (namespace === 'sync' && changes.bookmarks) {
            console.log('LinkNotes Manager: Detected a change in bookmarks, reloading view.');
            
            // Simply call your existing loadData() function to refresh the entire page
            loadData();
        }
    });
    
});