import {
  buildResourceFingerprint,
  confirmPendingAction,
  createPendingActionFromToolCall,
  executeOrganizerAgentTool,
  getOrganizerAgentToolSchema,
} from './organizer-agent-broker';
import type { AgentContext, AgentPermission } from '@/types/agent';
import type { Widget } from '@/types';

function createContext(
  initialWidgets: Widget[],
  permissions: AgentPermission[] = [
    'read:tasks',
    'write:tasks',
    'read:notes',
    'write:notes',
    'read:record-notes',
    'write:record-notes',
    'read:calendar',
    'write:calendar',
    'read:shopping',
    'write:shopping',
    'read:work',
    'publish:work_to_calendar',
  ],
) {
  let widgets = initialWidgets;
  const context: AgentContext = {
    get widgets() {
      return widgets;
    },
    updateWidgets(updater) {
      widgets = updater(widgets);
    },
    currentDate: new Date('2026-09-17T12:00:00.000Z'),
    actorContext: {
      userId: 'test-user',
      workspaceId: 'test-workspace',
      permissions,
    },
  };

  return {
    context,
    getWidgets: () => widgets,
  };
}

describe('organizer agent broker', () => {
  it('defines confirmation and permission metadata for core tools', () => {
    expect(getOrganizerAgentToolSchema('tasks.create')).toMatchObject({
      confirmationLevel: 'c1',
      permissions: ['write:tasks'],
      v1Available: true,
    });
    expect(getOrganizerAgentToolSchema('calendar.create_event')).toMatchObject({
      confirmationLevel: 'c2',
      permissions: ['write:calendar'],
      v1Available: true,
    });
    expect(getOrganizerAgentToolSchema('record_notes.export_media')).toMatchObject({
      confirmationLevel: 'c3',
      permissions: ['export:record_note_media'],
      v1Available: false,
    });
  });

  it('requires confirmation before creating a task and applies it on confirm', () => {
    const { context, getWidgets } = createContext([
      { id: 'tasks-1', type: 'tasks', position: 0, tasks: [] },
    ]);

    const dryRun = executeOrganizerAgentTool('tasks.create', {
      requestId: 'req-1',
      workspaceId: context.actorContext.workspaceId,
      actorContext: context.actorContext,
      dryRun: true,
      widgetId: 'tasks-1',
      text: 'Pay rent',
      priority: 'high',
    }, context);

    expect(dryRun.ok).toBe(true);
    expect(dryRun.requiresConfirmation).toBe(true);

    const pendingAction = createPendingActionFromToolCall(
      'tasks.create',
      { widgetId: 'tasks-1', text: 'Pay rent', priority: 'high' },
      dryRun,
      buildResourceFingerprint('tasks.create', { widgetId: 'tasks-1', text: 'Pay rent', priority: 'high' }, context.widgets),
    );

    expect(pendingAction).toBeDefined();

    const confirmed = confirmPendingAction(pendingAction!, context);

    expect(confirmed.response.ok).toBe(true);
    expect(confirmed.activity.status).toBe('completed');
    expect(getWidgets()[0]).toMatchObject({
      type: 'tasks',
      tasks: [
        expect.objectContaining({
          text: 'Pay rent',
          priority: 'high',
          completed: false,
        }),
      ],
    });
  });

  it('blocks tools when permissions are missing', () => {
    const { context } = createContext(
      [{ id: 'tasks-1', type: 'tasks', position: 0, tasks: [] }],
      ['read:tasks'],
    );

    const response = executeOrganizerAgentTool('tasks.create', {
      requestId: 'req-2',
      workspaceId: context.actorContext.workspaceId,
      actorContext: context.actorContext,
      widgetId: 'tasks-1',
      text: 'Should fail',
    }, context);

    expect(response.ok).toBe(false);
    expect(response.summary).toContain('Permission denied');
  });

  it('requires explicit boolean fields for status mutations', () => {
    const { context } = createContext([
      {
        id: 'tasks-1',
        type: 'tasks',
        position: 0,
        tasks: [{ id: 'task-1', text: 'Pay rent', completed: false, createdAt: 1 }],
      },
    ], ['read:tasks', 'write:tasks']);

    const response = executeOrganizerAgentTool('tasks.set_status', {
      requestId: 'req-2b',
      workspaceId: context.actorContext.workspaceId,
      actorContext: context.actorContext,
      taskId: 'task-1',
    }, context);

    expect(response.ok).toBe(false);
    expect(response.summary).toContain('completed must be true or false');
  });

  it('returns metadata-only record note responses', () => {
    const { context } = createContext([
      {
        id: 'record-1',
        type: 'record-note',
        position: 0,
        records: [
          {
            id: 'voice-1',
            title: 'Voice memo',
            mediaType: 'voice',
            dataUrl: 'data:audio/webm;base64,secret',
            transcription: 'Buy milk',
            createdAt: 1,
          },
        ],
      },
    ]);

    const response = executeOrganizerAgentTool('record_notes.list', {
      requestId: 'req-3',
      workspaceId: context.actorContext.workspaceId,
      actorContext: context.actorContext,
    }, context);

    expect(response.ok).toBe(true);
    expect(response.warnings[0]).toContain('Raw media');
    expect(JSON.stringify(response.data)).not.toContain('data:audio');
  });

  it('deduplicates work to calendar publishes by source reference', () => {
    const { context, getWidgets } = createContext([
      {
        id: 'work-1',
        type: 'work',
        position: 0,
        clientSlots: [],
        meals: [],
        timeEntries: [],
        jobs: [],
        shoppingList: [],
        errands: [],
        routines: [],
      },
      {
        id: 'calendar-1',
        type: 'calendar',
        position: 1,
        events: [],
      },
    ]);

    const input = {
      requestId: 'req-4',
      workspaceId: context.actorContext.workspaceId,
      actorContext: context.actorContext,
      workWidgetId: 'work-1',
      calendarWidgetId: 'calendar-1',
      event: {
        title: 'Client visit',
        type: 'appointment',
        date: new Date('2026-09-18').getTime(),
        startTime: '09:00',
        sourceType: 'work' as const,
        sourceId: 'slot-1',
      },
    };

    const first = executeOrganizerAgentTool('work.publish_to_calendar', { ...input, dryRun: false }, context);
    const second = executeOrganizerAgentTool('work.publish_to_calendar', { ...input, dryRun: false }, context);

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(false);
    expect(getWidgets()[1]).toMatchObject({
      type: 'calendar',
      events: [expect.objectContaining({ sourceType: 'work', sourceId: 'slot-1' })],
    });
  });
});
