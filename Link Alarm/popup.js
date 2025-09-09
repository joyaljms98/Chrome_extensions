import { getThemeSettings } from './settings.js';

/**
 * This function determines the current theme (light or dark)
 * based on the user's saved settings.
 */
function applyPopupTheme() {
    const settings = getThemeSettings();
    let baseTheme = 'dark'; // Default to dark theme

    if (settings.mode === 'light') {
        baseTheme = 'light';
    } else if (settings.mode === 'dark') {
        baseTheme = 'dark';
    } else { // Auto mode logic
        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes();
        const [startHour, startMin] = settings.start.split(':').map(Number);
        const startTime = startHour * 60 + startMin;
        const [endHour, endMin] = settings.end.split(':').map(Number);
        const endTime = endHour * 60 + endMin;

        if (startTime > endTime) { // Overnight schedule (e.g., 18:30 to 06:30)
            baseTheme = (currentTime >= startTime || currentTime < endTime) ? 'dark' : 'light';
        } else { // Daytime schedule
            baseTheme = (currentTime >= startTime && currentTime < endTime) ? 'dark' : 'light';
        }
    }
    
    // Apply a simple class to the body for styling
    document.body.classList.add(`theme-${baseTheme}`);
}


document.addEventListener('DOMContentLoaded', () => {
    // Apply the theme as soon as the popup opens
    applyPopupTheme();

    const openHomeBtn = document.getElementById('openHomeBtn');
    const addAlarmBtn = document.getElementById('addAlarmBtn');
    const addShortcutBtn = document.getElementById('addShortcutBtn');

    openHomeBtn.addEventListener('click', () => {
        chrome.tabs.create({ url: 'newtab.html' });
        window.close();
    });

    addAlarmBtn.addEventListener('click', async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const urlToPass = encodeURIComponent(tab.url);
        chrome.tabs.create({ url: `newtab.html?action=addTask&url=${urlToPass}` });
        window.close();
    });

    addShortcutBtn.addEventListener('click', async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const urlToPass = encodeURIComponent(tab.url);
        const titleToPass = encodeURIComponent(tab.title);
        chrome.tabs.create({ url: `newtab.html?action=addShortcut&url=${urlToPass}&title=${titleToPass}` });
        window.close();
    });
});
