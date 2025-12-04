export const THEMES = {
    'system': {
        name: 'System Default',
        colors: {} // Empty means use default CSS variables (which handle system preference)
    },
    'dracula': {
        name: 'Dracula',
        colors: {
            '--primary-color': '#bd93f9',
            '--bg-color': '#282a36',
            '--text-color': '#f8f8f2',
            '--item-bg': '#44475a',
            '--border-color': '#6272a4',
            '--danger-color': '#ff5555'
        }
    },
    'material-3': {
        name: 'Material Design 3',
        colors: {
            '--primary-color': '#6750a4',
            '--bg-color': '#fffbfe',
            '--text-color': '#1c1b1f',
            '--item-bg': '#f3edf7', // Surface container low
            '--border-color': '#cac4d0',
            '--danger-color': '#b3261e'
        }
    },
    'tokyo-night': {
        name: 'Tokyo Night',
        colors: {
            '--primary-color': '#7aa2f7',
            '--bg-color': '#1a1b26',
            '--text-color': '#a9b1d6',
            '--item-bg': '#24283b',
            '--border-color': '#414868',
            '--danger-color': '#f7768e'
        }
    },
    'solarized-light': {
        name: 'Solarized Light',
        colors: {
            '--primary-color': '#268bd2',
            '--bg-color': '#fdf6e3',
            '--text-color': '#657b83',
            '--item-bg': '#eee8d5',
            '--border-color': '#93a1a1',
            '--danger-color': '#dc322f'
        }
    },
    'solarized-dark': {
        name: 'Solarized Dark',
        colors: {
            '--primary-color': '#268bd2',
            '--bg-color': '#002b36',
            '--text-color': '#839496',
            '--item-bg': '#073642',
            '--border-color': '#586e75',
            '--danger-color': '#dc322f'
        }
    }
};