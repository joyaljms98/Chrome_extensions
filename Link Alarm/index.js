// index.js
import { initializeShortcuts, initializeShortcutManager, openShortcutModal } from './shortcuts.js';
import { getThemeSettings, saveThemeSettings, getAccent, saveAccent, getClockFormat, saveClockFormat, exportData, importData, getGridSetting, saveGridSetting, getShortcutScale, saveShortcutScale, getTaskCardScale, saveTaskCardScale } from './settings.js';
import { initializeTasks, openTaskModal } from './tasks.js';
import { initializeTrash } from './trash.js';
import { loadFromStorage } from './storage.js';
import './confirmation.js';

document.addEventListener('DOMContentLoaded', () => {
    function handlePopupActions() {
        const urlParams = new URLSearchParams(window.location.search);
        const action = urlParams.get('action');
        if (!action) return;
        const url = urlParams.has('url') ? decodeURIComponent(urlParams.get('url')) : null;
        const title = urlParams.has('title') ? decodeURIComponent(urlParams.get('title')) : null;
        if (action === 'addTask' && url) {
            openTaskModal({ link: url });
        } else if (action === 'addShortcut' && url) {
            openShortcutModal({ name: title, url: url });
        }
        history.replaceState(null, '', window.location.pathname);
    }
    handlePopupActions();

    const clockElement = document.getElementById('clock');
    const dateElement = document.getElementById('date');
    let use12HourFormat = getClockFormat() === '12h';

    function updateClock() {
        const now = new Date();
        const timeOptions = { hour: 'numeric', minute: '2-digit', hour12: use12HourFormat };
        let timeString = now.toLocaleTimeString([], timeOptions); // Use local for better format support
        timeString = timeString.replace(/ (AM|PM)$/, '<span class="am-pm">$&</span>');
        clockElement.innerHTML = timeString;
        const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateElement.textContent = now.toLocaleDateString(undefined, dateOptions);
    }

    function applyAccent(accent) {
        document.body.dataset.accent = accent;
        const accentBtn = document.querySelector(`.accent-btn[data-accent="${accent}"]`);
        if(accentBtn) {
            const rgb = accentBtn.style.getPropertyValue('--accent-rgb');
            document.documentElement.style.setProperty('--accent-rgb', rgb);
        }
        document.querySelectorAll('#appearanceSettingsModal .accent-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.accent === accent);
        });
    }

    const gridToggle = document.getElementById('gridToggle');
    function applyGridSetting() {
        document.body.classList.toggle('grid-enabled', getGridSetting());
    }
    gridToggle.addEventListener('change', () => {
        saveGridSetting(gridToggle.checked);
        applyGridSetting();
    });
    
    const themeModes = ['light', 'dark', 'auto'];
    const themeToggleBtn = document.getElementById('themeToggle');
    const themeIconEl = document.getElementById('theme-icon');
    const themeTextEl = document.getElementById('theme-text');
    const themeModeSelector = document.getElementById('themeModeSelector');
    const autoThemeSettingsEl = document.getElementById('autoThemeSettings');
    const autoDarkStartInput = document.getElementById('autoDarkStart');
    const autoDarkEndInput = document.getElementById('autoDarkEnd');
    const autoLightThemeSelector = document.getElementById('autoLightThemeSelector');
    const autoDarkThemeSelector = document.getElementById('autoDarkThemeSelector');

    function updateThemeToggleUI(settings, finalThemeName, baseTheme) {
        if (!themeIconEl || !themeTextEl) return;
        const themeNameMap = {
            'gradient-light': 'Gradient Light', 'pure-white': 'Pure White',
            'gradient-dark': 'Gradient Dark', 'pure-black': 'Pure Black'
        };
        const capitalizedTheme = themeNameMap[finalThemeName] || (baseTheme.charAt(0).toUpperCase() + baseTheme.slice(1));
        switch (settings.mode) {
            case 'auto': themeIconEl.textContent = '🕒'; themeTextEl.textContent = `Auto (${capitalizedTheme})`; break;
            case 'dark': themeIconEl.textContent = '🌙'; themeTextEl.textContent = capitalizedTheme; break;
            case 'light': themeIconEl.textContent = '☀️'; themeTextEl.textContent = capitalizedTheme; break;
        }
    }

    function resolveAndApplyTheme() {
        const settings = getThemeSettings();
        let baseTheme = 'light';
        let finalThemeName = 'gradient-light';
        if (settings.mode === 'light') {
            baseTheme = 'light';
            finalThemeName = settings.autoLight;
        } else if (settings.mode === 'dark') {
            baseTheme = 'dark';
            finalThemeName = settings.autoDark;
        } else {
            const now = new Date();
            const currentTime = now.getHours() * 60 + now.getMinutes();
            const [startHour, startMin] = settings.start.split(':').map(Number);
            const startTime = startHour * 60 + startMin;
            const [endHour, endMin] = settings.end.split(':').map(Number);
            const endTime = endHour * 60 + endMin;
            if (startTime > endTime) {
                baseTheme = (currentTime >= startTime || currentTime < endTime) ? 'dark' : 'light';
            } else {
                baseTheme = (currentTime >= startTime && currentTime < endTime) ? 'dark' : 'light';
            }
            finalThemeName = baseTheme === 'dark' ? settings.autoDark : settings.autoLight;
        }
        const allAccents = getAccent();
        applyAccent(allAccents[baseTheme]);
        document.body.className = ''; // Clear all theme classes
        document.body.classList.add(finalThemeName);
        if (getGridSetting()) document.body.classList.add('grid-enabled');
        updateThemeToggleUI(settings, finalThemeName, baseTheme);
    }
    
    const menuToggleBtn = document.getElementById('menuToggleBtn');
    const sideMenu = document.getElementById('sideMenu');
    const alarmListToggleBtn = document.getElementById('alarmListToggleBtn');
    const alarmListMenu = document.getElementById('alarmListMenu');
    const container = document.querySelector('.container');
    
    const fullAlarmListContainer = document.getElementById('fullAlarmList');
    const alarmSearchInput = document.getElementById('alarmSearchInput');
    const calendarMonthYearEl = document.getElementById('calendar-month-year');
    const calendarDaysEl = document.getElementById('calendar-days');
    const calendarWeekdaysEl = document.getElementById('calendar-weekdays');
    const prevMonthBtn = document.getElementById('calendar-prev-month');
    const nextMonthBtn = document.getElementById('calendar-next-month');
    const calendarGotoUI = document.getElementById('calendar-goto-ui');
    const calendarGotoMonth = document.getElementById('calendar-goto-month');
    const calendarGotoYear = document.getElementById('calendar-goto-year');
    const calendarGotoBtn = document.getElementById('calendar-goto-btn');
    const calendarResetBtn = document.getElementById('calendar-reset-btn');


    let currentDateForCalendar = new Date();
    let selectedDateStr = null;

    function closeSideMenu() {
        sideMenu.classList.remove('open');
        container.classList.remove('menu-open');
    }

    function closeAlarmListMenu() {
        alarmListMenu.classList.remove('open');
        container.classList.remove('right-menu-open');
    }
    
    function toYYYYMMDD(date) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }
    
    function populateGotoUI() {
        const year = currentDateForCalendar.getFullYear();
        const month = currentDateForCalendar.getMonth();
        
        calendarGotoMonth.innerHTML = '';
        for(let i = 0; i < 12; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = new Date(0, i).toLocaleString('default', { month: 'long' });
            option.selected = i === month;
            calendarGotoMonth.appendChild(option);
        }

        calendarGotoYear.innerHTML = '';
        for(let i = year - 10; i <= year + 10; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = i;
            option.selected = i === year;
            calendarGotoYear.appendChild(option);
        }
    }


    function renderCalendar() {
        const tasks = loadFromStorage('tasks', []);
        const year = currentDateForCalendar.getFullYear();
        const month = currentDateForCalendar.getMonth();

        calendarMonthYearEl.textContent = `${currentDateForCalendar.toLocaleString('default', { month: 'long' })} ${year}`;
        
        // Control visibility of "Today" button
        const today = new Date();
        const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
        calendarResetBtn.classList.toggle('hidden', isCurrentMonth);

        calendarWeekdaysEl.innerHTML = '';
        calendarDaysEl.innerHTML = '';

        ['S', 'M', 'T', 'W', 'T', 'F', 'S'].forEach(day => {
            const dayEl = document.createElement('div');
            dayEl.textContent = day;
            calendarWeekdaysEl.appendChild(dayEl);
        });

        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        for (let i = 0; i < firstDayOfMonth; i++) {
            calendarDaysEl.appendChild(document.createElement('div'));
        }

        for (let i = 1; i <= daysInMonth; i++) {
            const dayEl = document.createElement('div');
            dayEl.textContent = i;
            dayEl.classList.add('calendar-day');

            const date = new Date(year, month, i);
            date.setHours(12, 0, 0, 0);
            const dateStr = toYYYYMMDD(date);
            dayEl.dataset.date = dateStr;

            const todayStr = toYYYYMMDD(new Date());
            if (dateStr === todayStr) dayEl.classList.add('today');
            if (dateStr === selectedDateStr) dayEl.classList.add('selected');

            const hasTaskOnThisDay = tasks.some(task => {
                const creationDate = new Date(task.createdAt || '1970-01-01');
                creationDate.setHours(0, 0, 0, 0);
                
                const endDate = task.recurrenceEndDate ? new Date(task.recurrenceEndDate) : null;
                if (endDate) endDate.setHours(23, 59, 59, 999);

                if (date < creationDate || (endDate && date > endDate)) {
                    return false;
                }
                
                const anchorDate = new Date(task.date + 'T12:00:00');
                if (date < anchorDate && task.recurring !== 'daily' && task.recurring !== 'weekly') {
                    if (task.recurring === 'none' || toYYYYMMDD(anchorDate) !== toYYYYMMDD(creationDate)) {
                        return false;
                    }
                }

                switch (task.recurring) {
                    case 'none':
                        return task.date === dateStr;
                    case 'daily':
                        return date >= creationDate;
                    case 'weekly':
                        return parseInt(task.dayOfWeek, 10) === date.getDay() && date >= creationDate;
                    case 'monthly':
                        return anchorDate.getDate() === date.getDate() && date >= anchorDate;
                    case 'yearly':
                        return anchorDate.getDate() === date.getDate() && anchorDate.getMonth() === date.getMonth() && date >= anchorDate;
                    case 'custom': {
                        if (!task.customRecurValue) return false;
                        const recurValue = parseInt(task.customRecurValue, 10);
                        if (date < anchorDate) return false;
                        
                        switch (task.customRecurUnit) {
                            case 'days': {
                                const diffTime = date.getTime() - anchorDate.getTime();
                                const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
                                return diffDays >= 0 && diffDays % recurValue === 0;
                            }
                            case 'weeks': {
                                if (date.getDay() !== anchorDate.getDay()) return false;
                                const diffTime = date.getTime() - anchorDate.getTime();
                                const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
                                return diffDays >= 0 && (diffDays/7) % recurValue === 0;
                            }
                            case 'months': {
                                if (date.getDate() !== anchorDate.getDate()) return false;
                                const diffMonths = (date.getMonth() - anchorDate.getMonth()) + 12 * (date.getFullYear() - anchorDate.getFullYear());
                                return diffMonths >= 0 && diffMonths % recurValue === 0;
                            }
                            case 'years': {
                                if (date.getMonth() !== anchorDate.getMonth() || date.getDate() !== anchorDate.getDate()) return false;
                                const diffYears = date.getFullYear() - anchorDate.getFullYear();
                                return diffYears >= 0 && diffYears % recurValue === 0;
                            }
                            default:
                                return false;
                        }
                    }
                    default:
                        return false;
                }
            });

            if (hasTaskOnThisDay) {
                dayEl.classList.add('has-task');
            }
            
            calendarDaysEl.appendChild(dayEl);
        }
    }

     function renderFullAlarmList(filterDate = selectedDateStr, searchTerm = alarmSearchInput.value.toLowerCase()) {
        const alarmListTitle = document.getElementById('alarm-list-title');
        
        // Update title based on filter
        if (filterDate) {
            const date = new Date(filterDate + 'T12:00:00');
            const options = { month: 'long', day: 'numeric', year: 'numeric' };
            const formattedDate = date.toLocaleDateString(undefined, options);
            alarmListTitle.textContent = `Alarms on ${formattedDate}`;
        } else {
            alarmListTitle.textContent = 'All Alarms';
        }

        const allTasks = loadFromStorage('tasks', []);
        
        let filteredTasks = allTasks;

        // Filter by date if one is selected
        if (filterDate) {
            const selectedDate = new Date(filterDate + 'T12:00:00'); // Use a consistent time for checks

            filteredTasks = allTasks.filter(task => {
                const creationDate = new Date(task.createdAt || '1970-01-01');
                creationDate.setHours(0, 0, 0, 0);
                
                const endDate = task.recurrenceEndDate ? new Date(task.recurrenceEndDate) : null;
                if (endDate) endDate.setHours(23, 59, 59, 999);

                if (selectedDate < creationDate || (endDate && selectedDate > endDate)) {
                    return false;
                }
                
                const anchorDate = new Date(task.date + 'T12:00:00');
                if (selectedDate < anchorDate && task.recurring !== 'daily' && task.recurring !== 'weekly') {
                    if (task.recurring === 'none' || toYYYYMMDD(anchorDate) !== toYYYYMMDD(creationDate)) {
                        return false;
                    }
                }

                switch (task.recurring) {
                    case 'none':
                        return task.date === filterDate;
                    case 'daily':
                        return selectedDate >= creationDate;
                    case 'weekly':
                        return parseInt(task.dayOfWeek, 10) === selectedDate.getDay() && selectedDate >= creationDate;
                    case 'monthly':
                        return anchorDate.getDate() === selectedDate.getDate() && selectedDate >= anchorDate;
                    case 'yearly':
                        return anchorDate.getDate() === selectedDate.getDate() && anchorDate.getMonth() === selectedDate.getMonth() && selectedDate >= anchorDate;
                    case 'custom': {
                        if (!task.customRecurValue) return false;
                        const recurValue = parseInt(task.customRecurValue, 10);
                        if (selectedDate < anchorDate) return false;
                        
                        switch (task.customRecurUnit) {
                            case 'days': {
                                const diffTime = selectedDate.getTime() - anchorDate.getTime();
                                const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
                                return diffDays >= 0 && diffDays % recurValue === 0;
                            }
                            case 'weeks': {
                                if (selectedDate.getDay() !== anchorDate.getDay()) return false;
                                const diffTime = selectedDate.getTime() - anchorDate.getTime();
                                const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
                                return diffDays >= 0 && (diffDays/7) % recurValue === 0;
                            }
                            case 'months': {
                                if (selectedDate.getDate() !== anchorDate.getDate()) return false;
                                const diffMonths = (selectedDate.getMonth() - anchorDate.getMonth()) + 12 * (selectedDate.getFullYear() - anchorDate.getFullYear());
                                return diffMonths >= 0 && diffMonths % recurValue === 0;
                            }
                            case 'years': {
                                if (selectedDate.getMonth() !== anchorDate.getMonth() || selectedDate.getDate() !== anchorDate.getDate()) return false;
                                const diffYears = selectedDate.getFullYear() - anchorDate.getFullYear();
                                return diffYears >= 0 && diffYears % recurValue === 0;
                            }
                            default:
                                return false;
                        }
                    }
                    default:
                        return false;
                }
            });
        }
        
        // Filter by search term
        if (searchTerm) {
            filteredTasks = filteredTasks.filter(task => 
                task.title.toLowerCase().includes(searchTerm) ||
                (task.notes && task.notes.toLowerCase().includes(searchTerm))
            );
        }
        
        // Sort the final list
        filteredTasks.sort((a, b) => (a.from || '00:00').localeCompare(b.from || '00:00'));

        fullAlarmListContainer.innerHTML = '';
        if (filteredTasks.length === 0) {
            fullAlarmListContainer.innerHTML = '<p style="text-align:center; opacity:0.7;">No alarms match your filter.</p>';
            return;
        }

        filteredTasks.forEach(task => {
            const item = document.createElement('div');
            item.className = 'full-alarm-item';
            item.innerHTML = `
                <div class="full-alarm-item-info">
                    <h3 class="full-alarm-item-title">${task.title}</h3>
                    <p class="full-alarm-item-details">${task.from} - ${task.to}</p>
                </div>
                <button class="edit-alarm-btn" data-id="${task.id}" title="Edit Alarm">✏️</button>
            `;
            fullAlarmListContainer.appendChild(item);
        });
    }

    menuToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAlarmListMenu();
        sideMenu.classList.toggle('open');
        container.classList.toggle('menu-open');
    });

    alarmListToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeSideMenu();
        const isOpening = !alarmListMenu.classList.contains('open');
        alarmListMenu.classList.toggle('open');
        container.classList.toggle('right-menu-open');
        
        if (isOpening) {
            selectedDateStr = null;
            alarmSearchInput.value = '';
            currentDateForCalendar = new Date();
            renderCalendar();
            renderFullAlarmList();
            calendarMonthYearEl.classList.remove('hidden');
            calendarGotoUI.classList.add('hidden');
        }
    });

    container.addEventListener('click', () => {
        if (sideMenu.classList.contains('open')) closeSideMenu();
        if (alarmListMenu.classList.contains('open')) closeAlarmListMenu();
    });

    sideMenu.addEventListener('click', (e) => e.stopPropagation());
    alarmListMenu.addEventListener('click', (e) => e.stopPropagation());
    
    prevMonthBtn.addEventListener('click', () => {
        currentDateForCalendar.setMonth(currentDateForCalendar.getMonth() - 1);
        renderCalendar();
    });
    nextMonthBtn.addEventListener('click', () => {
        currentDateForCalendar.setMonth(currentDateForCalendar.getMonth() + 1);
        renderCalendar();
    });
    
    calendarMonthYearEl.addEventListener('click', () => {
        populateGotoUI();
        calendarMonthYearEl.classList.add('hidden');
        calendarGotoUI.classList.remove('hidden');
    });

    calendarGotoBtn.addEventListener('click', () => {
        const newMonth = parseInt(calendarGotoMonth.value, 10);
        const newYear = parseInt(calendarGotoYear.value, 10);
        currentDateForCalendar.setFullYear(newYear, newMonth, 1);
        renderCalendar();
        calendarMonthYearEl.classList.remove('hidden');
        calendarGotoUI.classList.add('hidden');
    });

    calendarResetBtn.addEventListener('click', () => {
        currentDateForCalendar = new Date();
        selectedDateStr = null;
        renderCalendar();
        renderFullAlarmList();
    });

    calendarDaysEl.addEventListener('click', (e) => {
        if (e.target.classList.contains('calendar-day') && e.target.dataset.date) {
            const newSelectedDate = e.target.dataset.date;
            if (selectedDateStr === newSelectedDate) {
                selectedDateStr = null;
            } else {
                selectedDateStr = newSelectedDate;
            }
            renderCalendar();
            renderFullAlarmList();
        }
    });

    alarmSearchInput.addEventListener('input', () => {
        renderFullAlarmList(selectedDateStr, alarmSearchInput.value);
    });

    fullAlarmListContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('edit-alarm-btn')) {
            const taskId = e.target.dataset.id;
            const tasks = loadFromStorage('tasks', []);
            const taskToEdit = tasks.find(t => t.id === taskId);
            if (taskToEdit) {
                openTaskModal(taskToEdit);
                closeAlarmListMenu();
            }
        }
    });

    const aboutModal = document.getElementById('aboutModal');
    const aboutBtn = document.getElementById('aboutBtn');
    const closeAboutBtn = document.getElementById('about-modal-close-btn');
    aboutBtn.addEventListener('click', () => {
        aboutModal.classList.remove('hidden');
        closeSideMenu();
    });
    closeAboutBtn.addEventListener('click', () => aboutModal.classList.add('hidden'));

    const settingsModal = document.getElementById('settingsModal');
    const settingsBtn = document.getElementById('settingsBtn');
    const closeSettingsBtn = document.getElementById('closeSettings');
    const clockFormatToggle = document.getElementById('clockFormatToggle');
    
    const appearanceSettingsModal = document.getElementById('appearanceSettingsModal');
    const appearanceSettingsBtn = document.getElementById('appearanceSettingsBtn');
    const closeAppearanceSettingsBtn = document.getElementById('closeAppearanceSettings');
    const shortcutScaleSlider = document.getElementById('shortcutScaleSlider');
    const taskCardScaleSlider = document.getElementById('taskCardScaleSlider');

    function applyShortcutScale(scale) {
        document.documentElement.style.setProperty('--shortcut-scale', scale);
    }
    function applyTaskCardScale(scale) {
        document.documentElement.style.setProperty('--task-card-scale', scale);
    }

    function updateAppearanceSettingsUI() {
        const settings = getThemeSettings();
        themeModeSelector.querySelectorAll('button').forEach(btn => btn.classList.toggle('active', btn.dataset.mode === settings.mode));
        autoThemeSettingsEl.style.maxHeight = settings.mode === 'auto' ? '300px' : '0';
        autoThemeSettingsEl.style.opacity = settings.mode === 'auto' ? '1' : '0';
        
        autoDarkStartInput.value = settings.start;
        autoDarkEndInput.value = settings.end;

        autoLightThemeSelector.querySelectorAll('button').forEach(btn => btn.classList.toggle('active', btn.dataset.theme === settings.autoLight));
        autoDarkThemeSelector.querySelectorAll('button').forEach(btn => btn.classList.toggle('active', btn.dataset.theme === settings.autoDark));
        
        gridToggle.checked = getGridSetting();
        
        shortcutScaleSlider.value = getShortcutScale();
        applyShortcutScale(shortcutScaleSlider.value);

        taskCardScaleSlider.value = getTaskCardScale();
        applyTaskCardScale(taskCardScaleSlider.value);

        const currentAccent = getAccent()[document.body.classList.contains('gradient-dark') || document.body.classList.contains('pure-black') ? 'dark' : 'light'];
        applyAccent(currentAccent);
    }

    settingsBtn.addEventListener('click', () => {
        settingsModal.classList.remove('hidden');
        closeSideMenu();
    });
    closeSettingsBtn.addEventListener('click', () => settingsModal.classList.add('hidden'));
    
    appearanceSettingsBtn.addEventListener('click', () => {
        appearanceSettingsModal.classList.remove('hidden');
        updateAppearanceSettingsUI();
        closeSideMenu();
    });
    closeAppearanceSettingsBtn.addEventListener('click', () => appearanceSettingsModal.classList.add('hidden'));

    shortcutScaleSlider.addEventListener('input', (e) => applyShortcutScale(e.target.value));
    shortcutScaleSlider.addEventListener('change', (e) => saveShortcutScale(e.target.value));
    
    taskCardScaleSlider.addEventListener('input', (e) => applyTaskCardScale(e.target.value));
    taskCardScaleSlider.addEventListener('change', (e) => saveTaskCardScale(e.target.value));

    themeToggleBtn.addEventListener('click', () => {
        let settings = getThemeSettings();
        const currentModeIndex = themeModes.indexOf(settings.mode);
        settings.mode = themeModes[(currentModeIndex + 1) % themeModes.length];
        saveThemeSettings(settings);
        resolveAndApplyTheme();
        updateAppearanceSettingsUI();
    });

    themeModeSelector.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            let settings = getThemeSettings();
            settings.mode = e.target.dataset.mode;
            saveThemeSettings(settings);
            updateAppearanceSettingsUI();
            resolveAndApplyTheme();
        }
    });

    autoDarkStartInput.addEventListener('change', (e) => { let s = getThemeSettings(); s.start = e.target.value; saveThemeSettings(s); resolveAndApplyTheme(); });
    autoDarkEndInput.addEventListener('change', (e) => { let s = getThemeSettings(); s.end = e.target.value; saveThemeSettings(s); resolveAndApplyTheme(); });
    autoLightThemeSelector.addEventListener('click', (e) => { if (e.target.tagName === 'BUTTON') { let s = getThemeSettings(); s.autoLight = e.target.dataset.theme; saveThemeSettings(s); updateAppearanceSettingsUI(); resolveAndApplyTheme(); } });
    autoDarkThemeSelector.addEventListener('click', (e) => { if (e.target.tagName === 'BUTTON') { let s = getThemeSettings(); s.autoDark = e.target.dataset.theme; saveThemeSettings(s); updateAppearanceSettingsUI(); resolveAndApplyTheme(); } });

    clockFormatToggle.addEventListener('click', () => {
        use12HourFormat = !use12HourFormat;
        saveClockFormat(use12HourFormat ? '12h' : '24h');
        updateClock();
    });
    
    document.querySelectorAll('#appearanceSettingsModal .accent-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const newAccent = btn.dataset.accent;
            const settings = getThemeSettings();
            let baseTheme = 'light';
            if (settings.mode === 'dark') {
                baseTheme = 'dark';
            } else if (settings.mode === 'auto') {
                const now = new Date();
                const currentTime = now.getHours() * 60 + now.getMinutes();
                const [startHour, startMin] = settings.start.split(':').map(Number);
                const startTime = startHour * 60 + startMin;
                const [endHour, endMin] = settings.end.split(':').map(Number);
                const endTime = endHour * 60 + endMin;
                if (startTime > endTime) {
                    baseTheme = (currentTime >= startTime || currentTime < endTime) ? 'dark' : 'light';
                } else {
                    baseTheme = (currentTime >= startTime && currentTime < endTime) ? 'dark' : 'light';
                }
            }
            let allAccents = getAccent();
            allAccents[baseTheme] = newAccent;
            saveAccent(allAccents);
            applyAccent(newAccent);
        });
    });

    document.getElementById('exportBtn').addEventListener('click', exportData);
    const importFileInput = document.getElementById('importFile');
    importFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => importData(reader.result);
        reader.readAsText(file);
        importFileInput.value = '';
    });

    // --- Carousel ---
    const prevBtn = document.getElementById('prevTask');
    const nextBtn = document.getElementById('nextTask');
    const carousel = document.getElementById('taskCarousel');
    prevBtn.addEventListener('click', () => carousel.scrollBy({ left: -(carousel.clientWidth), behavior: 'smooth' }));
    nextBtn.addEventListener('click', () => carousel.scrollBy({ left: carousel.clientWidth, behavior: 'smooth' }));
    
    // Mouse wheel scroll for Task Carousel
    carousel.addEventListener('wheel', (e) => {
        if (e.deltaY === 0) return;
        e.preventDefault();
        carousel.scrollBy({
            left: e.deltaY > 0 ? 100 : -100,
            behavior: 'auto'
        });
    });

    let isDown = false, startX, scrollLeft, hasDragged = false;
    carousel.addEventListener('mousedown', (e) => { isDown = true; hasDragged = false; carousel.classList.add('active'); startX = e.pageX - carousel.offsetLeft; scrollLeft = carousel.scrollLeft; });
    carousel.addEventListener('mouseleave', () => { if (!isDown) return; isDown = false; carousel.classList.remove('active'); if (hasDragged) handleSnap(); });
    carousel.addEventListener('mouseup', () => { if (!isDown) return; isDown = false; carousel.classList.remove('active'); if (hasDragged) handleSnap(); });
    carousel.addEventListener('mousemove', (e) => { if (!isDown) return; e.preventDefault(); const x = e.pageX - carousel.offsetLeft; const walk = x - startX; if (Math.abs(walk) > 10) hasDragged = true; carousel.scrollLeft = scrollLeft - walk; });
    
    const handleSnap = () => {
        const taskCard = carousel.querySelector('.task-card:not(.add-task-card)');
        if (!taskCard) return;

        const cardStyle = window.getComputedStyle(taskCard);
        const cardMargin = parseFloat(cardStyle.marginLeft) + parseFloat(cardStyle.marginRight);
        const cardWidth = taskCard.offsetWidth + cardMargin;
        
        const scrollEnd = carousel.scrollLeft;
        const targetIndex = Math.round(scrollEnd / cardWidth);
        const targetScrollLeft = targetIndex * cardWidth;
        carousel.scrollTo({ left: targetScrollLeft, behavior: 'smooth' });
    };

    // --- Shortcuts Bar ---
    const shortcutsContainer = document.getElementById('shortcuts');
    const scrollLeftBtn = document.getElementById('scrollShortcutLeft');
    const scrollRightBtn = document.getElementById('scrollShortcutRight');

    function updateShortcutArrows() {
        const { scrollWidth, clientWidth, scrollLeft } = shortcutsContainer;
        const tolerance = 1; // Add tolerance for fractional pixels
        scrollLeftBtn.classList.toggle('hidden', scrollLeft <= tolerance);
        scrollRightBtn.classList.toggle('hidden', scrollLeft >= scrollWidth - clientWidth - tolerance);
    }
    
    shortcutsContainer.addEventListener('wheel', (e) => {
        if(e.deltaY === 0) return;
        e.preventDefault();
        shortcutsContainer.scrollLeft += e.deltaY;
    });
    
    scrollLeftBtn.addEventListener('click', () => {
        shortcutsContainer.scrollBy({ left: -200, behavior: 'smooth' });
    });
    scrollRightBtn.addEventListener('click', () => {
        shortcutsContainer.scrollBy({ left: 200, behavior: 'smooth' });
    });

    shortcutsContainer.addEventListener('scroll', updateShortcutArrows);
    shortcutsContainer.addEventListener('shortcutsrendered', updateShortcutArrows);
    window.addEventListener('resize', updateShortcutArrows);


    // --- Cursor ---
    const dot = document.querySelector('.cursor-dot');
    const outline = document.querySelector('.cursor-outline');
    window.addEventListener('mousemove', (e) => {
        const { clientX, clientY } = e;
        dot.style.left = `${clientX}px`;
        dot.style.top = `${clientY}px`;
        outline.style.left = `${clientX}px`;
        outline.style.top = `${clientY}px`;
    });
    document.querySelectorAll('a, button, .menu-item, .task-card, .accent-btn, input, select, textarea').forEach((el) => {
        el.addEventListener('mouseenter', () => outline.classList.add('hover'));
        el.addEventListener('mouseleave', () => outline.classList.remove('hover'));
    });

    // --- Initializations ---
    initializeTasks(() => hasDragged);
    initializeShortcuts();
    initializeTrash();
    initializeShortcutManager();
    updateClock();
    setInterval(updateClock, 1000);
    resolveAndApplyTheme(); // Apply initial theme and scales
    updateAppearanceSettingsUI();
    setTimeout(updateShortcutArrows, 100); // Delay to allow layout to settle
    setInterval(resolveAndApplyTheme, 60000);
});