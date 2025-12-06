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


let todoData = { lists: [] };
let draggingItemConfig = null; // Store { listId, todoId, element }

// Security utility: Ensure text is treated as plain string
function sanitizeHTML(text) {
    return text ? String(text) : '';
}

// Initialize
async function init() {
    // Initialize Theme
    await ThemeManager.init();
    renderThemeList();

    // Load Todos
    todoData = await storage.getTodos();

    // Migration/Validation: Ensure default list exists
    if (!todoData.lists || todoData.lists.length === 0) {
        todoData.lists = [{ id: 'default', title: 'Inbox', items: [] }];
    }

    // Ensure all todos have IDs (migration for items within lists)
    let hasChanges = false;
    todoData.lists.forEach(list => {
        list.items.forEach(todo => {
            if (!todo.id) {
                todo.id = crypto.randomUUID();
                hasChanges = true;
            }
        });
    });

    if (hasChanges) {
        await storage.saveTodos(todoData);
    }

    renderLists();

    addBtn.addEventListener('click', addTodo);
    newTodoInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTodo();
    });

    // Create List Button
    renderCreateListBtn();

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

function renderCreateListBtn() {
    // Check if button already exists to avoid duplicates (though init calls once)
    if (document.getElementById('create-list-btn')) return;

    const container = document.querySelector('.container');
    const btn = document.createElement('button');
    btn.id = 'create-list-btn';
    btn.textContent = '+ Create New List';
    btn.className = 'create-list-btn'; // We'll need to style this
    btn.style.marginTop = '10px';
    btn.style.width = '100%';
    btn.style.padding = '8px';

    btn.addEventListener('click', createNewList);
    container.appendChild(btn);
}

async function createNewList() {
    const name = prompt("Enter list name:");
    if (!name) return;

    const newList = {
        id: crypto.randomUUID(),
        title: name,
        items: []
    };

    todoData.lists.push(newList);
    await saveAndRender();
}

function renderLists() {
    todoList.innerHTML = '';

    todoData.lists.forEach(list => {
        const listContainer = document.createElement('li');
        listContainer.className = 'list-container';
        listContainer.dataset.listId = list.id;

        // List Header
        if (list.id !== 'default') {
            const header = document.createElement('div');
            header.className = 'list-header';

            const title = document.createElement('h3');
            title.textContent = list.title;
            header.appendChild(title);

            const delBtn = document.createElement('button');
            delBtn.textContent = '×';
            delBtn.className = 'delete-list-btn';
            delBtn.onclick = () => deleteList(list.id);
            header.appendChild(delBtn);

            listContainer.appendChild(header);
        }

        // List Items Container (UL)
        const ul = document.createElement('ul');
        ul.className = 'nested-todo-list';
        ul.dataset.listId = list.id;

        // Drag events for this specific list
        ul.addEventListener('dragover', handleDragOver);
        ul.addEventListener('drop', (e) => handleDrop(e, list.id));

        // Render items for this list
        list.items.forEach((todo, index) => {
            const li = createTodoElement(todo, index, list.id);
            ul.appendChild(li);
        });

        listContainer.appendChild(ul);
        todoList.appendChild(listContainer);
    });
}

function createTodoElement(todo, index, listId) {
    const li = document.createElement('li');
    li.className = `todo-item ${todo.completed ? 'completed' : ''}`;
    li.dataset.index = index;
    li.dataset.id = todo.id;
    li.dataset.listId = listId;

    // Drag Handle
    const handle = document.createElement('span');
    handle.className = 'drag-handle';
    handle.textContent = '☰';

    // Only allow dragging when using the handle
    handle.addEventListener('mousedown', () => li.draggable = true);
    handle.addEventListener('mouseup', () => li.draggable = false);
    handle.addEventListener('mouseout', () => li.draggable = false);

    li.appendChild(handle);

    // Checkbox
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = todo.completed;
    checkbox.addEventListener('change', () => toggleTodo(listId, index));
    li.appendChild(checkbox);

    // Content
    const span = document.createElement('span');
    span.className = 'todo-content';
    span.textContent = todo.text;
    span.contentEditable = true;

    span.addEventListener('paste', (e) => {
        e.preventDefault();
        const text = (e.clipboardData || window.clipboardData).getData('text/plain');
        const sanitized = sanitizeHTML(text);
        document.execCommand('insertText', false, sanitized);
    });

    span.addEventListener('blur', () => {
        const sanitized = sanitizeHTML(span.textContent);
        updateTodo(listId, index, sanitized);
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
    deleteBtn.addEventListener('click', () => deleteTodo(listId, index));
    li.appendChild(deleteBtn);

    // Drag Events
    li.addEventListener('dragstart', (e) => handleDragStart(e, listId, index, li));
    li.addEventListener('dragend', handleDragEnd);

    return li;
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
    const newTodo = {
        text: sanitized,
        completed: false,
        id: crypto.randomUUID()
    };

    // Always add to default list (Inbox)
    const defaultList = todoData.lists.find(l => l.id === 'default');
    if (defaultList) {
        defaultList.items.push(newTodo);
    } else {
        // Fallback if default list missing
        todoData.lists.unshift({ id: 'default', title: 'Inbox', items: [newTodo] });
    }

    const previousValue = newTodoInput.value;
    newTodoInput.value = '';

    try {
        await saveAndRender();
    } catch (error) {
        console.error('Error adding todo:', error);
        alert('Failed to add todo. Please try again.');
        // Revert state
        if (defaultList) defaultList.items.pop();
        newTodoInput.value = previousValue;
        renderLists();
    }
}

async function toggleTodo(listId, index) {
    const list = todoData.lists.find(l => l.id === listId);
    if (!list) return;

    const wasCompleted = list.items[index].completed;
    list.items[index].completed = !wasCompleted;

    try {
        await saveAndRender();
    } catch (error) {
        console.error('Error toggling todo:', error);
        list.items[index].completed = wasCompleted; // Revert
        renderLists();
    }
}

async function updateTodo(listId, index, newText) {
    const text = newText.trim();
    const list = todoData.lists.find(l => l.id === listId);
    if (!list) return;

    const oldText = list.items[index].text;

    if (!text) {
        // Delete if empty for better UX
        const deleted = list.items.splice(index, 1)[0];
        try {
            await saveAndRender();
        } catch (error) {
            // Revert
            list.items.splice(index, 0, deleted);
            renderLists();
        }
        return;
    } else if (text.length > MAX_TODO_LENGTH) {
        alert(`Todo is too long. Maximum length is ${MAX_TODO_LENGTH} characters.`);
        // Revert to original text
        renderLists();
        return;
    } else {
        // Sanitize and update
        list.items[index].text = sanitizeHTML(text);
    }

    try {
        await saveAndRender();
    } catch (error) {
        console.error('Error updating todo:', error);
        alert('Failed to update todo. Please try again.');
        list.items[index].text = oldText; // Revert
        renderLists();
    }
}

async function deleteTodo(listId, index) {
    const list = todoData.lists.find(l => l.id === listId);
    if (!list) return;

    const deleted = list.items.splice(index, 1)[0];

    try {
        await saveAndRender();
    } catch (error) {
        console.error('Error deleting todo:', error);
        // Revert
        list.items.splice(index, 0, deleted);
        renderLists();
    }
}

async function deleteList(listId) {
    if (listId === 'default') return; // Cannot delete default list

    if (!confirm('Are you sure you want to delete this list?')) return;

    const listIndex = todoData.lists.findIndex(l => l.id === listId);
    if (listIndex === -1) return;

    const deleted = todoData.lists.splice(listIndex, 1)[0];

    // Optionally move items to default list instead of deleting?
    // For now assuming delete list = delete items. 

    try {
        await saveAndRender();
    } catch (error) {
        console.error('Error deleting list:', error);
        todoData.lists.splice(listIndex, 0, deleted);
        renderLists();
    }
}

async function saveAndRender() {
    await storage.saveTodos(todoData);
    renderLists();
}

// Drag and Drop Logic
let draggedItem = null;
let placeholder = null;
let sourceListId = null;

function handleDragStart(e, listId, index, element) {
    draggedItem = element;
    sourceListId = listId;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', element.innerHTML);

    // Create placeholder
    placeholder = document.createElement('li');
    placeholder.className = 'sortable-placeholder';
    placeholder.style.height = `${element.offsetHeight}px`;

    requestAnimationFrame(() => {
        element.classList.add('dragging-original');
        element.parentNode.insertBefore(placeholder, element.nextSibling);
    });
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    e.stopPropagation(); // Stop bubbling

    // Target UL
    let targetList = e.target.closest('ul.nested-todo-list');
    if (!targetList) return;

    const afterElement = getDragAfterElement(targetList, e.clientY);

    if (afterElement == null) {
        targetList.appendChild(placeholder);
    } else {
        targetList.insertBefore(placeholder, afterElement);
    }
}

async function handleDrop(e, targetListId) {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedItem || !placeholder.parentNode) return;

    // Get the final destination list from the placeholder's parent
    // The handleDrop argument targetListId might be the list container, which is correct
    // But let's verify where placeholder actually ended up
    const finalParent = placeholder.parentNode;
    if (!finalParent) return;

    const finalListId = finalParent.dataset.listId;

    // Insert dragged item at placeholder position
    finalParent.insertBefore(draggedItem, placeholder);
    placeholder.remove();
    draggedItem.classList.remove('dragging-original');

    // Rebuild data from DOM
    // For simplicity and robustness, we will rebuild the items array for both source and destination lists
    // or just all lists. Given local nature, all lists is fine or just modified ones.

    const sourceList = todoData.lists.find(l => l.id === sourceListId);
    const destList = todoData.lists.find(l => l.id === finalListId);

    // If we just moved within same list
    if (sourceListId === finalListId) {
        reorderList(sourceList, finalParent);
    } else {
        // Moved across lists
        // 1. Remove from source
        // We know which item it was from the dragged element's dataset (but dataset might be stale if we relied on index)
        // Best to rely on ID.
        const itemId = draggedItem.dataset.id;
        const itemIndex = sourceList.items.findIndex(i => i.id === itemId);
        if (itemIndex > -1) {
            const [item] = sourceList.items.splice(itemIndex, 1);
            // 2. Add to dest (we need to find insertion index)
            // We can do this by re-reading the DOM for the dest list
            // But we need to insert the `item` object into destList.items at the correct spot

            // Let's just re-read the DOM of the dest list to build the new items array
            // But we need the item object. 
            // Temporarily put it in a map or just assume we have it.

            // Actually, `reorderList` logic works if we can map DOM IDs back to objects.
            // But the item is now in `destList` DOM but not in `destList` data.
            // So we need to add it to `destList` data before reordering? 
            // Or just collect all IDs from DOM and find them in ANY list (or check sourceList/destList).

            // Strategy: Find item object, remove from source, then use DOM order to rebuild dest list.
            destList.items.push(item); // Append temporarily, then sort by DOM
            reorderList(destList, finalParent);
        }
    }

    await saveAndRender();

    draggedItem = null;
    placeholder = null;
    sourceListId = null;
}

function reorderList(listData, listDom) {
    const newItems = [];
    const domItems = listDom.querySelectorAll('.todo-item');

    domItems.forEach(domItem => {
        const id = domItem.dataset.id;
        // Find in listData (or potentially globally if we want to be safe, but we handled move already)
        let item = listData.items.find(t => t.id === id);

        // If not in listData, checking if it was the moved item? 
        // In handleDrop, we moved the object to listData.items already.

        if (item) {
            newItems.push(item);
        }
    });

    listData.items = newItems;
}


function handleDragEnd(e) {
    if (draggedItem) {
        draggedItem.classList.remove('dragging-original');
        draggedItem.draggable = false;
    }
    if (placeholder && placeholder.parentNode) {
        placeholder.remove();
    }
    draggedItem = null;
    placeholder = null;
    sourceListId = null;
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
