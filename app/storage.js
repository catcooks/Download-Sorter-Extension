// storage.js

/**
 * Saves the current file map to Chrome's local storage
 * @param {Object} fileMap 
 */
export const saveFileMap = (fileMap) => {
    chrome.storage.local.set({ 'FILE_MAP': fileMap }, () => {
        console.log('File Map saved to local storage.');
    });
};
export const getFileMap = (defaultMap) => {
    return new Promise((resolve) => {
        chrome.storage.local.get(['FILE_MAP'], (result) => {
            if (result.FILE_MAP) {
                resolve(result.FILE_MAP);
            } else {
                resolve(defaultMap);
            }
        });
    });
};