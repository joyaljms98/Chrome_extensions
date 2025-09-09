// shortcuts.js
import { loadFromStorage, saveToStorage } from './storage.js';
import { showConfirmation } from './confirmation.js';

const shortcutContainer = document.getElementById("shortcuts");
const shortcutModal = document.getElementById('shortcutModal');
const shortcutForm = document.getElementById('shortcutForm');
const shortcutModalTitle = document.getElementById('shortcutModalTitle');
const cancelShortcutModalBtn = document.getElementById('cancelShortcutModal');
const manageShortcutsBtn = document.getElementById('manageShortcutsBtn');
const shortcutManagerModal = document.getElementById('shortcutManagerModal');
const managerModalList = document.getElementById('managerModalList');
const shortcutSearchInput = document.getElementById('shortcutSearchInput');
const addNewShortcutBtn = document.getElementById('addNewShortcutFromManagerBtn');
const closeManagerBtn = document.getElementById('closeShortcutManagerBtn');

let mainDraggedItemIndex = null;
let managerDraggedItemIndex = null;

export function openShortcutModal(shortcut = {}, index = -1) {
    shortcutForm.reset();
    document.getElementById('shortcutIndex').value = index;
    shortcutModalTitle.textContent = index > -1 ? "Edit Shortcut" : "Add Shortcut";
    if (shortcut.name) document.getElementById('shortcutName').value = shortcut.name;
    if (shortcut.url) document.getElementById('shortcutUrl').value = shortcut.url;
    shortcutModal.classList.remove('hidden');
}

function closeShortcutModal() {
    shortcutModal.classList.add('hidden');
}

function renderShortcuts() {
    const shortcuts = loadFromStorage("shortcuts", []);
    shortcutContainer.innerHTML = "";

    shortcuts.forEach((shortcut, index) => {
        const a = document.createElement("a");
        a.href = shortcut.url;
        // a.target = "_blank"; // REMOVED to open in the same tab
        a.rel = "noopener noreferrer";
        a.title = shortcut.url;
        a.classList.add("shortcut-item");
        a.dataset.index = index;
        a.draggable = true;

        try {
            const domain = new URL(shortcut.url).hostname;
            a.innerHTML = `
                <img src="https://www.google.com/s2/favicons?sz=64&domain_url=${domain}" alt="" class="shortcut-favicon">
                <span class="shortcut-name">${shortcut.name}</span>
            `;
        } catch (e) {
            a.innerHTML = `<span class="shortcut-name">${shortcut.name}</span>`;
        }
        shortcutContainer.appendChild(a);
    });

    const splitBtnContainer = document.createElement("div");
    splitBtnContainer.className = "shortcut-item add-shortcut-split-btn";
    splitBtnContainer.innerHTML = `
        <div class="split-btn-top" title="Add new shortcut">
            <span class="shortcut-add-icon">+</span>
            <span>Add</span>
        </div>
        <div class="split-btn-bottom" title="Manage shortcuts">
            <span>✏️ Edit</span>
        </div>
    `;

    splitBtnContainer.querySelector('.split-btn-top').addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        openShortcutModal();
    });

    splitBtnContainer.querySelector('.split-btn-bottom').addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        renderManagerList();
        shortcutManagerModal.classList.remove('hidden');
    });
    shortcutContainer.appendChild(splitBtnContainer);

    // Dispatch event so index.js can update arrows
    shortcutContainer.dispatchEvent(new Event('shortcutsrendered'));
}

function getDragAfterElementVertical(container, y) {
    const draggableElements = [...container.querySelectorAll('.manager-item:not(.dragging)')];
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function renderManagerList(filter = '') {
    const shortcuts = loadFromStorage("shortcuts", []);
    managerModalList.innerHTML = "";

    const filteredShortcuts = shortcuts.filter(s => 
        s.name.toLowerCase().includes(filter.toLowerCase()) || 
        s.url.toLowerCase().includes(filter.toLowerCase())
    );

    if (filteredShortcuts.length === 0) {
        managerModalList.innerHTML = '<p style="text-align:center; opacity:0.7;">No shortcuts found.</p>';
        return;
    }

    filteredShortcuts.forEach(shortcut => {
        const originalIndex = shortcuts.findIndex(s => s === shortcut);
        const item = document.createElement('div');
        item.className = 'manager-item';
        item.draggable = true;
        item.dataset.index = originalIndex;

        item.innerHTML = `
            <span class="drag-handle">⠿</span>
            <div class="manager-item-info">
                <p><strong>${shortcut.name}</strong></p>
                <p class="url">${shortcut.url}</p>
            </div>
            <div class="manager-item-actions">
                <button class="edit-shortcut-btn" title="Edit Shortcut">✏️</button>
                <button class="delete-shortcut-btn" title="Delete Shortcut">🗑️</button>
            </div>
        `;

        item.querySelector('.edit-shortcut-btn').addEventListener('click', () => openShortcutModal(shortcut, originalIndex));
        item.querySelector('.delete-shortcut-btn').addEventListener('click', async () => {
            if (await showConfirmation(`Are you sure you want to delete the "${shortcut.name}" shortcut?`)) {
                const currentShortcuts = loadFromStorage("shortcuts", []);
                currentShortcuts.splice(originalIndex, 1);
                saveToStorage("shortcuts", currentShortcuts);
                renderShortcuts();
                renderManagerList(shortcutSearchInput.value);
            }
        });
        managerModalList.appendChild(item);
    });
}

function getDragAfterElementHorizontal(container, x) {
    const draggableElements = [...container.querySelectorAll('.shortcut-item:not(.dragging):not(.add-shortcut-split-btn)')];
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = x - box.left - box.width / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

export function initializeShortcuts() {
    renderShortcuts();

    shortcutForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('shortcutName').value.trim();
        let url = document.getElementById('shortcutUrl').value.trim();
        const index = parseInt(document.getElementById('shortcutIndex').value, 10);
        if (!url.match(/^https?:\/\//i)) {
            url = `https://${url}`;
        }

        const shortcuts = loadFromStorage("shortcuts", []);
        const newShortcut = { name, url };

        if (index > -1) shortcuts[index] = newShortcut;
        else shortcuts.push(newShortcut);

        saveToStorage("shortcuts", shortcuts);
        renderShortcuts();
        renderManagerList();
        closeShortcutModal();
    });

    cancelShortcutModalBtn.addEventListener('click', closeShortcutModal);

    shortcutContainer.addEventListener('dragstart', e => {
        if (e.target.classList.contains('shortcut-item') && e.target.draggable) {
            mainDraggedItemIndex = parseInt(e.target.dataset.index, 10);
            setTimeout(() => e.target.classList.add('dragging'), 0);
            
            // Create ghost image
            const clone = e.target.cloneNode(true);
            clone.classList.add('drag-ghost');
            document.body.appendChild(clone);
            e.dataTransfer.setDragImage(clone, e.target.offsetWidth / 2, e.target.offsetHeight / 2);
            setTimeout(() => document.body.removeChild(clone), 0);
        }
    });

    shortcutContainer.addEventListener('dragend', e => {
        if (mainDraggedItemIndex !== null && e.target.classList.contains('shortcut-item')) {
            e.target.classList.remove('dragging');
        }
        mainDraggedItemIndex = null;
    });
    
    shortcutContainer.addEventListener('dragover', e => {
         e.preventDefault();
    });

    shortcutContainer.addEventListener('drop', e => {
        e.preventDefault();
        if (mainDraggedItemIndex === null) return;

        const afterElement = getDragAfterElementHorizontal(shortcutContainer, e.clientX);
        let shortcuts = loadFromStorage("shortcuts", []);
        const draggedItem = shortcuts.splice(mainDraggedItemIndex, 1)[0];
        if (!draggedItem) return;

        if (afterElement === undefined) {
            shortcuts.push(draggedItem);
        } else {
            const dropIndex = parseInt(afterElement.dataset.index);
            // We need to find the new index in the potentially re-ordered array
            const newIndex = shortcuts.findIndex(s => s.url === afterElement.href);
            shortcuts.splice(newIndex, 0, draggedItem);
        }
        
        saveToStorage("shortcuts", shortcuts);
        renderShortcuts();
    });
}

export function initializeShortcutManager() {
    manageShortcutsBtn.addEventListener('click', () => {
        renderManagerList();
        shortcutManagerModal.classList.remove('hidden');
        document.getElementById('sideMenu').classList.remove('open');
        document.querySelector('.container').classList.remove('menu-open');
        document.getElementById('settingsModal').classList.add('hidden');
    });

    closeManagerBtn.addEventListener('click', () => shortcutManagerModal.classList.add('hidden'));
    addNewShortcutBtn.addEventListener('click', () => openShortcutModal());
    shortcutSearchInput.addEventListener('input', () => renderManagerList(shortcutSearchInput.value));

    managerModalList.addEventListener('dragstart', e => {
        if (e.target.classList.contains('manager-item')) {
            managerDraggedItemIndex = parseInt(e.target.dataset.index, 10);
            setTimeout(() => e.target.classList.add('dragging'), 0);

            // Create ghost image
            const clone = e.target.cloneNode(true);
            clone.classList.add('drag-ghost');
            document.body.appendChild(clone);
            e.dataTransfer.setDragImage(clone, e.target.offsetWidth / 2, 20); // 20px offset for better feel
            setTimeout(() => document.body.removeChild(clone), 0);
        }
    });

    managerModalList.addEventListener('dragend', e => {
        if (managerDraggedItemIndex !== null && e.target.classList.contains('manager-item')) {
            e.target.classList.remove('dragging');
        }
        managerDraggedItemIndex = null;
    });

    managerModalList.addEventListener('dragover', e => e.preventDefault());

    managerModalList.addEventListener('drop', e => {
        e.preventDefault();
        if (managerDraggedItemIndex === null) return;

        let shortcuts = loadFromStorage("shortcuts", []);
        const draggedItem = shortcuts.splice(managerDraggedItemIndex, 1)[0];
        const afterElement = getDragAfterElementVertical(managerModalList, e.clientY);

        if (afterElement == null) {
            shortcuts.push(draggedItem);
        } else {
            const newIndex = parseInt(afterElement.dataset.index);
            shortcuts.splice(newIndex, 0, draggedItem);
        }
        saveToStorage("shortcuts", shortcuts);
        renderManagerList(shortcutSearchInput.value);
        renderShortcuts();
    });
}