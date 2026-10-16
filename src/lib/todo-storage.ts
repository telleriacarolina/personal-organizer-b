import { createId } from './id';

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
  updatedAt: number;
}

export const TODO_STORAGE_KEY = 'personal-organizer-todos';

export function loadTodos(): TodoItem[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(TODO_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as TodoItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveTodos(todos: TodoItem[]) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(TODO_STORAGE_KEY, JSON.stringify(todos));
}

export function addTodo(text: string, items: TodoItem[] = loadTodos()): TodoItem[] {
  const nextText = text.trim();
  if (!nextText) {
    return items;
  }

  const nextTodo: TodoItem = {
    id: createId('todo'),
    text: nextText,
    completed: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  return [nextTodo, ...items];
}

export function toggleTodo(id: string, items: TodoItem[] = loadTodos()): TodoItem[] {
  return items.map((item) => {
    if (item.id !== id) {
      return item;
    }

    return {
      ...item,
      completed: !item.completed,
      updatedAt: Date.now(),
    };
  });
}

export function deleteTodo(id: string, items: TodoItem[] = loadTodos()): TodoItem[] {
  return items.filter((item) => item.id !== id);
}

export function clearCompletedTodos(items: TodoItem[] = loadTodos()): TodoItem[] {
  return items.filter((item) => !item.completed);
}
