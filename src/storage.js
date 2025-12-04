const STORAGE_KEY = 'antigravity_todos';
const MAX_STORAGE_BYTES = 100000; // Chrome sync storage quota is ~100KB

export const storage = {
    async getTodos() {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
            return new Promise((resolve) => {
                chrome.storage.sync.get(['todos'], (result) => {
                    // Check for Chrome API errors
                    if (chrome.runtime.lastError) {
                        console.error('Chrome storage error:', chrome.runtime.lastError);
                        resolve([]);
                        return;
                    }
                    resolve(result.todos || []);
                });
            });
        } else {
            // Fallback to localStorage with error handling
            try {
                const stored = localStorage.getItem('todos');
                if (!stored) return Promise.resolve([]);

                const parsed = JSON.parse(stored);
                // Validate that parsed data is an array
                if (!Array.isArray(parsed)) {
                    console.error('Invalid todos data format, expected array');
                    return Promise.resolve([]);
                }
                return Promise.resolve(parsed);
            } catch (error) {
                console.error('Error parsing todos from localStorage:', error);
                // Clear corrupted data
                localStorage.removeItem('todos');
                return Promise.resolve([]);
            }
        }
    },

    async saveTodos(todos) {
        // Validate input
        if (!Array.isArray(todos)) {
            console.error('saveTodos: expected array, got', typeof todos);
            return Promise.reject(new Error('Invalid todos data'));
        }

        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
            return new Promise((resolve, reject) => {
                // Check storage quota before saving
                const dataSize = JSON.stringify(todos).length;
                if (dataSize > MAX_STORAGE_BYTES) {
                    const error = new Error('Storage quota exceeded');
                    console.error('Storage quota exceeded:', dataSize, 'bytes');
                    reject(error);
                    return;
                }

                chrome.storage.sync.set({ todos }, () => {
                    if (chrome.runtime.lastError) {
                        console.error('Chrome storage error:', chrome.runtime.lastError);
                        reject(new Error(chrome.runtime.lastError.message));
                        return;
                    }
                    resolve();
                });
            });
        } else {
            try {
                const serialized = JSON.stringify(todos);
                localStorage.setItem('todos', serialized);
                return Promise.resolve();
            } catch (error) {
                console.error('Error saving todos to localStorage:', error);
                return Promise.reject(error);
            }
        }
    }
};
