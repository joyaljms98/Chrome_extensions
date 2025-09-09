export function saveToStorage(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
  // Also save to chrome.storage for the service worker
  if (chrome.storage) {
    chrome.storage.local.set({ [key]: data });
  }
}

export function loadFromStorage(key, fallback = []) {
  try {
    const data = JSON.parse(localStorage.getItem(key));
    return data ?? fallback;
  } catch {
    return fallback;
  }
}

export function removeFromStorage(key) {
  localStorage.removeItem(key);
  if (chrome.storage) {
    chrome.storage.local.remove(key);
  }
}
