const STORAGE_KEY = 'antigravity_todos';

export const storage = {
    async getTodos() {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
            return new Promise((resolve) => {
                chrome.storage.sync.get(['todos'], (result) => {
                    resolve(result.todos || []);
                });
            });
        } else {
            const stored = localStorage.getItem('todos');
            return Promise.resolve(stored ? JSON.parse(stored) : []);
        }
    },

    async saveTodos(todos) {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
            return new Promise((resolve) => {
                chrome.storage.sync.set({ todos }, () => {
                    resolve();
                });
            });
        } else {
            localStorage.setItem('todos', JSON.stringify(todos));
            return Promise.resolve();
        }
    }
};
