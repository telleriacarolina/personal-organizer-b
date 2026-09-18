import { describe, expect, it, vi } from 'vitest';
import { getOrganizerAgentToolSchemas } from './organizer-agent-broker';
import { handleAgentMessage } from './organizer-agent-service';
import type { AgentContext, AgentMessage, AgentPendingAction, OrganizerToolName } from '@/types/agent';
import type {
  CalendarWidget,
  GoalsWidget,
  HabitsWidget,
  NotesWidget,
  ShoppingWidget,
  TasksWidget,
  Widget,
} from '@/types';

vi.useFakeTimers();

const TODAY = new Date('2025-06-11T10:00:00');
const ALL_PERMISSIONS = Array.from(new Set(getOrganizerAgentToolSchemas().flatMap((schema) => schema.permissions)));

type TestContext = AgentContext & {
  updateWidgets: ReturnType<typeof vi.fn>;
  getWidgets: () => Widget[];
};

function makeContext(widgets: Widget[] = [], currentDate: Date = TODAY): TestContext {
  let currentWidgets = widgets;
  let context!: TestContext;
  const updateWidgets = vi.fn((updater: (widgets: Widget[]) => Widget[]) => {
    currentWidgets = updater(currentWidgets);
    context.widgets = currentWidgets;
  });

  context = {
    widgets: currentWidgets,
    updateWidgets,
    currentDate,
    actorContext: {
      userId: 'test-user',
      workspaceId: 'test-workspace',
      permissions: ALL_PERMISSIONS,
    },
    getWidgets: () => currentWidgets,
  };

  return context;
}

async function send(
  message: string,
  context: AgentContext,
  history: AgentMessage[] = [],
  pendingAction?: AgentPendingAction,
) {
  const promise = handleAgentMessage(message, history, context, pendingAction);
  await vi.runAllTimersAsync();
  return promise;
}

function expectPendingAction(
  pendingAction: AgentPendingAction | undefined,
  toolName: OrganizerToolName,
) {
  expect(pendingAction).toBeDefined();
  expect(pendingAction?.toolName).toBe(toolName);
  return pendingAction as AgentPendingAction<Record<string, unknown>>;
}

function tasksWidget(tasks: TasksWidget['tasks'] = []): TasksWidget {
  return { id: 'tasks-1', type: 'tasks', position: 0, tasks };
}

function notesWidget(notes: NotesWidget['notes'] = []): NotesWidget {
  return { id: 'notes-1', type: 'notes', position: 0, notes };
}

function habitsWidget(habits: HabitsWidget['habits'] = []): HabitsWidget {
  return { id: 'habits-1', type: 'habits', position: 0, habits };
}

function goalsWidget(goals: GoalsWidget['goals'] = []): GoalsWidget {
  return { id: 'goals-1', type: 'goals', position: 0, goals };
}

function calendarWidget(events: CalendarWidget['events'] = []): CalendarWidget {
  return { id: 'calendar-1', type: 'calendar', position: 0, events };
}

function shoppingWidget(items: ShoppingWidget['items'] = []): ShoppingWidget {
  return { id: 'shopping-1', type: 'shopping', position: 0, items, receipts: [], trips: [], reminders: [] };
}

describe('missing widget guards', () => {
  it('reports when the requested widget does not exist', async () => {
    const res = await send('show my tasks', makeContext());
    expect(res.message).toMatch(/no tasks found/i);
  });
});

describe('read intents', () => {
  it('lists pending and completed tasks', async () => {
    const ctx = makeContext([
      tasksWidget([
        { id: '1', text: 'Buy groceries', completed: false, priority: 'medium', createdAt: Date.now() },
        { id: '2', text: 'Pay bills', completed: true, priority: 'low', createdAt: Date.now() },
      ]),
    ]);

    const res = await send('show my tasks', ctx);

    expect(res.message).toMatch(/1 pending task/i);
    expect(res.message).toMatch(/1 completed task/i);
    expect(res.message).toContain('Buy groceries');
  });

  it('lists shopping items and purchased count', async () => {
    const ctx = makeContext([
      shoppingWidget([
        { id: '1', name: 'Milk', purchased: false, priority: 'medium', category: 'dairy', createdAt: Date.now() },
        { id: '2', name: 'Eggs', purchased: true, priority: 'medium', category: 'dairy', createdAt: Date.now() },
      ]),
    ]);

    const res = await send('show my shopping list', ctx);

    expect(res.message).toMatch(/1 item to buy/i);
    expect(res.message).toMatch(/1 already purchased/i);
  });

  it('shows today calendar events', async () => {
    const ctx = makeContext([
      calendarWidget([
        {
          id: '1',
          title: 'Team standup',
          type: 'appointment',
          date: new Date('2025-06-11T14:00:00').getTime(),
          startTime: '14:00',
          allDay: false,
          createdAt: Date.now(),
        },
      ]),
    ]);

    const res = await send("what's on my calendar today?", ctx);

    expect(res.message).toContain('Team standup');
  });
});

describe('write intents', () => {
  it('creates a pending task proposal with parsed priority and due date', async () => {
    const res = await send('create a task to finish the proposal tomorrow, urgent', makeContext([tasksWidget()]));
    const pending = expectPendingAction(res.pendingAction, 'tasks.create');

    expect(pending.input.widgetId).toBe('tasks-1');
    expect(pending.input.text).toBe('finish the proposal tomorrow, urgent');
    expect(pending.input.priority).toBe('high');
    expect(pending.input.dueDate).toBe('2025-06-12');
  });

  it('creates a pending note proposal', async () => {
    const res = await send('create a note: Meeting agenda — discuss Q3', makeContext([notesWidget()]));
    const pending = expectPendingAction(res.pendingAction, 'notes.create');

    expect(pending.input.title).toBe('Meeting agenda — discuss Q3');
    expect(pending.input.content).toBe('Meeting agenda — discuss Q3');
  });

  it('creates a pending habit proposal', async () => {
    const res = await send('track a habit: daily reading', makeContext([habitsWidget()]));
    const pending = expectPendingAction(res.pendingAction, 'habits.create');

    expect(pending.input.name).toBe('daily reading');
  });

  it('blocks duplicate shopping items during proposal generation', async () => {
    const res = await send(
      'add Milk to my shopping list',
      makeContext([
        shoppingWidget([
          { id: '1', name: 'Milk', purchased: false, priority: 'medium', category: 'dairy', createdAt: Date.now() },
        ]),
      ]),
    );

    expect(res.pendingAction).toBeUndefined();
    expect(res.message).toMatch(/already on the shopping list/i);
  });

  it('creates a pending calendar event proposal with parsed time', async () => {
    const res = await send('schedule a meeting tomorrow at 3pm', makeContext([calendarWidget()]));
    const pending = expectPendingAction(res.pendingAction, 'calendar.create_event');

    expect(pending.input.title).toBe('meeting');
    expect(pending.input.date).toBe(new Date('2025-06-12').getTime());
    expect(pending.input.startTime).toBe('15:00');
    expect(pending.input.allDay).toBe(false);
  });
});

describe('pending action flow', () => {
  it('confirms a pending task proposal and mutates widget state', async () => {
    const ctx = makeContext([tasksWidget()]);
    const proposal = await send('add a task to write report', ctx);
    const pending = expectPendingAction(proposal.pendingAction, 'tasks.create');

    const res = await send('yes', ctx, [], pending);

    expect(ctx.updateWidgets).toHaveBeenCalledOnce();
    expect((ctx.getWidgets()[0] as TasksWidget).tasks).toHaveLength(1);
    expect((ctx.getWidgets()[0] as TasksWidget).tasks[0]?.text).toBe('write report');
    expect(res.message).toMatch(/✅ Added task "write report"/);
  });

  it('cancels a pending action on denial', async () => {
    const ctx = makeContext([tasksWidget()]);
    const proposal = await send('add a task to write report', ctx);
    const pending = expectPendingAction(proposal.pendingAction, 'tasks.create');

    const res = await send('no', ctx, [], pending);

    expect(ctx.updateWidgets).not.toHaveBeenCalled();
    expect(res.message).toMatch(/cancelled/i);
  });
});

describe('overview and fallback', () => {
  it('returns an overview for today', async () => {
    const res = await send('today', makeContext([tasksWidget()]));
    expect(res.message).toMatch(/overview/i);
    expect(res.message).toMatch(/Wednesday, June 11/i);
  });

  it('returns help text for unknown requests', async () => {
    const res = await send('what is the meaning of life', makeContext());
    expect(res.message).toMatch(/not sure/i);
    expect(res.message).toMatch(/show my tasks/i);
  });
});
