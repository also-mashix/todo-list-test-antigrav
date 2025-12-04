import { THEMES } from './themes.js';
import { storage } from './storage.js';
export const ThemeManager = {
    currentTheme: 'system',
    async init() {
        // Load saved theme or default to system
        const saved = await this.loadTheme();
        this.applyTheme(saved);
    },
    async loadTheme() {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
            return new Promise((resolve) => {
                chrome.storage.sync.get(['theme'], (result) => {
                    resolve(result.theme || 'system');
                });
            });
        } else {
            // Fallback for local testing
            return Promise.resolve(localStorage.getItem('theme') || 'system');
        }
    },
    applyTheme(themeName) {
        if (!THEMES[themeName]) themeName = 'system';
        this.currentTheme = themeName;
        const root = document.documentElement;
        const theme = THEMES[themeName];
        // Clear existing inline styles first to reset to CSS defaults if needed
        // This is important for 'system' theme to revert to CSS variables defined in :root
        const allVars = new Set();
        Object.values(THEMES).forEach(t => Object.keys(t.colors).forEach(k => allVars.add(k)));
        allVars.forEach(v => root.style.removeProperty(v));
        // Apply new theme colors
        if (themeName !== 'system') {
            Object.entries(theme.colors).forEach(([property, value]) => {
                root.style.setProperty(property, value);
            });
        }
        this.saveTheme(themeName);
    },
    saveTheme(themeName) {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
            chrome.storage.sync.set({ theme: themeName });
        } else {
            localStorage.setItem('theme', themeName);
        }
    },
    getAvailableThemes() {
        return Object.entries(THEMES).map(([key, value]) => ({
            id: key,
            name: value.name
        }));
    }
};