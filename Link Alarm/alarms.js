// alarms.js

/**
 * This function is called when tasks are updated, but it no longer
 * needs to send a message to the service worker.
 *
 * The service worker (`service_worker.js`) now automatically detects
 * changes to tasks saved in `chrome.storage` and reschedules
 * alarms on its own. This prevents the "Receiving end does not exist"
 * error and is a more robust way to keep alarms in sync.
 */
export function scheduleAlarms() {
  // The message-sending logic has been removed.
}
