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
                        resolve({ lists: [{ id: 'default', title: 'Inbox', items: [] }] });
                        return;
                    }

                    let data = result.todos;
                    // Migration: if it's an array (old format), wrap it in the new format
                    if (Array.isArray(data)) {
                        data = {
                            lists: [
                                { id: 'default', title: 'Inbox', items: data }
                            ]
                        };
                    }

                    // Default structure if nothing exists
                    if (!data || !data.lists) {
                        data = { lists: [{ id: 'default', title: 'Inbox', items: [] }] };
                    }

                    resolve(data);
                });
            });
        } else {
            // Fallback to localStorage with error handling
            try {
                const stored = localStorage.getItem('todos');
                if (!stored) return Promise.resolve({ lists: [{ id: 'default', title: 'Inbox', items: [] }] });

                let parsed = JSON.parse(stored);

                // Migration logic for localStorage
                if (Array.isArray(parsed)) {
                    parsed = {
                        lists: [
                            { id: 'default', title: 'Inbox', items: parsed }
                        ]
                    };
                }

                if (!parsed.lists) {
                    return Promise.resolve({ lists: [{ id: 'default', title: 'Inbox', items: [] }] });
                }

                return Promise.resolve(parsed);
            } catch (error) {
                console.error('Error parsing todos from localStorage:', error);
                // Clear corrupted data - maybe safer to return empty than delete? 
                // But for now keeping error handling simple
                return Promise.resolve({ lists: [{ id: 'default', title: 'Inbox', items: [] }] });
            }
        }
    },

    async saveTodos(data) {
        // Validate input - now expects an object with lists array
        if (!data || !Array.isArray(data.lists)) {
            console.error('saveTodos: expected object with lists array, got', data);
            return Promise.reject(new Error('Invalid todos data'));
        }

        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
            return new Promise((resolve, reject) => {
                // Check storage quota before saving
                const dataSize = JSON.stringify(data).length;
                if (dataSize > MAX_STORAGE_BYTES) {
                    const error = new Error('Storage quota exceeded');
                    console.error('Storage quota exceeded:', dataSize, 'bytes');
                    reject(error);
                    return;
                }

                chrome.storage.sync.set({ todos: data }, () => {
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
                const serialized = JSON.stringify(data);
                localStorage.setItem('todos', serialized);
                return Promise.resolve();
            } catch (error) {
                console.error('Error saving todos to localStorage:', error);
                return Promise.reject(error);
            }
        }
    }
};
