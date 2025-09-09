// service_worker.js

async function scheduleAllAlarms() {
  console.log('Scheduling all alarms...');
  await chrome.alarms.clearAll();
  const { tasks } = await chrome.storage.local.get("tasks");
  console.log('Retrieved tasks from storage:', tasks);
  if (!tasks || !Array.isArray(tasks)) {
    console.log('No tasks found or tasks is not an array');
    return;
  }

  const now = new Date();
  console.log('Current time:', now.toLocaleString());
  
  tasks.forEach(task => {
    // A task can have multiple alarms (main + reminders)
    let nextEventTime = null;
    const [hour, min] = task.from.split(":").map(Number);

    // Check if task has an end date and if it has passed
    if (task.recurrenceEndDate) {
        const endDate = new Date(task.recurrenceEndDate);
        endDate.setHours(23, 59, 59, 999); // End of the end date
        
        if (endDate < now) {
            console.log(`Task ${task.id} (${task.title}) skipped: End date ${task.recurrenceEndDate} has passed`);
            return; // Skip scheduling if end date has passed
        }
    }

    if (task.recurring === 'daily') {
        let nextEvent = new Date();
        nextEvent.setHours(hour, min, 0, 0);

        // If today's event time has passed, schedule for tomorrow
        if (nextEvent <= now) {
            nextEvent.setDate(nextEvent.getDate() + 1);
        }
        
        // Ensure the alarm doesn't schedule before its creation date
        const creationDate = new Date(task.createdAt || '1970-01-01');
        if (nextEvent < creationDate) {
            nextEvent = new Date(creationDate);
            nextEvent.setHours(hour, min, 0, 0);
            if (nextEvent <= now) {
                nextEvent.setDate(nextEvent.getDate() + 1);
            }
        }
        nextEventTime = nextEvent;

    } else if (task.recurring === 'weekly') {
        const taskDay = parseInt(task.dayOfWeek, 10);
        if (isNaN(taskDay)) return;
        let nextEvent = new Date();
        nextEvent.setHours(hour, min, 0, 0);
        let daysUntilNext = (taskDay - now.getDay() + 7) % 7;
        if (daysUntilNext === 0 && nextEvent <= now) {
            daysUntilNext = 7;
        }
        nextEvent.setDate(now.getDate() + daysUntilNext);
        nextEventTime = nextEvent;

    } else if (task.recurring === 'monthly') {
        const taskDate = new Date(task.date + 'T00:00:00');
        const dayOfMonth = taskDate.getDate();
        let nextEvent = new Date();
        nextEvent.setHours(hour, min, 0, 0);
        
        // Start calculation from the current month
        nextEvent.setDate(1); // Set to first day to avoid issues
        
        // If this month's event time has passed, move to next month
        const lastDayOfThisMonth = new Date(nextEvent.getFullYear(), nextEvent.getMonth() + 1, 0).getDate();
        nextEvent.setDate(Math.min(dayOfMonth, lastDayOfThisMonth));
        if (nextEvent <= now) {
             nextEvent.setMonth(nextEvent.getMonth() + 1);
             const lastDayOfNextMonth = new Date(nextEvent.getFullYear(), nextEvent.getMonth() + 1, 0).getDate();
             nextEvent.setDate(Math.min(dayOfMonth, lastDayOfNextMonth));
        }
        nextEventTime = nextEvent;

    } else if (task.recurring === 'yearly') {
        const taskDate = new Date(task.date + 'T00:00:00');
        const taskMonth = taskDate.getMonth();
        const taskDay = taskDate.getDate();
        let nextEvent = new Date();
        nextEvent.setHours(hour, min, 0, 0);
        nextEvent.setMonth(taskMonth, taskDay);
        
        if (nextEvent <= now) {
            nextEvent.setFullYear(nextEvent.getFullYear() + 1);
        }
        nextEventTime = nextEvent;

    } else if (task.recurring === 'custom' && task.customRecurValue && task.customRecurUnit) {
        const recurValue = parseInt(task.customRecurValue, 10) || 1;
        let nextEvent = new Date(task.date + 'T00:00:00');
        nextEvent.setHours(hour, min, 0, 0);

        // Keep adding the interval until the event is in the future
        while (nextEvent <= now) {
            switch (task.customRecurUnit) {
                case 'days':
                    nextEvent.setDate(nextEvent.getDate() + recurValue);
                    break;
                case 'weeks':
                    nextEvent.setDate(nextEvent.getDate() + (recurValue * 7));
                    break;
                case 'months':
                    nextEvent.setMonth(nextEvent.getMonth() + recurValue);
                    break;
                case 'years':
                    nextEvent.setFullYear(nextEvent.getFullYear() + recurValue);
                    break;
            }
        }
        nextEventTime = nextEvent;

    } else if (task.date) { // 'none' recurrence
        const oneTimeEvent = new Date(task.date + 'T00:00:00');
        oneTimeEvent.setHours(hour, min, 0, 0);
        if (oneTimeEvent > now) {
            nextEventTime = oneTimeEvent;
        }
    }

    if (!nextEventTime) {
        console.log(`Task ${task.id} (${task.title}): No future event to schedule`);
        return; // No future event to schedule
    }
    
    // Final check: If task has an end date, make sure the next event is not after it
    if (task.recurrenceEndDate) {
        const endDate = new Date(task.recurrenceEndDate);
        endDate.setHours(23, 59, 59, 999); // End of the end date
        
        if (nextEventTime > endDate) {
            console.log(`Task ${task.id} (${task.title}): Next event ${nextEventTime.toLocaleString()} is after end date ${endDate.toLocaleString()}, skipping`);
            return; // Skip scheduling if next event is after end date
        }
    }

    if (task.notificationEnabled) {
        chrome.alarms.create(`${task.id}_main`, { when: nextEventTime.getTime() });
    }

    if (task.reminders && task.reminders.length > 0) {
        task.reminders.forEach((reminder, index) => {
            const reminderValue = parseInt(reminder.value, 10);
            let offset = 0;
            if (reminder.unit === 'minutes') offset = reminderValue * 60000;
            else if (reminder.unit === 'hours') offset = reminderValue * 3600000;
            else if (reminder.unit === 'days') offset = reminderValue * 86400000;
            
            const reminderTime = nextEventTime.getTime() - offset;

            if (reminderTime > Date.now()) {
                chrome.alarms.create(`${task.id}_reminder_${index}`, { when: reminderTime });
            }
        });
    }
  });
}

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.tasks) {
    console.log('Tasks changed in storage, rescheduling alarms...');
    scheduleAllAlarms();
  }
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  console.log('Alarm triggered:', alarm.name);
  const [taskId, alarmType, reminderIndex] = alarm.name.split('_');
  const { tasks } = await chrome.storage.local.get("tasks");
  const task = tasks.find(t => t.id === taskId);

  if (task) {
    let title = `Time for: ${task.title}`;
    let message = `Scheduled from ${task.from} to ${task.to}.`;

    if (alarmType === 'reminder') {
        const reminder = task.reminders[parseInt(reminderIndex, 10)];
        title = `Reminder: ${task.title}`;
        message = `Starts in ${reminder.value} ${reminder.unit}.`;
    }
    
    const snoozeTime = task.snoozeTime || 5;
    const buttons = [];
    if (task.notes && task.notes.startsWith('http')) {
      buttons.push({ title: "Open Link" });
    }
    buttons.push({ title: `Snooze (${snoozeTime} min)` });

    chrome.notifications.create(alarm.name, {
      type: "basic",
      iconUrl: "assets/icons/icon128.png",
      title: title,
      message: message,
      priority: 2,
      buttons: buttons,
    });

    const tabs = await chrome.tabs.query({ url: chrome.runtime.getURL("newtab.html") });
    for (const tab of tabs) {
        chrome.tabs.sendMessage(tab.id, { action: "highlightTask", taskId: task.id });
    }
  }
  scheduleAllAlarms();
});

chrome.notifications.onButtonClicked.addListener(async (notificationId, buttonIndex) => {
  const [taskId] = notificationId.split('_');
  const { tasks } = await chrome.storage.local.get("tasks");
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;

  const hasLinkButton = task.notes && task.notes.startsWith('http');
  
  if (hasLinkButton && buttonIndex === 0) {
      chrome.tabs.create({ url: task.notes });
  } else {
      const snoozeTime = task.snoozeTime || 5;
      chrome.alarms.create(notificationId, { delayInMinutes: snoozeTime });
  }
  
  chrome.notifications.clear(notificationId);
});

chrome.runtime.onInstalled.addListener(scheduleAllAlarms);
chrome.runtime.onStartup.addListener(scheduleAllAlarms);
