const STORAGE_KEY = 'antigravity_todos';

export const storage = {
    getTodos: async () => {
        try {
            const result = await chrome.storage.local.get(STORAGE_KEY);
            return result[STORAGE_KEY] || [];
        } catch (e) {
            console.error('Failed to load todos:', e);
            return [];
        }
    },

    saveTodos: async (todos) => {
        try {
            await chrome.storage.local.set({ [STORAGE_KEY]: todos });
        } catch (e) {
            console.error('Failed to save todos:', e);
        }
    }
};
