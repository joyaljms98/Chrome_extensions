\<div align="center"\>

\<img src="[https://raw.githubusercontent.com/joyaljms98/Chrome\_extensions/refs/heads/Joyal's-Repository-default-branch/icons/icon128.png](https://raw.githubusercontent.com/joyaljms98/Chrome_extensions/refs/heads/Joyal's-Repository-default-branch/icons/icon128.png)" alt="Link Alarm Logo" width="120"\>
\</div align="center"\>

# Link Alarm

**A feature-rich new tab page designed to organize your day with powerful alarms, task management, and customizable shortcuts.**

Link Alarm is a powerful browser extension that transforms your new tab page into a productive and personalized dashboard. It allows you to set detailed alarms and reminders, manage a visual collection of shortcuts, and customize every aspect of the interface, from themes and colors to the layout and scale of elements. Say goodbye to missed deadlines and hello to an organized, efficient workflow.

-----

## Key Features Link Alarm is packed with features designed for users who demand control, customization, and efficiency.

### Alarm & Task Management

  \* **Advanced Alarms & Reminders**: Create detailed tasks with specific dates, times, and recurring options.
  \* **Calendar Integration**: A fully functional calendar in the right-side menu allows you to view all tasks, search them, and jump to any month or year to see scheduled events.
  \* **Trash & Archive**: Safely delete tasks and restore them later from the trash. The trash menu allows for individual restoration, single-item deletion, or clearing all deleted items at once.
  \* **Task Cards with Notes**: Main screen cards display task titles and a preview of your notes. A dropdown arrow reveals the full notes without leaving the view.
  \* **Dynamic Layout**: The "Add Task" card intelligently centers itself when no alarms are active, providing a clean, focused starting point.

### Homepage & Shortcut Customization

  \* **Visual Shortcuts**: Create a list of your favorite websites with their favicons displayed. Shortcuts are now centered and can be configured to open in the current tab.
  \* **Horizontal Scrolling**: The shortcut bar is a horizontally scrollable container, ensuring a clean look no matter how many shortcuts you add. Scroll with your mouse wheel while hovering for quick navigation.
  \* **Drag & Drop Reordering**: Easily rearrange your shortcuts in the settings menu or directly on the main screen. A semi-transparent placeholder shows you exactly where the shortcut will land.
  \* **Layout & Scaling Sliders**: Use intuitive sliders in the settings to control the size (scale) of both the shortcut buttons and the task cards to perfectly fit your screen and preference.
  \* **Customizable Background**: Add subtle, grid-based backgrounds to your new tab page, which are automatically tinted with your chosen accent color.

### UI & Themes

  \* **Multiple Themes**: Choose from Light, Dark, and OLED-friendly Pure White and Black themes, complete with gradient colors.
  \* **Custom Accent Colors**: Personalize your experience by selecting an accent color that applies to UI elements across all themes.
  \* **Auto Dark Mode**: Configure the extension to automatically switch to Dark Mode based on your schedule.
  \* **Modern & Fluid Interface**: Enjoy a smooth experience with draggable cards, a custom animated cursor, and collapsible left and right side menus for a distraction-free view.
  \* **Customizable Clock**: The homepage clock features optional blinking seconds and unique accent colors for each theme.

### Data Management & Settings

  \* **Backup & Restore**: Easily back up your entire Link Alarm database (alarms, shortcuts, and settings) to a JSON file.
  \* **Custom Backup Names**: Before saving, you can rename the backup file. The default name is set to `Link-Alarm backup (current date)`.
  \* **Streamlined Settings**: Settings are neatly organized into a left-side panel, with a simplified General menu for quick access to Appearance, Trash, and About sections.

-----

## Installation

1.   **Manual Installation**:
          \* Download the latest release `.zip` file from the [GitHub Releases](https://github.com/joyaljms98/Chrome_extensions) page.
          \* Unzip the file.
          \* Open Chrome and navigate to `chrome://extensions`.
          \* Enable **Developer mode** using the toggle in the top-right corner.
          \* Click the **"Load unpacked"** button and select the unzipped extension folder.

-----

## How to Use

  \* **Setting an Alarm**: On the new tab page, click the "Add Task" card. Fill in the details, set a date and time, and save. The new task will appear on your dashboard.
  \* **Managing Shortcuts**: Use the split "Add/Edit" button in the shortcuts bar to add new shortcuts or manage existing ones. In the settings, you can drag and drop to reorder them.
  \* **Navigating**: Use the hamburger icon on the left to access general settings. Use the menu on the right to view your calendar and search all alarms. Click on a date in the calendar to see tasks for that specific day.
  \* **Customizing**: Open the left-side menu to access "Appearance" settings. Here you can change themes, accent colors, and use sliders to adjust the scale of task cards and shortcuts.

-----

## Changelog

A detailed history of the features added to Link Alarm.

  * **v14.9.6**

      * Changed shortcut behavior to open links in the current tab.
      * Made the spacing between cards and shortcuts dynamic and proportional to their scale.
      * Added a "restore" button to the calendar to quickly return to the current month/year after navigating away.
      * Right-side menu title now dynamically updates to "All tasks" or "Tasks on {selected date}".
      * Fixed a responsive layout bug where shortcuts would be hidden on smaller screens.

  * **v14.9.5**

      * Centered the shortcuts bar on the main screen.
      * Enabled mouse-wheel scrolling when hovering over the shortcuts bar and the main tasks area.
      * Improved drag & drop for shortcuts with a clear repositioning placeholder.
      * Rescaled the "Add Task" modal (vertically smaller, horizontally wider).
      * Simplified the General Settings layout.
      * Implemented a "Go To" feature in the calendar to jump to a specific month and year via dropdowns.
      * Background grids are now tinted with the selected accent color.
      * Task cards now show a preview of notes and have been resized to be more compact.
      * Added a scaling slider for task cards.
      * Removed visible scrollbars from the shortcuts menu and "Add Task" modal for a cleaner look. Implemented overflow arrows for shortcuts.
      * Task card scaling now ensures text remains readable.

  * **v14.9.3**

      * Centered the shortcuts bar and ensured it starts in the center.
      * Enabled mouse-wheel scrolling for both the shortcuts bar and the main alarm cards area.
      * Added a visual placeholder to show where a shortcut will be placed during drag-and-drop rearrangement.
      * Adjusted the "Add Tasks" menu dimensions (vertically smaller, horizontally larger).
      * Simplified the "General" settings menu layout.
      * Enhanced the calendar in the right menu to allow users to click the Month/Year to jump to a specific date.
      * Made background grids a subtle shade of the chosen accent color.

  * **v14.9.2**

      * Converted the shortcut list into a horizontally scrollable menu to prevent wrapping to a new line.
      * Scaled down shortcut boxes by \~30% for a more compact look.
      * Added a scaling slider in settings to adjust the zoom of all shortcut buttons.
      * Split the "Add Shortcut" button into a two-part button for adding and editing shortcuts.
      * Added drag-and-drop reordering for shortcuts in the manage shortcuts menu.
      * Scaled down the "Add Tasks" menu by \~30%.

  * **v14.9.1**

      * Added a "Delete" button next to the "Restore" button for each item in the trash.
      * Added a "Clear Trash" button to delete all items in the trash permanently.
      * Changed the newtab icon from 🔔 to 📅.
      * Fixed a layout bug where the "Add Task" card was misaligned to the right when no alarms were present; it is now centered.

  * **v14.8**

      * Added a feature to rename the backup file in a custom text box before saving. Default is `Link-Alarm backup (current date)`.
      * Homepage shortcuts are now included in the backup file.
      * Added an 'X' button to close the "Add Task" menu.
      * Added form validation to show an error if the 'End date' is before the 'Start date' in the "Add Task" menu.

  * **v14.7**

      * Moved appearance settings into their own dedicated section.

  * **v14.5**

      * Relocated the clock from the header into its own dedicated `div`.

  * **v14.4**

      * Redesigned the "Add Alarm" button into a more interactive card.

  * **v14.3**

      * Fixed major bugs related to recurring alarms and calendar synchronization.

  * **v14.2**

      * Implemented a working calendar and an alarm search bar in the right-side menu.

  * **v14.1**

      * Added a right-side menu panel.
      * Fixed a critical bug where day updates were based on UTC; functionality is now correctly based on IST.

  * **v13.1**

      * Redesigned the "Add Alarm" and reminder settings UI.

  * **v12.3**

      * Made minor changes to notifications.

  * **v12.2**

      * Implemented auto-hide for the hamburger menu icon.
      * Added a search feature within the left-side menu.

  * **v12.1**

      * Fixed all outstanding bugs.
      * Added a toggle for background grids.
      * Fixed the left menu hamburger icon issue.
      * The side panel can now be closed by clicking elsewhere on the screen.

  * **v11.2**

      * Fixed bugs related to the left menu and the layout of the clock and shortcuts.
      * The default date for a new alarm now correctly updates to the current date.

  * **v11.1**

      * Added search functionality for shortcuts.
      * Created a separate menu for managing shortcuts.
      * Introduced a new popup extension menu.
      * The "Add Alarm" and "Add Shortcut" popups now pre-fill the website field based on the current active tab.

  * **v10**

      * Made many small adjustments to the layout, shortcuts, and cards.
      * Fixed a critical extension bug related to alarms.

  * **v9**

      * Implemented a custom confirmation popup message.

  * **v8**

      * Implemented Delete & Archive functionality with deletion details, restore animations.
      * Enhanced shortcuts with favicon display.
      * Added a modern custom cursor with smooth animations.

  * **v7**

      * Updated clock defaults, added blinking seconds.
      * Implemented separate accent colors for each theme and updated default accent colors.

  * **v6**

      * Introduced smoother, swipable, and draggable cards.

  * **v5**

      * Added Pure White and Black themes with gradient colors.
      * Added more accent color options.
      * Made the entire alarm card clickable to go to the associated website.

  * **v4**

      * Added a professional "About" page.

  * **v3**

      * Reorganized settings by adding a left menu panel.
      * Added customizable auto Dark Mode.

  * **v2**

      * Added Dark Mode.
      * Added default timings for alarms to help the user.

  * **v1**

      * Initial working version with core structure and bug fixes.

-----

## About the Developer

Link Alarm was created by **Joyal James**, a passionate developer from Kerala, India, dedicated to building tools that enhance productivity and organization on the web.

  \* Connect and explore other projects on [**GitHub**](https://github.com/joyaljms98).
  \* If you find Link Alarm useful, consider supporting its development by [**Buying Me a Coffee**](https://buymeacoffee.com/joyaljms98i).

-----

## Contributing

Contributions, issues, and feature requests are welcome\! Feel free to contact me via [Email](mailto:joyaljms98@gmail.com). Just put the tag \#LinkAlarm with it. Thank you.