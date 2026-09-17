// ---------------------------------------------------------------------------
// Tests – organizer-agent-service
//
// Exercises the public handleAgentMessage API, which incorporates intent
// detection, date/time parsing, prefix stripping, and write-action dispatch.
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleAgentMessage } from './organizer-agent-service';
import type { AgentContext, AgentMessage, AgentWriteAction } from '@/types/agent';
import type {
  TasksWidget,
  NotesWidget,
  HabitsWidget,
  GoalsWidget,
  CalendarWidget,
  ShoppingWidget,
} from '@/types';

// ---------------------------------------------------------------------------
// Stub setTimeout so the mock "thinking" delay doesn't slow tests
// ---------------------------------------------------------------------------

vi.useFakeTimers();

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeHandlers() {
  return {
    onAddTask: vi.fn(),
    onAddNote: vi.fn(),
    onAddGoal: vi.fn(),
    onAddHabit: vi.fn(),
    onAddShoppingItem: vi.fn(),
    onAddCalendarEvent: vi.fn(),
  };
}

const TODAY = new Date('2025-06-11T10:00:00'); // Wednesday

function makeContext(
  widgets: AgentContext['widgets'] = [],
  today: Date = TODAY,
): AgentContext {
  return { widgets, handlers: makeHandlers(), currentDate: today };
}

async function send(
  message: string,
  context: AgentContext,
  history: AgentMessage[] = [],
  pending?: AgentWriteAction,
) {
  const promise = handleAgentMessage(message, history, context, pending);
  // Flush fake setTimeout used for the thinking delay
  await vi.runAllTimersAsync();
  return promise;
}

// ---------------------------------------------------------------------------
// Widget factories
// ---------------------------------------------------------------------------

function tasksWidget(tasks: TasksWidget['tasks'] = []): TasksWidget {
  return {
    id: 'tasks-1',
    type: 'tasks',
    title: 'Tasks',
    position: { x: 0, y: 0 },
    size: { width: 2, height: 2 },
    tasks,
    showCompleted: true,
    viewMode: 'all',
  };
}

function notesWidget(notes: NotesWidget['notes'] = []): NotesWidget {
  return {
    id: 'notes-1',
    type: 'notes',
    title: 'Notes',
    position: { x: 0, y: 0 },
    size: { width: 2, height: 2 },
    notes,
  };
}

function habitsWidget(habits: HabitsWidget['habits'] = []): HabitsWidget {
  return {
    id: 'habits-1',
    type: 'habits',
    title: 'Habits',
    position: { x: 0, y: 0 },
    size: { width: 2, height: 2 },
    habits,
  };
}

function goalsWidget(goals: GoalsWidget['goals'] = []): GoalsWidget {
  return {
    id: 'goals-1',
    type: 'goals',
    title: 'Goals',
    position: { x: 0, y: 0 },
    size: { width: 2, height: 2 },
    goals,
  };
}

function calendarWidget(events: CalendarWidget['events'] = []): CalendarWidget {
  return {
    id: 'cal-1',
    type: 'calendar',
    title: 'Calendar',
    position: { x: 0, y: 0 },
    size: { width: 2, height: 2 },
    events,
    currentMonth: 5,
    currentYear: 2025,
  };
}

function shoppingWidget(items: ShoppingWidget['items'] = []): ShoppingWidget {
  return {
    id: 'shop-1',
    type: 'shopping',
    title: 'Shopping',
    position: { x: 0, y: 0 },
    size: { width: 2, height: 2 },
    items,
    budget: undefined,
  };
}

// ---------------------------------------------------------------------------
// No-widget guard messages
// ---------------------------------------------------------------------------

describe('missing widget guard messages', () => {
  it('read-tasks: reports missing Tasks widget', async () => {
    const ctx = makeContext([]);
    const res = await send('show my tasks', ctx);
    expect(res.message).toMatch(/tasks widget/i);
  });

  it('read-notes: reports missing Notes widget', async () => {
    const ctx = makeContext([]);
    const res = await send('show my notes', ctx);
    expect(res.message).toMatch(/notes widget/i);
  });

  it('read-habits: reports missing Habits widget', async () => {
    const ctx = makeContext([]);
    const res = await send('show my habits', ctx);
    expect(res.message).toMatch(/habits widget/i);
  });

  it('read-goals: reports missing Goals widget', async () => {
    const ctx = makeContext([]);
    const res = await send('show my goals', ctx);
    expect(res.message).toMatch(/goals widget/i);
  });

  it('read-calendar: reports missing Calendar widget', async () => {
    const ctx = makeContext([]);
    const res = await send("what's on my calendar today?", ctx);
    expect(res.message).toMatch(/calendar widget/i);
  });

  it('read-shopping: reports missing Shopping widget', async () => {
    const ctx = makeContext([]);
    const res = await send('show my shopping list', ctx);
    expect(res.message).toMatch(/shopping widget/i);
  });

  it('create-task: reports missing Tasks widget', async () => {
    const ctx = makeContext([]);
    const res = await send('add a task to call John', ctx);
    expect(res.message).toMatch(/tasks widget/i);
  });

  it('create-note: reports missing Notes widget', async () => {
    const ctx = makeContext([]);
    const res = await send('create a note about the meeting', ctx);
    expect(res.message).toMatch(/notes widget/i);
  });

  it('create-goal: reports missing Goals widget', async () => {
    const ctx = makeContext([]);
    const res = await send('add a goal to run a 5k', ctx);
    expect(res.message).toMatch(/goals widget/i);
  });

  it('create-habit: reports missing Habits widget', async () => {
    const ctx = makeContext([]);
    const res = await send('track a new habit: morning walk', ctx);
    expect(res.message).toMatch(/habits widget/i);
  });

  it('add-shopping: reports missing Shopping widget', async () => {
    const ctx = makeContext([]);
    const res = await send('add milk to my shopping list', ctx);
    expect(res.message).toMatch(/shopping widget/i);
  });

  it('create-event: reports missing Calendar widget', async () => {
    const ctx = makeContext([]);
    const res = await send('schedule a meeting tomorrow at 2pm', ctx);
    expect(res.message).toMatch(/calendar widget/i);
  });
});

// ---------------------------------------------------------------------------
// READ intents
// ---------------------------------------------------------------------------

describe('read-tasks', () => {
  it('lists pending and completed tasks', async () => {
    const tasks: TasksWidget['tasks'] = [
      { id: '1', text: 'Buy groceries', completed: false, priority: 'medium' },
      { id: '2', text: 'Pay bills', completed: true, priority: 'low' },
    ];
    const ctx = makeContext([tasksWidget(tasks)]);
    const res = await send('show my tasks', ctx);
    expect(res.message).toMatch(/1 pending task/);
    expect(res.message).toMatch(/Buy groceries/);
    expect(res.message).toMatch(/1 completed task/);
  });

  it('reports no tasks when widget is empty', async () => {
    const ctx = makeContext([tasksWidget([])]);
    const res = await send('what tasks do I have', ctx);
    expect(res.message).toMatch(/no tasks found/i);
  });

  it('shows priority icon for high-priority task', async () => {
    const tasks: TasksWidget['tasks'] = [
      { id: '1', text: 'Critical thing', completed: false, priority: 'high' },
    ];
    const ctx = makeContext([tasksWidget(tasks)]);
    const res = await send('list my tasks', ctx);
    expect(res.message).toContain('🔴');
  });
});

describe('read-notes', () => {
  it('lists notes with title and preview', async () => {
    const notes: NotesWidget['notes'] = [
      { id: 'n1', title: 'Meeting Notes', content: 'Discuss Q3 goals', createdAt: Date.now(), updatedAt: Date.now() },
    ];
    const ctx = makeContext([notesWidget(notes)]);
    const res = await send('show my notes', ctx);
    expect(res.message).toMatch(/1 note:/);
    expect(res.message).toMatch(/Meeting Notes/);
  });
});

describe('read-habits', () => {
  it('lists all habits with their names', async () => {
    const habits: HabitsWidget['habits'] = [
      { id: 'h1', name: 'Meditate', completions: {}, streak: 1, longestStreak: 1 },
      { id: 'h2', name: 'Exercise', completions: {}, streak: 0, longestStreak: 0 },
    ];
    const ctx = makeContext([habitsWidget(habits)]);
    const res = await send('show my habits', ctx);
    expect(res.message).toMatch(/2 habits:/);
    expect(res.message).toContain('Meditate');
    expect(res.message).toContain('Exercise');
  });
});

describe('read-goals', () => {
  it('lists active goals', async () => {
    const goals: GoalsWidget['goals'] = [
      { id: 'g1', title: 'Run a 5K', description: '', completed: false, createdAt: Date.now() },
    ];
    const ctx = makeContext([goalsWidget(goals)]);
    const res = await send('what are my goals', ctx);
    expect(res.message).toMatch(/1 active goal/);
    expect(res.message).toMatch(/Run a 5K/);
  });
});

describe('read-calendar', () => {
  const eventMs = new Date('2025-06-11T14:00:00').getTime();

  it('returns today events when asked about today', async () => {
    const events: CalendarWidget['events'] = [
      {
        id: 'e1',
        title: 'Team standup',
        type: 'appointment',
        date: eventMs,
        startTime: '14:00',
        allDay: false,
        color: '#3B82F6',
      },
    ];
    const ctx = makeContext([calendarWidget(events)]);
    const res = await send("what's on my calendar today?", ctx);
    expect(res.message).toMatch(/Team standup/);
  });

  it('returns no events message for tomorrow when nothing is there', async () => {
    const ctx = makeContext([calendarWidget([])]);
    const res = await send("what's on my calendar tomorrow?", ctx);
    expect(res.message).toMatch(/no events/i);
  });
});

describe('read-shopping', () => {
  it('lists unpurchased items', async () => {
    const items: ShoppingWidget['items'] = [
      { id: 's1', name: 'Milk', purchased: false, priority: 'medium', category: 'dairy', addedAt: Date.now() },
      { id: 's2', name: 'Eggs', purchased: true, priority: 'medium', category: 'dairy', addedAt: Date.now() },
    ];
    const ctx = makeContext([shoppingWidget(items)]);
    const res = await send('show my shopping list', ctx);
    expect(res.message).toMatch(/1 item to buy/);
    expect(res.message).toMatch(/Milk/);
    expect(res.message).toMatch(/1 already purchased/);
  });
});

// ---------------------------------------------------------------------------
// CREATE intents
// ---------------------------------------------------------------------------

describe('create-task', () => {
  it('adds a plain task and confirms', async () => {
    const ctx = makeContext([tasksWidget()]);
    const res = await send('add a task to call John', ctx);
    expect(ctx.handlers.onAddTask).toHaveBeenCalledOnce();
    const [widgetId, data] = (ctx.handlers.onAddTask as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(widgetId).toBe('tasks-1');
    expect(data.text).toContain('call John');
    expect(res.message).toMatch(/✅/);
  });

  it('sets high priority for urgent task', async () => {
    const ctx = makeContext([tasksWidget()]);
    // The intent regex requires "task" keyword directly after optional article;
    // use explicit phrasing that includes "task" close to the verb.
    await send('create a task to finish the proposal, urgent', ctx);
    const [, data] = (ctx.handlers.onAddTask as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(data.priority).toBe('high');
  });

  it('sets dueDate to tomorrow when message says tomorrow', async () => {
    const ctx = makeContext([tasksWidget()]);
    await send('remind me to pay bills tomorrow', ctx);
    const [, data] = (ctx.handlers.onAddTask as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(data.dueDate).toBe('2025-06-12');
  });

  it('sets dueDate to today when message says today', async () => {
    const ctx = makeContext([tasksWidget()]);
    await send('add a task to file taxes today', ctx);
    const [, data] = (ctx.handlers.onAddTask as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(data.dueDate).toBe('2025-06-11');
  });

  it('sets dueDate to next week', async () => {
    const ctx = makeContext([tasksWidget()]);
    await send('add a task to call the dentist next week', ctx);
    const [, data] = (ctx.handlers.onAddTask as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(data.dueDate).toBe('2025-06-18');
  });

  it('uses remind-me-to prefix', async () => {
    const ctx = makeContext([tasksWidget()]);
    const res = await send('Remind me to send the invoice', ctx);
    expect(ctx.handlers.onAddTask).toHaveBeenCalled();
    expect(res.message).toMatch(/✅/);
  });
});

describe('create-note', () => {
  it('creates a note with colon separator for title and content', async () => {
    const ctx = makeContext([notesWidget()]);
    const res = await send('create a note: Meeting agenda — discuss Q3', ctx);
    expect(ctx.handlers.onAddNote).toHaveBeenCalledOnce();
    const [, note] = (ctx.handlers.onAddNote as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(note.title).toBe('Meeting agenda — discuss Q3');
    expect(res.message).toMatch(/✅/);
  });

  it('creates a note without explicit title', async () => {
    const ctx = makeContext([notesWidget()]);
    await send('write down remember to water the plants', ctx);
    expect(ctx.handlers.onAddNote).toHaveBeenCalled();
  });
});

describe('create-goal', () => {
  it('adds a goal from natural language', async () => {
    const ctx = makeContext([goalsWidget()]);
    const res = await send('set a goal to read 12 books this year', ctx);
    expect(ctx.handlers.onAddGoal).toHaveBeenCalledOnce();
    const [, goal] = (ctx.handlers.onAddGoal as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(goal.title).toContain('read 12 books');
    expect(res.message).toMatch(/✅/);
  });
});

describe('create-habit', () => {
  it('adds a habit', async () => {
    const ctx = makeContext([habitsWidget()]);
    // The intent regex is: (add|create|track|start)\s+(an?\s+)?habit
    // "track a habit" matches; "track a new habit" does not (extra word before habit)
    const res = await send('track a habit: daily reading', ctx);
    expect(ctx.handlers.onAddHabit).toHaveBeenCalledOnce();
    const [, habit] = (ctx.handlers.onAddHabit as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(habit.name).toBe('daily reading');
    expect(res.message).toMatch(/✅/);
  });

  it('adds a habit with "add habit" phrasing', async () => {
    const ctx = makeContext([habitsWidget()]);
    await send('add a habit of morning stretch', ctx);
    const [, habit] = (ctx.handlers.onAddHabit as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(habit.name).toBe('morning stretch');
  });
});

describe('add-shopping', () => {
  it('adds an item to the shopping list', async () => {
    const ctx = makeContext([shoppingWidget()]);
    const res = await send('add milk to my shopping list', ctx);
    expect(ctx.handlers.onAddShoppingItem).toHaveBeenCalledOnce();
    const [, item] = (ctx.handlers.onAddShoppingItem as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(item.name).toBe('milk');
    expect(res.message).toMatch(/✅/);
  });

  it('parses quantity from the shopping command', async () => {
    const ctx = makeContext([shoppingWidget()]);
    await send('add 2 kg apples to my shopping list', ctx);
    const [, item] = (ctx.handlers.onAddShoppingItem as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(item.name).toBe('apples');
    expect(item.quantity).toMatch(/2\s*kg/i);
  });

  it('prevents duplicate unpurchased items', async () => {
    const existing: ShoppingWidget['items'] = [
      { id: 's1', name: 'Milk', purchased: false, priority: 'medium', category: 'dairy', addedAt: Date.now() },
    ];
    const ctx = makeContext([shoppingWidget(existing)]);
    const res = await send('add Milk to my shopping list', ctx);
    expect(ctx.handlers.onAddShoppingItem).not.toHaveBeenCalled();
    expect(res.message).toMatch(/already on your shopping list/i);
  });

  it('accepts "I need to buy" phrasing', async () => {
    const ctx = makeContext([shoppingWidget()]);
    await send('I need to buy bread', ctx);
    expect(ctx.handlers.onAddShoppingItem).toHaveBeenCalled();
    const [, item] = (ctx.handlers.onAddShoppingItem as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(item.name).toBe('bread');
  });
});

describe('create-event', () => {
  it('adds a calendar event with date and time', async () => {
    const ctx = makeContext([calendarWidget()]);
    const res = await send('schedule a meeting tomorrow at 3pm', ctx);
    expect(ctx.handlers.onAddCalendarEvent).toHaveBeenCalledOnce();
    const [, event] = (ctx.handlers.onAddCalendarEvent as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(event.startTime).toBe('15:00');
    expect(event.date).toBe(new Date('2025-06-12').getTime());
    expect(res.message).toMatch(/✅/);
  });

  it('asks for a date when none is provided', async () => {
    const ctx = makeContext([calendarWidget()]);
    // "schedule an appointment" directly matches the intent regex (no extra word before appointment)
    const res = await send('schedule an appointment with the doctor', ctx);
    expect(ctx.handlers.onAddCalendarEvent).not.toHaveBeenCalled();
    expect(res.message).toMatch(/what date/i);
  });

  it('handles 24-hour time format', async () => {
    const ctx = makeContext([calendarWidget()]);
    await send('add a meeting today at 14:30', ctx);
    const [, event] = (ctx.handlers.onAddCalendarEvent as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(event.startTime).toBe('14:30');
  });

  it('schedules all-day event when no time provided', async () => {
    const ctx = makeContext([calendarWidget()]);
    // "schedule a meeting" matches the event intent; no time → allDay
    await send('schedule a meeting tomorrow', ctx);
    const [, event] = (ctx.handlers.onAddCalendarEvent as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(event.allDay).toBe(true);
    expect(event.startTime).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Pending-action confirmation / denial
// ---------------------------------------------------------------------------

describe('pending action flow', () => {
  function makePendingAction(): AgentWriteAction {
    return {
      type: 'create-task',
      widgetId: 'tasks-1',
      data: { text: 'Write report', priority: 'high' },
      description: 'Created task: Write report',
    };
  }

  it('executes the action on confirmation', async () => {
    const ctx = makeContext([tasksWidget()]);
    const pending = makePendingAction();
    const res = await send('yes', ctx, [], pending);
    expect(ctx.handlers.onAddTask).toHaveBeenCalledOnce();
    expect(res.message).toMatch(/✅ Done!/);
  });

  it('cancels on denial', async () => {
    const ctx = makeContext([tasksWidget()]);
    const pending = makePendingAction();
    const res = await send('no', ctx, [], pending);
    expect(ctx.handlers.onAddTask).not.toHaveBeenCalled();
    expect(res.message).toMatch(/cancelled/i);
  });

  it('accepts various confirmation words', async () => {
    for (const word of ['yeah', 'ok', 'sure', 'confirm', 'go ahead']) {
      const ctx = makeContext([tasksWidget()]);
      await send(word, ctx, [], makePendingAction());
      expect(ctx.handlers.onAddTask).toHaveBeenCalledOnce();
    }
  });

  it('treats unrelated message as new intent ignoring pending action', async () => {
    const ctx = makeContext([tasksWidget()]);
    const res = await send('show my tasks', ctx, [], makePendingAction());
    // The pending action is ignored; falls through to read-tasks
    expect(ctx.handlers.onAddTask).not.toHaveBeenCalled();
    expect(res.message).toMatch(/no tasks found/i);
  });
});

// ---------------------------------------------------------------------------
// Daily overview
// ---------------------------------------------------------------------------

describe('read-overview', () => {
  it('returns summary header with today date', async () => {
    const ctx = makeContext([]);
    const res = await send('give me an overview of today', ctx);
    expect(res.message).toMatch(/Wednesday, June 11/);
  });

  it('includes pending tasks and high priority items', async () => {
    const tasks: TasksWidget['tasks'] = [
      { id: '1', text: 'Urgent thing', completed: false, priority: 'high' },
      { id: '2', text: 'Normal thing', completed: false, priority: 'medium' },
    ];
    const ctx = makeContext([tasksWidget(tasks)]);
    const res = await send('give me my priorities for today', ctx);
    expect(res.message).toMatch(/2 pending/);
    expect(res.message).toMatch(/1 high-priority/);
    expect(res.message).toContain('Urgent thing');
  });

  it('responds to bare "today" message as overview', async () => {
    const ctx = makeContext([]);
    const res = await send('today', ctx);
    expect(res.message).toMatch(/overview/i);
  });
});

// ---------------------------------------------------------------------------
// Help and unknown intents
// ---------------------------------------------------------------------------

describe('help and unknown', () => {
  it('returns help text when asked', async () => {
    const ctx = makeContext([]);
    const res = await send('help', ctx);
    expect(res.message).toMatch(/show me my tasks/i);
  });

  it('falls back gracefully on unknown intent', async () => {
    const ctx = makeContext([]);
    const res = await send('what is the meaning of life', ctx);
    expect(res.message).toMatch(/not sure/i);
  });
});
