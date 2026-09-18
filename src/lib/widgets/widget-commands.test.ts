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
