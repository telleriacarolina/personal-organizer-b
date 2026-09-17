import type { CalendarImportDraft } from '@/lib/calendar-imports';
import { appendImportedCalendarEvent } from '@/lib/calendar-imports';
import type { Dispatch, SetStateAction } from 'react';
import type {
  CalendarEvent,
  Goal,
  Habit,
  Note,
  Task,
  Widget,
  WidgetAIState,
  WidgetSize,
  WidgetType,
  WorkOrganizationPreference,
} from '@/types';
import type {
  AgentCalendarEventData,
  AgentGoalData,
  AgentHabitData,
  AgentNoteData,
  AgentShoppingItemData,
  AgentTaskData,
  AgentHandlers,
} from '@/types/agent';

type WidgetUpdate = Partial<Widget>;

function createId() {
  return Date.now().toString();
}

export function createWidget(type: WidgetType, position: number, widgets: Widget[]): Widget {
  return {
    id: createId(),
    type,
    position,
    ...(type === 'tasks' && { tasks: [] }),
    ...(type === 'daily-focus' && { sourceWidgetId: widgets.find((widget) => widget.type === 'tasks')?.id ?? null }),
    ...(type === 'notes' && { notes: [] }),
    ...(type === 'habits' && { habits: [] }),
    ...(type === 'goals' && { goals: [] }),
    ...(type === 'calendar' && { events: [] }),
    ...(type === 'shopping' && { items: [], receipts: [], trips: [], reminders: [] }),
    ...(type === 'ai-chat' && { messages: [], appliedSuggestionIds: [] }),
    ...(type === 'record-note' && { records: [] }),
  } as Widget;
}

export function createWorkWidget(preference: WorkOrganizationPreference, position: number): Widget {
  return {
    id: createId(),
    type: 'work',
    position,
    clientSlots: [],
    meals: [],
    timeEntries: [],
    jobs: [],
    shoppingList: [],
    errands: [],
    routines: [],
    activeRoutineId: undefined,
    organizationPreference: preference,
  } as Widget;
}

export function updateWidget(widgets: Widget[], id: string, data: WidgetUpdate): Widget[] {
  return widgets.map((widget) => (widget.id === id ? { ...widget, ...data } as Widget : widget));
}

export function removeWidget(widgets: Widget[], id: string): Widget[] {
  return widgets.filter((widget) => widget.id !== id);
}

export function updateWidgetSize(widgets: Widget[], id: string, size: WidgetSize): Widget[] {
  return updateWidget(widgets, id, { size });
}

export function reorderWidgets(widgets: Widget[]): Widget[] {
  return widgets.map((widget, position) => ({ ...widget, position }));
}

export function updateTasksWidget(
  widgets: Widget[],
  sourceWidgetId: string,
  updater: (tasks: Task[]) => Task[],
): Widget[] {
  return widgets.map((widget) =>
    widget.id === sourceWidgetId && widget.type === 'tasks'
      ? ({ ...widget, tasks: updater(widget.tasks) } as Widget)
      : widget,
  );
}

export function addTaskToSource(
  widgets: Widget[],
  sourceWidgetId: string,
  task: Pick<Task, 'text' | 'priority' | 'dueDate' | 'category'>,
): Widget[] {
  return updateTasksWidget(widgets, sourceWidgetId, (tasks) => [
    ...tasks,
    {
      id: createId(),
      text: task.text,
      completed: false,
      priority: task.priority,
      dueDate: task.dueDate ?? null,
      category: task.category ?? null,
      createdAt: Date.now(),
    },
  ]);
}

export function toggleTaskInSource(widgets: Widget[], sourceWidgetId: string, taskId: string): Widget[] {
  return updateTasksWidget(widgets, sourceWidgetId, (tasks) =>
    tasks.map((task) => (task.id === taskId ? { ...task, completed: !task.completed } : task)),
  );
}

export function updateTaskPriorityInSource(
  widgets: Widget[],
  sourceWidgetId: string,
  taskId: string,
  priority: 'low' | 'medium' | 'high',
): Widget[] {
  return updateTasksWidget(widgets, sourceWidgetId, (tasks) =>
    tasks.map((task) => (task.id === taskId ? { ...task, priority } : task)),
  );
}

export function addCalendarImport(
  widgets: Widget[],
  destinationWidgetId: string,
  event: CalendarImportDraft,
): { widgets: Widget[]; result: { added: boolean; reason?: 'invalid-destination' | 'duplicate' } } {
  const destinationWidget = widgets.find(
    (widget): widget is Extract<Widget, { type: 'calendar' }> =>
      widget.id === destinationWidgetId && widget.type === 'calendar',
  );
  if (!destinationWidget) {
    return { widgets, result: { added: false, reason: 'invalid-destination' } };
  }

  const importResult = appendImportedCalendarEvent(destinationWidget.events, event);
  if (!importResult.added) {
    return { widgets, result: { added: false, reason: 'duplicate' } };
  }

  return {
    widgets: updateWidget(widgets, destinationWidgetId, { events: importResult.events }),
    result: { added: true },
  };
}

export function updateDailyFocusSourceWidget(
  widgets: Widget[],
  widgetId: string,
  sourceWidgetId: string | null,
): Widget[] {
  return updateWidget(widgets, widgetId, { sourceWidgetId });
}

export function saveWidgetAIState(
  states: Record<string, WidgetAIState>,
  state: WidgetAIState,
): Record<string, WidgetAIState> {
  return {
    ...states,
    [state.widgetId]: state,
  };
}

export function clearWidgetAIState(
  states: Record<string, WidgetAIState>,
  widgetId: string,
): Record<string, WidgetAIState> {
  const next = { ...states };
  delete next[widgetId];
  return next;
}

export function addTaskToTasks(tasks: Task[], text: string, priority: 'low' | 'medium' | 'high'): Task[] {
  if (!text.trim()) {
    return tasks;
  }

  return [
    ...tasks,
    {
      id: createId(),
      text,
      completed: false,
      priority,
      createdAt: Date.now(),
    },
  ];
}

export function toggleTask(tasks: Task[], id: string): Task[] {
  return tasks.map((task) => (task.id === id ? { ...task, completed: !task.completed } : task));
}

export function deleteTask(tasks: Task[], id: string): Task[] {
  return tasks.filter((task) => task.id !== id);
}

export function addNote(notes: Note[], title: string, content: string): Note[] {
  if (!title.trim() && !content.trim()) {
    return notes;
  }

  return [
    ...notes,
    {
      id: createId(),
      title: title || 'Untitled Note',
      content,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ];
}

export function updateNote(notes: Note[], id: string, title: string, content: string): Note[] {
  return notes.map((note) =>
    note.id === id
      ? { ...note, title, content, updatedAt: Date.now() }
      : note,
  );
}

export function deleteNote(notes: Note[], id: string): Note[] {
  return notes.filter((note) => note.id !== id);
}

export function addHabit(habits: Habit[], name: string): Habit[] {
  if (!name.trim()) {
    return habits;
  }

  return [
    ...habits,
    {
      id: createId(),
      name,
      completions: {},
      createdAt: Date.now(),
    },
  ];
}

export function toggleHabitCompletion(habits: Habit[], id: string, dateKey: string): Habit[] {
  return habits.map((habit) => {
    if (habit.id !== id) {
      return habit;
    }

    return {
      ...habit,
      completions: {
        ...habit.completions,
        [dateKey]: !habit.completions[dateKey],
      },
    };
  });
}

export function deleteHabit(habits: Habit[], id: string): Habit[] {
  return habits.filter((habit) => habit.id !== id);
}

export function addGoal(goals: Goal[], title: string, description: string): Goal[] {
  if (!title.trim()) {
    return goals;
  }

  return [
    ...goals,
    {
      id: createId(),
      title,
      description,
      completed: false,
      createdAt: Date.now(),
    },
  ];
}

export function toggleGoal(goals: Goal[], id: string): Goal[] {
  return goals.map((goal) => (goal.id === id ? { ...goal, completed: !goal.completed } : goal));
}

export function deleteGoal(goals: Goal[], id: string): Goal[] {
  return goals.filter((goal) => goal.id !== id);
}

export function saveCalendarEvent(
  events: CalendarEvent[],
  event: Omit<CalendarEvent, 'id' | 'createdAt'>,
  existing?: CalendarEvent | null,
): CalendarEvent[] {
  const nextEvent: CalendarEvent = {
    id: existing?.id || createId(),
    createdAt: existing?.createdAt || Date.now(),
    ...event,
  };

  return existing
    ? events.map((entry) => (entry.id === existing.id ? nextEvent : entry))
    : [...events, nextEvent];
}

export function deleteCalendarEvent(events: CalendarEvent[], id: string): CalendarEvent[] {
  return events.filter((event) => event.id !== id);
}

export function createAgentHandlers(setWidgets: Dispatch<SetStateAction<Widget[]>>): AgentHandlers {
  return {
    onAddTask: (widgetId, taskData) => {
      setWidgets((current) => addAgentTask(current, widgetId, taskData));
    },
    onAddNote: (widgetId, noteData) => {
      setWidgets((current) => addAgentNote(current, widgetId, noteData));
    },
    onAddGoal: (widgetId, goalData) => {
      setWidgets((current) => addAgentGoal(current, widgetId, goalData));
    },
    onAddHabit: (widgetId, habitData) => {
      setWidgets((current) => addAgentHabit(current, widgetId, habitData));
    },
    onAddShoppingItem: (widgetId, itemData) => {
      setWidgets((current) => addAgentShoppingItem(current, widgetId, itemData));
    },
    onAddCalendarEvent: (widgetId, eventData) => {
      setWidgets((current) => addAgentCalendarEvent(current, widgetId, eventData));
    },
  };
}

function addAgentTask(widgets: Widget[], widgetId: string, taskData: AgentTaskData): Widget[] {
  return widgets.map((widget) =>
    widget.id === widgetId && widget.type === 'tasks'
      ? ({
          ...widget,
          tasks: [
            ...widget.tasks,
            {
              id: createId(),
              text: taskData.text,
              completed: false,
              priority: taskData.priority ?? 'medium',
              dueDate: taskData.dueDate ?? null,
              category: taskData.category ?? null,
              createdAt: Date.now(),
            },
          ],
        } as Widget)
      : widget,
  );
}

function addAgentNote(widgets: Widget[], widgetId: string, noteData: AgentNoteData): Widget[] {
  return widgets.map((widget) =>
    widget.id === widgetId && widget.type === 'notes'
      ? ({
          ...widget,
          notes: [
            ...widget.notes,
            {
              id: createId(),
              title: noteData.title,
              content: noteData.content,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
          ],
        } as Widget)
      : widget,
  );
}

function addAgentGoal(widgets: Widget[], widgetId: string, goalData: AgentGoalData): Widget[] {
  return widgets.map((widget) =>
    widget.id === widgetId && widget.type === 'goals'
      ? ({
          ...widget,
          goals: [
            ...widget.goals,
            {
              id: createId(),
              title: goalData.title,
              description: goalData.description,
              targetDate: goalData.targetDate,
              completed: false,
              createdAt: Date.now(),
            },
          ],
        } as Widget)
      : widget,
  );
}

function addAgentHabit(widgets: Widget[], widgetId: string, habitData: AgentHabitData): Widget[] {
  return widgets.map((widget) =>
    widget.id === widgetId && widget.type === 'habits'
      ? ({
          ...widget,
          habits: [
            ...widget.habits,
            {
              id: createId(),
              name: habitData.name,
              completions: {},
              createdAt: Date.now(),
            },
          ],
        } as Widget)
      : widget,
  );
}

function addAgentShoppingItem(
  widgets: Widget[],
  widgetId: string,
  itemData: AgentShoppingItemData,
): Widget[] {
  return widgets.map((widget) =>
    widget.id === widgetId && widget.type === 'shopping'
      ? ({
          ...widget,
          items: [
            ...widget.items,
            {
              id: createId(),
              name: itemData.name,
              quantity: itemData.quantity,
              category: itemData.category ?? 'other',
              store: undefined,
              estimatedPrice: undefined,
              actualPrice: undefined,
              purchased: false,
              priority: itemData.priority ?? 'medium',
              notes: undefined,
              barcode: undefined,
              receiptId: undefined,
              createdAt: Date.now(),
            },
          ],
        } as Widget)
      : widget,
  );
}

function addAgentCalendarEvent(
  widgets: Widget[],
  widgetId: string,
  eventData: AgentCalendarEventData,
): Widget[] {
  return widgets.map((widget) =>
    widget.id === widgetId && widget.type === 'calendar'
      ? ({
          ...widget,
          events: [
            ...widget.events,
            {
              id: createId(),
              title: eventData.title,
              type: eventData.type,
              description: eventData.description,
              date: eventData.date,
              startTime: eventData.startTime,
              endTime: eventData.endTime,
              allDay: eventData.allDay ?? false,
              location: eventData.location,
              createdAt: Date.now(),
            },
          ],
        } as Widget)
      : widget,
  );
}
