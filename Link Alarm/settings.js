// settings.js
import { saveToStorage, loadFromStorage } from './storage.js';

// --- Theme & Accent ---
export function getThemeSettings() {
  const defaultSettings = { 
    mode: 'auto', 
    start: '18:30', 
    end: '06:30',
    autoLight: 'gradient-light', // 'gradient-light' or 'pure-white'
    autoDark: 'gradient-dark'    // 'gradient-dark' or 'pure-black'
  };
  return loadFromStorage('themeSettings', defaultSettings);
}
export function saveThemeSettings(settings) {
  saveToStorage('themeSettings', settings);
}

export function saveAccent(accents) { 
    saveToStorage('accents', accents); 
}
export function getAccent() { 
    const defaultAccents = {
        light: 'darkblue', // Default for light mode
        dark: 'blue'       // Default for dark mode (cyan)
    };
    return loadFromStorage('accents', defaultAccents); 
}

// --- Clock ---
export function saveClockFormat(format) { saveToStorage('clockFormat', format); }
export function getClockFormat() { return loadFromStorage('clockFormat', '12h'); }

// --- Background Grid ---
export function saveGridSetting(isEnabled) { saveToStorage('gridEnabled', isEnabled); }
export function getGridSetting() { return loadFromStorage('gridEnabled', false); }

// --- Shortcut Scale ---
export function saveShortcutScale(scale) { saveToStorage('shortcutScale', scale); }
export function getShortcutScale() { return loadFromStorage('shortcutScale', 1.0); }

// --- Task Card Scale ---
export function saveTaskCardScale(scale) { saveToStorage('taskCardScale', scale); }
export function getTaskCardScale() { return loadFromStorage('taskCardScale', 1.0); }


// --- Data Management ---
export function exportData() {
  const tasks = loadFromStorage("tasks", []);
  const shortcuts = loadFromStorage("shortcuts", []);
  const settingsToBackup = {
      theme: getThemeSettings(),
      accent: getAccent(),
      clock: getClockFormat(),
      grid: getGridSetting(),
      shortcutScale: getShortcutScale(),
      taskCardScale: getTaskCardScale()
  };

  if (tasks.length === 0 && shortcuts.length === 0) {
    alert("No tasks or shortcuts to export.");
    return;
  }

  const backupData = {
    linkAlarmVersion: "1.1",
    timestamp: new Date().toISOString(),
    tasks: tasks,
    shortcuts: shortcuts,
    settings: settingsToBackup
  };

  const today = new Date().toISOString().split('T')[0];
  const defaultFileName = `Link-Alarm-Backup-${today}`;
  const fileName = prompt("Enter a filename for the backup:", defaultFileName);

  if (!fileName) {
    return;
  }

  const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName.endsWith('.json') ? fileName : `${fileName}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importData(jsonText) {
  try {
    const data = JSON.parse(jsonText);
    
    if (typeof data !== 'object' || data === null) {
        throw new Error("Invalid file format: Not a valid JSON object.");
    }
    
    let importedSomething = false;

    if (data.tasks && Array.isArray(data.tasks)) {
        saveToStorage("tasks", data.tasks);
        importedSomething = true;
    }

    if (data.shortcuts && Array.isArray(data.shortcuts)) {
        saveToStorage("shortcuts", data.shortcuts);
        importedSomething = true;
    }

    if (data.settings) {
        if(data.settings.theme) saveThemeSettings(data.settings.theme);
        if(data.settings.accent) saveAccent(data.settings.accent);
        if(data.settings.clock) saveClockFormat(data.settings.clock);
        if(data.settings.grid !== undefined) saveGridSetting(data.settings.grid);
        if(data.settings.shortcutScale) saveShortcutScale(data.settings.shortcutScale);
        if(data.settings.taskCardScale) saveTaskCardScale(data.settings.taskCardScale);
        importedSomething = true;
    }

    if(importedSomething) {
        alert("Data imported successfully! The page will now reload to apply all changes.");
        window.location.reload();
    } else {
        alert("Import failed: No valid tasks, shortcuts, or settings found in the file.");
    }

  } catch (e) {
    alert("Import failed: " + e.message);
  }
}