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

    // Migration: Ensure all todos have IDs
    let hasChanges = false;
    todos.forEach(todo => {
        if (!todo.id) {
            todo.id = crypto.randomUUID();
            hasChanges = true;
        }
    });
    if (hasChanges) {
        await storage.saveTodos(todos);
    }

    renderTodos();

    addBtn.addEventListener('click', addTodo);
    newTodoInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTodo();
    });

    // Global Drag Events
    todoList.addEventListener('dragover', handleDragOver);
    todoList.addEventListener('drop', handleDrop);

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
        // li.draggable = true; // Removed to prevent conflict with text selection
        li.dataset.index = index;
        li.dataset.id = todo.id;

        // Drag Handle
        const handle = document.createElement('span');
        handle.className = 'drag-handle';
        handle.textContent = '☰'; // Hamburger icon

        // Only allow dragging when using the handle
        handle.addEventListener('mousedown', () => li.draggable = true);
        handle.addEventListener('mouseup', () => li.draggable = false);
        handle.addEventListener('mouseout', () => li.draggable = false);

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
let draggedItem = null;
let placeholder = null;

function handleDragStart(e) {
    draggedItem = this;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.innerHTML); // For compatibility

    // Create placeholder
    placeholder = document.createElement('li');
    placeholder.className = 'sortable-placeholder';
    placeholder.style.height = `${this.offsetHeight}px`;

    // Delay hiding the original element so the drag ghost is created properly
    requestAnimationFrame(() => {
        this.classList.add('dragging-original');
        this.parentNode.insertBefore(placeholder, this.nextSibling);
    });
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const afterElement = getDragAfterElement(todoList, e.clientY);

    if (afterElement == null) {
        todoList.appendChild(placeholder);
    } else {
        todoList.insertBefore(placeholder, afterElement);
    }
}

async function handleDrop(e) {
    e.preventDefault();

    if (!draggedItem || !placeholder.parentNode) return;

    // Insert dragged item at placeholder position
    placeholder.parentNode.insertBefore(draggedItem, placeholder);
    placeholder.remove();
    draggedItem.classList.remove('dragging-original');

    // Reconstruct todos array based on new DOM order
    const newTodos = [];
    const items = todoList.querySelectorAll('.todo-item');

    items.forEach(item => {
        const id = item.dataset.id;
        const todo = todos.find(t => t.id === id);
        if (todo) {
            newTodos.push(todo);
        }
    });

    todos = newTodos;
    await saveAndRender();

    draggedItem = null;
    placeholder = null;
}

function handleDragEnd(e) {
    if (draggedItem) {
        draggedItem.classList.remove('dragging-original');
        draggedItem.draggable = false; // Reset draggable state
    }
    if (placeholder && placeholder.parentNode) {
        placeholder.remove();
    }
    draggedItem = null;
    placeholder = null;
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.todo-item:not(.dragging-original)')];

    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;

        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

init();
