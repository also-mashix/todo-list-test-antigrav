import { storage } from './storage.js';
import { ThemeManager } from './theme-manager.js';

const todoList = document.getElementById('todo-list');
const newTodoInput = document.getElementById('new-todo');
const addBtn = document.getElementById('add-btn');

// Settings UI Elements
const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const themeList = document.getElementById('theme-list');

// Security constants
const MAX_TODO_LENGTH = 5000;

let todos = [];

// Security utility: Sanitize HTML to prevent XSS
function sanitizeHTML(text) {
    // Strip all HTML tags and return plain text
    const div = document.createElement('div');
    div.textContent = text;
    return div.textContent || '';
}

// Initialize
async function init() {
    // Initialize Theme
    await ThemeManager.init();
    renderThemeList();

    // Load Todos
    todos = await storage.getTodos();
    renderTodos();

    addBtn.addEventListener('click', addTodo);
    newTodoInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTodo();
    });

    // Settings Event Listeners
    settingsBtn.addEventListener('click', openSettings);
    closeModalBtn.addEventListener('click', closeSettings);
    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) closeSettings();
    });
}

function openSettings() {
    settingsModal.classList.add('open');
    renderThemeList(); // Re-render to show active state correctly
}

function closeSettings() {
    settingsModal.classList.remove('open');
}

function renderThemeList() {
    themeList.innerHTML = '';
    const themes = ThemeManager.getAvailableThemes();

    themes.forEach(theme => {
        const li = document.createElement('li');
        li.className = `theme-option ${ThemeManager.currentTheme === theme.id ? 'active' : ''}`;

        // Create theme name span safely
        const nameSpan = document.createElement('span');
        nameSpan.textContent = theme.name;
        li.appendChild(nameSpan);

        // Add checkmark if active
        if (ThemeManager.currentTheme === theme.id) {
            const checkSpan = document.createElement('span');
            checkSpan.textContent = '✓';
            li.appendChild(checkSpan);
        }

        li.addEventListener('click', () => {
            ThemeManager.applyTheme(theme.id);
            renderThemeList(); // Update UI to reflect change
        });
        themeList.appendChild(li);
    });
}

function renderTodos() {
    todoList.innerHTML = '';
    todos.forEach((todo, index) => {
        const li = document.createElement('li');
        li.className = `todo-item ${todo.completed ? 'completed' : ''}`;
        li.draggable = true;
        li.dataset.index = index;

        // Drag Handle
        const handle = document.createElement('span');
        handle.className = 'drag-handle';
        handle.textContent = '☰'; // Hamburger icon
        li.appendChild(handle);

        // Checkbox
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = todo.completed;
        checkbox.addEventListener('change', () => toggleTodo(index));
        li.appendChild(checkbox);

        // Content - with XSS protection
        const span = document.createElement('span');
        span.className = 'todo-content';
        span.textContent = todo.text;
        span.contentEditable = true;

        // Prevent pasting HTML content
        span.addEventListener('paste', (e) => {
            e.preventDefault();
            const text = (e.clipboardData || window.clipboardData).getData('text/plain');
            const sanitized = sanitizeHTML(text);
            document.execCommand('insertText', false, sanitized);
        });

        span.addEventListener('blur', () => {
            // Sanitize content when editing is done
            const sanitized = sanitizeHTML(span.textContent);
            updateTodo(index, sanitized);
        });

        span.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                span.blur();
            }
        });
        li.appendChild(span);

        // Delete Button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.textContent = '×';
        deleteBtn.addEventListener('click', () => deleteTodo(index));
        li.appendChild(deleteBtn);

        // Drag Events
        li.addEventListener('dragstart', handleDragStart);
        li.addEventListener('dragover', handleDragOver);
        li.addEventListener('drop', handleDrop);
        li.addEventListener('dragend', handleDragEnd);

        todoList.appendChild(li);
    });
}

async function addTodo() {
    const text = newTodoInput.value.trim();

    // Input validation
    if (!text) {
        return;
    }

    if (text.length > MAX_TODO_LENGTH) {
        alert(`Todo is too long. Maximum length is ${MAX_TODO_LENGTH} characters.`);
        return;
    }

    // Sanitize input
    const sanitized = sanitizeHTML(text);

    try {
        todos.push({
            text: sanitized,
            completed: false,
            id: crypto.randomUUID()
        });
        newTodoInput.value = '';
        await saveAndRender();
    } catch (error) {
        console.error('Error adding todo:', error);
        alert('Failed to add todo. Please try again.');
    }
}

async function toggleTodo(index) {
    todos[index].completed = !todos[index].completed;
    await saveAndRender();
}

async function updateTodo(index, newText) {
    const text = newText.trim();

    if (!text) {
        // Delete if empty for better UX
        todos.splice(index, 1);
    } else if (text.length > MAX_TODO_LENGTH) {
        alert(`Todo is too long. Maximum length is ${MAX_TODO_LENGTH} characters.`);
        // Revert to original text
        renderTodos();
        return;
    } else {
        // Sanitize and update
        todos[index].text = sanitizeHTML(text);
    }

    try {
        await saveAndRender();
    } catch (error) {
        console.error('Error updating todo:', error);
        alert('Failed to update todo. Please try again.');
        renderTodos(); // Revert UI
    }
}

async function deleteTodo(index) {
    todos.splice(index, 1);
    await saveAndRender();
}

async function saveAndRender() {
    await storage.saveTodos(todos);
    renderTodos();
}

// Drag and Drop Logic
let draggedItemIndex = null;

function handleDragStart(e) {
    draggedItemIndex = +this.dataset.index;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const item = e.target.closest('.todo-item');
    if (item && item !== this) {
        // Optional: Add visual indicator of where it will drop
    }
}

async function handleDrop(e) {
    e.preventDefault();
    const targetItem = e.target.closest('.todo-item');
    if (targetItem) {
        const targetIndex = +targetItem.dataset.index;
        if (draggedItemIndex !== null && draggedItemIndex !== targetIndex) {
            const [draggedItem] = todos.splice(draggedItemIndex, 1);
            todos.splice(targetIndex, 0, draggedItem);
            await saveAndRender(); // Await to prevent race conditions
        }
    }
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
    draggedItemIndex = null;
}

init();
