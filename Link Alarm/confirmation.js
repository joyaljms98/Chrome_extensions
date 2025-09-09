// confirmation.js

const confirmModal = document.getElementById('confirmModal');
const confirmMessage = document.getElementById('confirmMessage');
const confirmBtn = document.getElementById('confirmBtn');
const cancelConfirmBtn = document.getElementById('cancelConfirmBtn');

let isConfirmationActive = false; // Flag to prevent multiple modals

/**
 * Shows a custom confirmation modal.
 * @param {string} message The message to display in the confirmation box.
 * @returns {Promise<boolean>} A promise that resolves to true if confirmed, false if canceled.
 */
export function showConfirmation(message) {
    // If a confirmation is already showing, ignore the new request
    if (isConfirmationActive) {
        return Promise.resolve(false);
    }
    isConfirmationActive = true;

    return new Promise((resolve) => {
        confirmMessage.textContent = message;
        confirmModal.classList.remove('hidden');

        const onConfirm = () => {
            confirmModal.classList.add('hidden');
            isConfirmationActive = false; // Reset flag
            resolve(true);
        };

        const onCancel = () => {
            confirmModal.classList.add('hidden');
            isConfirmationActive = false; // Reset flag
            resolve(false);
        };
        
        // Use { once: true } to automatically remove the listener after it fires
        confirmBtn.addEventListener('click', onConfirm, { once: true });
        cancelConfirmBtn.addEventListener('click', onCancel, { once: true });
    });
}
