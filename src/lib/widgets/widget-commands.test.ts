import { describe, expect, it } from 'vitest';
import type { Widget } from '@/types';
import { executeWidgetCommand } from './widget-commands';
import { widgetDefinitions } from './widget-registry';

describe('widgetDefinitions', () => {
  it('creates a default widget per type', () => {
    const types = Object.keys(widgetDefinitions) as Array<keyof typeof widgetDefinitions>;
    types.forEach((type, index) => {
      const widget = widgetDefinitions[type].defaultState({ id: `w-${index}`, position: index });
      expect(widget.type).toBe(type);
      expect(widget.position).toBe(index);
      expect(widget.id).toBe(`w-${index}`);
    });
  });

  it('validates calendar all-day invariant', () => {
    const calendarWidget = widgetDefinitions.calendar.defaultState({ id: 'cal-1', position: 0 });
    const invalid = {
      ...calendarWidget,
      events: [
        {
          id: 'ev-1',
          title: 'All day with times',
          type: 'event' as const,
          date: Date.now(),
          startTime: '09:00',
          endTime: '10:00',
          allDay: true,
          createdAt: Date.now(),
        },
      ],
    };

    const issues = widgetDefinitions.calendar.validate(invalid);
    expect(issues.length).toBeGreaterThan(0);
  });

  it('validates nested shopping receipt/trip/reminder data', () => {
    const shoppingWidget = widgetDefinitions.shopping.defaultState({ id: 'shop-1', position: 0 });
    const invalid = {
      ...shoppingWidget,
      receipts: [{ id: 'r-1', storeName: 'Store', date: Date.now(), items: [], total: '25.00', createdAt: Date.now() }],
      trips: [{ id: 't-1', date: Date.now(), storeName: 'Store', total: 40, itemCount: '2', receiptIds: [], }],
      reminders: [{ id: 'm-1', storeName: 'Store', category: 'food', frequency: 'monthly', nextReminderDate: Date.now(), averageSpend: 10, commonItems: [], enabled: 'yes', createdAt: Date.now() }],
    };

    const issues = widgetDefinitions.shopping.validate(invalid as never);
    expect(issues.length).toBeGreaterThan(0);
  });

  it('validates nested work widget collections and organization preference', () => {
    const workWidget = widgetDefinitions.work.defaultState({ id: 'work-1', position: 0 });
    const invalid = {
      ...workWidget,
      jobs: [{ id: 'job-1', title: 'Website', client: 'Client A', status: 'pending', priority: 'top', createdAt: Date.now() }],
      organizationPreference: { type: 'invalid-mode' },
    };

    const issues = widgetDefinitions.work.validate(invalid as never);
    expect(issues.length).toBeGreaterThan(0);
  });

  it('validates AI chat suggestion payloads as AI insights', () => {
    const aiChatWidget = widgetDefinitions['ai-chat'].defaultState({ id: 'ai-1', position: 0 });
    const invalid = {
      ...aiChatWidget,
      messages: [
        {
          id: 'msg-1',
          role: 'assistant',
          text: 'Suggestion',
          timestamp: Date.now(),
          suggestions: [{
            id: 'insight-1',
            kind: 'task-focus',
            title: 'Plan',
            summary: 'Summary',
            rationale: 'Rationale',
            confidence: 0.75,
            generatedAt: Date.now(),
            status: 'active',
            actions: [{
              id: 'action-1',
              label: 'Reprioritize',
              type: 'reprioritize-task',
              payload: {
                taskUpdates: [{ taskId: 'task-1', priority: 'urgent' }],
              },
            }],
          }],
        },
      ],
    };

    const issues = widgetDefinitions['ai-chat'].validate(invalid as never);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues.some((issue) => issue.field === 'messages.0.suggestions.0.actions.0.payload.taskUpdates.0.priority')).toBe(true);
  });
});

describe('executeWidgetCommand', () => {
  it('creates and updates widgets through command layer', () => {
    const created = executeWidgetCommand([], { type: 'create', widgetType: 'tasks', id: 'tasks-1' });
    expect(created.changed).toBe(true);
    expect(created.widgets).toHaveLength(1);

    const updated = executeWidgetCommand(created.widgets, {
      type: 'update',
      widgetId: 'tasks-1',
      patch: {
        tasks: [
          {
            id: 'task-1',
            text: 'Example task',
            completed: false,
            priority: 'medium',
            dueDate: null,
            category: null,
            createdAt: Date.now(),
          },
        ],
      } as Partial<Widget>,
    });

    expect(updated.changed).toBe(true);
    const tasksWidget = updated.widgets[0] as Extract<Widget, { type: 'tasks' }>;
    expect(tasksWidget.tasks).toHaveLength(1);
  });

  it('prevents duplicate imported calendar events by source reference', () => {
    const calendar = widgetDefinitions.calendar.defaultState({ id: 'calendar-1', position: 0 });
    const baseWidgets: Widget[] = [calendar];

    const firstImport = executeWidgetCommand(baseWidgets, {
      type: 'import',
      destinationWidgetId: 'calendar-1',
      payload: {
        title: 'Client appointment',
        type: 'appointment',
        description: 'Initial import',
        date: Date.now(),
        startTime: '10:00',
        endTime: '11:00',
        allDay: false,
        location: 'Office',
        reminder: undefined,
        color: 'purple',
        sourceType: 'work',
        sourceId: 'client-slot:1',
        sourceWidgetId: 'work-1',
      },
    });

    expect(firstImport.changed).toBe(true);
    expect(firstImport.meta?.added).toBe(true);

    const secondImport = executeWidgetCommand(firstImport.widgets, {
      type: 'import',
      destinationWidgetId: 'calendar-1',
      payload: {
        title: 'Client appointment',
        type: 'appointment',
        description: 'Initial import',
        date: Date.now(),
        startTime: '10:00',
        endTime: '11:00',
        allDay: false,
        location: 'Office',
        reminder: undefined,
        color: 'purple',
        sourceType: 'work',
        sourceId: 'client-slot:1',
        sourceWidgetId: 'work-1',
      },
    });

    expect(secondImport.changed).toBe(false);
    expect(secondImport.meta?.reason).toBe('duplicate');
  });
});
