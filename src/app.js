import { storage } from './storage.js';

const todoList = document.getElementById('todo-list');
const newTodoInput = document.getElementById('new-todo');
const addBtn = document.getElementById('add-btn');

let todos = [];

// Initialize
async function init() {
    todos = await storage.getTodos();
    renderTodos();

    addBtn.addEventListener('click', addTodo);
    newTodoInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTodo();
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
        handle.innerHTML = '&#9776;'; // Hamburger icon
        li.appendChild(handle);

        // Checkbox
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = todo.completed;
        checkbox.addEventListener('change', () => toggleTodo(index));
        li.appendChild(checkbox);

        // Content
        const span = document.createElement('span');
        span.className = 'todo-content';
        span.textContent = todo.text;
        span.contentEditable = true;
        span.addEventListener('blur', () => updateTodo(index, span.textContent));
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
        deleteBtn.innerHTML = '&times;';
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
    if (text) {
        todos.push({ text, completed: false, id: Date.now() });
        newTodoInput.value = '';
        await saveAndRender();
    }
}

async function toggleTodo(index) {
    todos[index].completed = !todos[index].completed;
    await saveAndRender();
}

async function updateTodo(index, newText) {
    const text = newText.trim();
    if (text) {
        todos[index].text = text;
    } else {
        // If empty, maybe delete? Or just revert? Let's revert for now or keep empty if user insists, but usually we don't want empty todos.
        // Let's delete if empty for better UX
        todos.splice(index, 1);
    }
    await saveAndRender();
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

function handleDrop(e) {
    e.preventDefault();
    const targetItem = e.target.closest('.todo-item');
    if (targetItem) {
        const targetIndex = +targetItem.dataset.index;
        if (draggedItemIndex !== null && draggedItemIndex !== targetIndex) {
            const [draggedItem] = todos.splice(draggedItemIndex, 1);
            todos.splice(targetIndex, 0, draggedItem);
            saveAndRender();
        }
    }
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
    draggedItemIndex = null;
}

init();
