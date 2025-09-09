// tasks.js
import { loadFromStorage, saveToStorage } from './storage.js';
import { scheduleAlarms } from './alarms.js';
import { showConfirmation } from './confirmation.js';

const taskContainer = document.getElementById("taskCarousel");
const modal = document.getElementById("taskModal");
const form = document.getElementById("taskForm");
const categorySearchInput = document.getElementById('categorySearch');
const closeTaskModalBtn = document.getElementById('closeTaskModalBtn');
const recurrenceEndDateInput = document.getElementById('recurrenceEndDate');
const taskDateInput = document.getElementById('taskDate');
const dateErrorEl = document.getElementById('dateError');


let currentCategory = 'All';
let getHasDragged = () => false;

function formatTo12Hour(timeString) {
    if (!timeString) return '';
    const [hourString, minute] = timeString.split(':');
    const hour = parseInt(hourString, 10);
    const suffix = hour >= 12 ? 'PM' : 'AM';
    const convertedHour = ((hour + 11) % 12 + 1);
    return `${convertedHour}:${minute} ${suffix}`;
}

function getTasks() { return loadFromStorage('tasks', []); }
function saveTasks(tasks) {
    saveToStorage('tasks', tasks);
    scheduleAlarms();
    render();
}

function deleteTask(taskId) {
    let tasks = getTasks();
    const taskToDelete = tasks.find(t => t.id === taskId);
    if (!taskToDelete) return;
    taskToDelete.deletedAt = new Date().toISOString(); 
    let trash = loadFromStorage('trash', []);
    trash.unshift(taskToDelete);
    if (trash.length > 20) trash = trash.slice(0, 20);
    saveToStorage('trash', trash);
    const updatedTasks = tasks.filter(t => t.id !== taskId);
    saveTasks(updatedTasks);
}

function timeToDate(dateStr, timeStr) {
    const [hour, min] = timeStr.split(":").map(Number);
    const d = new Date(dateStr);
    d.setHours(hour, min, 0, 0);
    return d;
}

function scrollToCurrentTask() {
    const currentTaskCard = document.querySelector('.task-card.current-task');
    if (currentTaskCard) {
        currentTaskCard.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
}

function validateDates() {
    const startDate = taskDateInput.value;
    const endDate = recurrenceEndDateInput.value;

    if (startDate && endDate) {
        if (new Date(endDate) < new Date(startDate)) {
            dateErrorEl.textContent = "End date cannot be before the start date.";
            dateErrorEl.style.display = 'block';
            return false;
        }
    }
    
    dateErrorEl.style.display = 'none';
    dateErrorEl.textContent = '';
    return true;
}

function renderTasks() {
    const allTasks = getTasks();
    const today = new Date();
    
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;
    
    const weekday = today.getDay();

    const tasksForDisplay = allTasks.filter(t => {
        if (t.recurrenceEndDate) {
            const endDate = new Date(t.recurrenceEndDate);
            endDate.setHours(23, 59, 59, 999);
            
            if (endDate < today) {
                return false;
            }
        }
        
        const creationDate = new Date(t.createdAt || '1970-01-01');
        creationDate.setHours(0, 0, 0, 0);
        const todayStart = new Date(today);
        todayStart.setHours(0, 0, 0, 0);
        if (creationDate > todayStart) return false;

        switch (t.recurring) {
            case 'none':
                return t.date === todayStr;
            case 'daily':
                return true;
            case 'weekly':
                return parseInt(t.dayOfWeek, 10) === weekday;
            case 'monthly':
                return new Date(t.date + 'T12:00:00').getDate() === today.getDate();
            case 'yearly':
                const taskAnchorDateYearly = new Date(t.date + 'T12:00:00');
                return taskAnchorDateYearly.getDate() === today.getDate() && taskAnchorDateYearly.getMonth() === today.getMonth();
            case 'custom': {
                if (!t.customRecurValue) return false;
                const anchorDate = new Date(t.date + 'T12:00:00');
                const recurValue = parseInt(t.customRecurValue, 10);
                
                switch (t.customRecurUnit) {
                    case 'days': {
                        const diffTime = todayStart.getTime() - anchorDate.getTime();
                        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
                        return diffDays >= 0 && diffDays % recurValue === 0;
                    }
                    case 'weeks': {
                        const diffTime = todayStart.getTime() - anchorDate.getTime();
                        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
                        return diffDays >= 0 && diffDays % (recurValue * 7) === 0;
                    }
                    case 'months': {
                        if (today.getDate() !== anchorDate.getDate()) return false;
                        const diffMonths = (today.getMonth() - anchorDate.getMonth()) + 12 * (today.getFullYear() - anchorDate.getFullYear());
                        return diffMonths >= 0 && diffMonths % recurValue === 0;
                    }
                    case 'years': {
                        if (today.getMonth() !== anchorDate.getMonth() || today.getDate() !== anchorDate.getDate()) return false;
                        const diffYears = today.getFullYear() - anchorDate.getFullYear();
                        return diffYears >= 0 && diffYears % recurValue === 0;
                    }
                    default: return false;
                }
            }
            default: return false;
        }
    }).sort((a, b) => a.from.localeCompare(b.from));
    
    const filteredTasks = tasksForDisplay.filter(task => currentCategory === "All" || task.category === currentCategory);

    taskContainer.innerHTML = "";
    
    if (filteredTasks.length === 0) {
        taskContainer.style.justifyContent = 'center';

        const addTaskCard = document.createElement("div");
        addTaskCard.className = "task-card add-task-card";
        addTaskCard.innerHTML = `
            <div class="add-task-content">
                <h3>Add New Task</h3>
                <button class="add-task-plus-btn">+</button>
            </div>
        `;
        addTaskCard.addEventListener('click', () => openTaskModal());
        taskContainer.appendChild(addTaskCard);
        return;
    }
    
    taskContainer.style.justifyContent = 'flex-start';

    filteredTasks.forEach(task => {
        const now = new Date();
        const fromTime = timeToDate(todayStr, task.from);
        const toTime = timeToDate(todayStr, task.to);
        const isCurrent = now >= fromTime && now < toTime;
        const card = document.createElement("div");
        card.className = "task-card";
        if (isCurrent) card.classList.add("current-task");
        if (task.notes && task.notes.startsWith('http')) card.classList.add("has-link");

        const from12Hour = formatTo12Hour(task.from);
        const to12Hour = formatTo12Hour(task.to);
        const categoryClass = `category-${task.category?.replace(/\s+/g, '') || 'Default'}`;
        const cleanNotes = task.notes?.startsWith('http') ? '' : (task.notes || '');
        const needsExpansion = cleanNotes.length > 35; // Character limit for preview

        card.innerHTML = `
        <div>
            <h3 contenteditable="false" data-task-id="${task.id}">${task.title}</h3>
            <p class="task-card-time">${from12Hour} - ${to12Hour}</p>
            <p class="category-label ${categoryClass}">${task.category || 'General'}</p>
            ${cleanNotes ? `
                <div class="task-notes-container">
                    <div class="task-notes-preview">${cleanNotes}</div>
                    <div class="task-notes-full">${cleanNotes}</div>
                    ${needsExpansion ? '<button class="notes-expand-btn">›</button>' : ''}
                </div>
            ` : ''}
        </div>
        <div class="task-card-actions">
            ${(task.notes && task.notes.startsWith('http')) ? `<a href="${task.notes}" target="_blank" rel="noopener noreferrer" class="task-link-btn" title="${task.notes}">🔗</a>` : ''}
            <button class="edit-btn" title="Edit Task">✏️</button>
            <button class="delete-card-btn" title="Delete Task">🗑️</button>
            <button class="advanced-toggle-btn" title="Advanced Settings">⚙️</button>
        </div>
        <div class="task-card-advanced">
            <label for="snooze-${task.id}">Snooze (min):</label>
            <input type="number" id="snooze-${task.id}" class="snooze-input" value="${task.snoozeTime || 5}" min="1" max="60">
        </div>
        `;

        card.addEventListener('click', (e) => {
            if (getHasDragged()) return; 
            if (task.notes && task.notes.startsWith('http') && !e.target.closest('button, a, [contenteditable="true"]')) {
                window.open(task.notes, '_blank');
            }
        });

        const expandBtn = card.querySelector('.notes-expand-btn');
        if (expandBtn) {
            expandBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                card.querySelector('.task-notes-container').classList.toggle('expanded');
            });
        }
        
        card.querySelector('.edit-btn').addEventListener('click', (e) => { e.stopPropagation(); openTaskModal(task); });
        card.querySelector('.delete-card-btn').addEventListener('click', async (e) => {
            e.stopPropagation();
            if (await showConfirmation(`Are you sure you want to delete "${task.title}"?`)) {
                e.target.closest('.task-card').classList.add('deleting');
                setTimeout(() => deleteTask(task.id), 400);
            }
        });
        
        card.querySelector('.advanced-toggle-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            card.querySelector('.task-card-advanced').classList.toggle('visible');
        });
        card.querySelector('.snooze-input').addEventListener('change', (e) => {
            e.stopPropagation();
            let tasks = getTasks();
            const taskToUpdate = tasks.find(t => t.id === task.id);
            if (taskToUpdate) {
                taskToUpdate.snoozeTime = parseInt(e.target.value, 10);
                saveTasks(tasks);
            }
        });

        const titleEl = card.querySelector('h3');
        titleEl.addEventListener('dblclick', () => {
            titleEl.contentEditable = 'true';
            titleEl.focus();
            document.execCommand('selectAll', false, null);
        });
        titleEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); titleEl.blur(); } 
            else if (e.key === 'Escape') { titleEl.textContent = task.title; titleEl.blur(); }
        });
        titleEl.addEventListener('blur', () => {
            titleEl.contentEditable = 'false';
            const newTitle = titleEl.textContent.trim();
            const tasks = getTasks();
            const taskToUpdate = tasks.find(t => t.id === task.id);
            if (taskToUpdate && taskToUpdate.title !== newTitle && newTitle) {
                taskToUpdate.title = newTitle;
                saveTasks(tasks);
            } else {
                titleEl.textContent = task.title;
            }
        });
        taskContainer.appendChild(card);
    });
    
    const addTaskCard = document.createElement("div");
    addTaskCard.className = "task-card add-task-card";
    addTaskCard.innerHTML = `
        <div class="add-task-content">
            <h3>Add New Task</h3>
            <button class="add-task-plus-btn">+</button>
        </div>
    `;
    addTaskCard.addEventListener('click', () => openTaskModal());
    taskContainer.appendChild(addTaskCard);
    
    scrollToCurrentTask();
}

function renderFilters(filter = '') {
    const tasks = getTasks();
    const filterBar = document.getElementById('filterBar');
    let categories = ['All', ...new Set(tasks.map(t => t.category).filter(Boolean))];
    
    if (filter) {
        const lowerCaseFilter = filter.toLowerCase();
        categories = categories.filter(cat => cat.toLowerCase().includes(lowerCaseFilter));
    }

    filterBar.innerHTML = '';
    categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.dataset.cat = cat;
        btn.textContent = cat;
        if (cat === currentCategory) btn.classList.add('active');
        btn.addEventListener('click', () => {
            currentCategory = btn.dataset.cat;
            render();
        });
        filterBar.appendChild(btn);
    });
}

export function render() {
    renderTasks();
    renderFilters(categorySearchInput.value);
}

function addReminderInput(reminder = { value: 5, unit: 'minutes' }) {
    const reminderList = document.getElementById('reminderList');
    const item = document.createElement('div');
    item.className = 'reminder-item';
    item.innerHTML = `
        <input type="number" class="reminder-value" value="${reminder.value}" min="1">
        <select class="reminder-unit">
            <option value="minutes" ${reminder.unit === 'minutes' ? 'selected' : ''}>Minutes Before</option>
            <option value="hours" ${reminder.unit === 'hours' ? 'selected' : ''}>Hours Before</option>
            <option value="days" ${reminder.unit === 'days' ? 'selected' : ''}>Days Before</option>
        </select>
        <button type="button" class="remove-reminder-btn">🗑️</button>
    `;
    item.querySelector('.remove-reminder-btn').addEventListener('click', () => item.remove());
    reminderList.appendChild(item);
}

export function openTaskModal(task = {}) {
    form.reset();
    document.getElementById('taskId').value = task.id || "";
    document.getElementById("modalTitle").textContent = task.id ? "Edit Task" : "Add Task";
    document.getElementById("deleteTask").classList.toggle("hidden", !task.id);

    const now = new Date();
    const end = new Date(now.getTime() + 30 * 60000);
    const pad = (num) => num.toString().padStart(2, '0');
    
    const year = now.getFullYear();
    const month = pad(now.getMonth() + 1);
    const day = pad(now.getDate());
    
    document.getElementById('taskTitle').value = task.title || '';
    document.getElementById('taskNotes').value = task.notes || (task.link || '');
    document.getElementById('taskFrom').value = task.from || `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    document.getElementById('taskTo').value = task.to || `${pad(end.getHours())}:${pad(end.getMinutes())}`;
    document.getElementById('taskDate').value = task.date || `${year}-${month}-${day}`;
    document.getElementById('taskRecurring').value = task.recurring || 'none';
    
    const customRecurrenceOptions = document.getElementById('customRecurrenceOptions');
    const recurrenceEndOptions = document.getElementById('recurrenceEndOptions');
    
    document.getElementById('customRecurValue').value = task.customRecurValue !== null && task.customRecurValue !== undefined ? task.customRecurValue : 1;
    document.getElementById('customRecurUnit').value = task.customRecurUnit || 'days';
    document.getElementById('recurrenceEndDate').value = task.recurrenceEndDate || '';
    
    customRecurrenceOptions.classList.toggle('hidden', task.recurring !== 'custom');
    recurrenceEndOptions.classList.toggle('hidden', task.recurring === 'none' || !task.recurring);
    
    const categoryDatalist = document.getElementById('categoryOptions');
    categoryDatalist.innerHTML = '';
    const categories = [...new Set(getTasks().map(t => t.category).filter(Boolean))];
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        categoryDatalist.appendChild(option);
    });
    document.getElementById('taskCategory').value = task.category || 'General';

    document.getElementById('taskNotification').checked = task.notificationEnabled !== false;
    const remindersToggle = document.getElementById('taskRemindersToggle');
    const remindersContainer = document.getElementById('remindersContainer');
    remindersToggle.checked = task.reminders && task.reminders.length > 0;
    remindersContainer.classList.toggle('hidden', !remindersToggle.checked);
    document.getElementById('reminderList').innerHTML = '';
    if (remindersToggle.checked) {
        task.reminders.forEach(addReminderInput);
    } else {
        addReminderInput({ value: 15, unit: 'minutes' });
    }
    
    modal.classList.remove("hidden");
    validateDates();
}

export function initializeTasks(dragCheckCallback) {
    getHasDragged = dragCheckCallback;

    categorySearchInput.addEventListener('input', () => renderFilters(categorySearchInput.value));
    document.getElementById("cancelModal").addEventListener('click', () => modal.classList.add("hidden"));
    closeTaskModalBtn.addEventListener('click', () => modal.classList.add("hidden"));
    
    taskDateInput.addEventListener('change', validateDates);
    recurrenceEndDateInput.addEventListener('change', validateDates);

    document.getElementById('taskRemindersToggle').addEventListener('change', (e) => {
        document.getElementById('remindersContainer').classList.toggle('hidden', !e.target.checked);
    });
    
    document.getElementById('taskRecurring').addEventListener('change', (e) => {
        const recurringType = e.target.value;
        const customRecurrenceOptions = document.getElementById('customRecurrenceOptions');
        const recurrenceEndOptions = document.getElementById('recurrenceEndOptions');
        
        customRecurrenceOptions.classList.toggle('hidden', recurringType !== 'custom');
        recurrenceEndOptions.classList.toggle('hidden', recurringType === 'none');
    });
    document.getElementById('addReminderBtn').addEventListener('click', () => addReminderInput());

    document.getElementById("deleteTask").addEventListener('click', async () => {
        const id = document.getElementById("taskId").value;
        if (await showConfirmation("Are you sure you want to delete this task?")) {
            deleteTask(id);
            modal.classList.add("hidden");
        }
    });

    form.addEventListener("submit", (e) => {
        e.preventDefault();

        if (!validateDates()) {
            alert("Please fix the date error before saving.");
            return;
        }

        const id = document.getElementById("taskId").value;
        let tasks = getTasks();
        
        const reminderItems = document.querySelectorAll('#reminderList .reminder-item');
        const reminders = [];
        if (document.getElementById('taskRemindersToggle').checked) {
            reminderItems.forEach(item => {
                reminders.push({
                    value: parseInt(item.querySelector('.reminder-value').value, 10) || 5,
                    unit: item.querySelector('.reminder-unit').value
                });
            });
        }
        
        const recurring = document.getElementById("taskRecurring").value;
        
        const formData = {
            title: document.getElementById("taskTitle").value.trim() || 'Untitled Task',
            notes: document.getElementById("taskNotes").value.trim(),
            from: document.getElementById("taskFrom").value,
            to: document.getElementById("taskTo").value,
            date: document.getElementById("taskDate").value,
            recurring: recurring,
            category: document.getElementById("taskCategory").value.trim() || 'General',
            notificationEnabled: document.getElementById("taskNotification").checked,
            reminders: reminders
        };
        
        if (recurring === 'custom') {
            formData.customRecurValue = parseInt(document.getElementById("customRecurValue").value, 10) || 1;
            formData.customRecurUnit = document.getElementById("customRecurUnit").value || 'days';
        } else {
            formData.customRecurValue = null;
            formData.customRecurUnit = null;
        }
        
        if (recurring !== 'none') {
            formData.recurrenceEndDate = document.getElementById("recurrenceEndDate").value || null;
        } else {
            formData.recurrenceEndDate = null;
        }
        
        if (formData.date) {
            formData.dayOfWeek = new Date(`${formData.date}T12:00:00`).getDay();
        }

        if (id) {
            const existingIndex = tasks.findIndex(t => t.id === id);
            if (existingIndex > -1) {
                tasks[existingIndex] = { ...tasks[existingIndex], ...formData };
            }
        } else {
            tasks.push({ id: crypto.randomUUID(), createdAt: new Date().toISOString(), snoozeTime: 5, ...formData });
        }
        
        saveTasks(tasks);
        modal.classList.add("hidden");
    });
    
    chrome.runtime.onMessage.addListener((message) => {
        if (message.action === "highlightTask" && message.taskId) {
            render();
        }
    });

    function scheduleNextMinuteUpdate() {
        const now = new Date();
        const delay = 60000 - (now.getSeconds() * 1000 + now.getMilliseconds());
        setTimeout(() => {
            render(); // Initial render after delay
            setInterval(render, 60000); // Subsequent renders every minute
        }, delay);
    }

    render();
    scheduleNextMinuteUpdate();
}