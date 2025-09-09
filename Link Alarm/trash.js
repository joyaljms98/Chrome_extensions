// trash.js
import { loadFromStorage, saveToStorage } from './storage.js';
import { showConfirmation } from './confirmation.js';
import { render as renderTasks } from './tasks.js';

const trashListEl = document.getElementById('trashList');

function renderTrash() {
    const trash = loadFromStorage('trash', []);
    trashListEl.innerHTML = '';

    if (trash.length === 0) {
        trashListEl.innerHTML = '<p class="empty-trash-msg">Trash is empty.</p>';
        return;
    }

    trash.forEach(task => {
        const item = document.createElement('div');
        item.className = 'trash-item';

        const deletionTime = task.deletedAt 
            ? new Date(task.deletedAt).toLocaleString() 
            : 'Unknown';
        
        item.innerHTML = `
            <div class="trash-item-details">
                <span class="trash-item-title">${task.title}</span>
                <span class="trash-item-info">Deleted: ${deletionTime}</span>
                ${task.link ? `<a href="${task.link}" target="_blank" class="trash-item-link" title="${task.link}">${task.link}</a>` : ''}
            </div>
            <div class="trash-item-actions">
                <button class="restore-btn" data-id="${task.id}" title="Restore Task">Restore</button>
                <button class="delete-permanently-btn" data-id="${task.id}" title="Delete Permanently">Delete</button>
            </div>
        `;
        trashListEl.appendChild(item);
    });
}

function restoreTask(taskId) {
    let trash = loadFromStorage('trash', []);
    let tasks = loadFromStorage('tasks', []);

    const taskToRestore = trash.find(t => t.id === taskId);
    if (!taskToRestore) return;

    tasks.push(taskToRestore);
    const newTrash = trash.filter(t => t.id !== taskId);

    saveToStorage('tasks', tasks);
    saveToStorage('trash', newTrash);

    renderTrash();
    renderTasks();
}

function deletePermanently(taskId) {
    let trash = loadFromStorage('trash', []);
    const newTrash = trash.filter(t => t.id !== taskId);
    saveToStorage('trash', newTrash);
    renderTrash();
}

function clearAllTrash() {
    saveToStorage('trash', []);
    renderTrash();
}

export function initializeTrash() {
    const trashBtn = document.getElementById('trashBtn');
    const trashModal = document.getElementById('trashModal');
    const closeTrashBtn = document.getElementById('closeTrashBtn');
    const clearTrashBtn = document.getElementById('clearTrashBtn');

    if (!trashBtn || !trashModal || !closeTrashBtn || !clearTrashBtn) return;

    trashBtn.addEventListener('click', () => {
        renderTrash();
        trashModal.classList.remove('hidden');
    });

    closeTrashBtn.addEventListener('click', () => {
        trashModal.classList.add('hidden');
    });

    clearTrashBtn.addEventListener('click', async () => {
        const confirmed = await showConfirmation('Are you sure you want to permanently delete all items? This action cannot be undone.');
        if (confirmed) {
            clearAllTrash();
        }
    });

    trashListEl.addEventListener('click', async (e) => {
        const target = e.target.closest('button');
        if (!target) return;

        const taskId = target.dataset.id;
        const trash = loadFromStorage('trash', []);
        const task = trash.find(t => t.id === taskId);
        if (!task) return;
            
        if (target.classList.contains('restore-btn')) {
            const confirmed = await showConfirmation(`Are you sure you want to restore "${task.title}"?`);
            if (confirmed) {
                restoreTask(taskId);
                if (loadFromStorage('trash', []).length === 0) {
                    renderTrash();
                } else {
                    trashModal.classList.add('hidden');
                }
            }
        } else if (target.classList.contains('delete-permanently-btn')) {
            const confirmed = await showConfirmation(`Are you sure you want to PERMANENTLY delete "${task.title}"?`);
            if (confirmed) {
                deletePermanently(taskId);
            }
        }
    });
}