import { describe, expect, it } from 'vitest';
import type { Widget, WidgetAIState } from '@/types';
import {
  addCalendarImport,
  addTaskToSource,
  clearWidgetAIState,
  createWidget,
  saveCalendarEvent,
  saveWidgetAIState,
  toggleTaskInSource,
  updateTaskPriorityInSource,
} from './organizer-commands';

describe('organizer commands', () => {
  it('links a new daily-focus widget to the first tasks widget', () => {
    const widgets: Widget[] = [
      { id: 'tasks-1', type: 'tasks', position: 0, tasks: [] },
    ];

    const widget = createWidget('daily-focus', 1, widgets);

    expect(widget.type).toBe('daily-focus');
    expect(widget.sourceWidgetId).toBe('tasks-1');
  });

  it('routes task source mutations through the source tasks widget', () => {
    const widgets: Widget[] = [
      {
        id: 'tasks-1',
        type: 'tasks',
        position: 0,
        tasks: [{ id: 'task-1', text: 'Existing', completed: false, priority: 'low', createdAt: 1 }],
      },
      { id: 'daily-1', type: 'daily-focus', position: 1, sourceWidgetId: 'tasks-1' },
    ];

    const afterAdd = addTaskToSource(widgets, 'tasks-1', {
      text: 'New',
      priority: 'high',
      dueDate: null,
      category: null,
    });
    const afterToggle = toggleTaskInSource(afterAdd, 'tasks-1', 'task-1');
    const afterPriority = updateTaskPriorityInSource(afterToggle, 'tasks-1', 'task-1', 'medium');
    const tasksWidget = afterPriority.find((widget) => widget.id === 'tasks-1' && widget.type === 'tasks');

    expect(tasksWidget?.tasks).toHaveLength(2);
    expect(tasksWidget?.tasks[0].completed).toBe(true);
    expect(tasksWidget?.tasks[0].priority).toBe('medium');
  });

  it('deduplicates imported calendar events by source reference', () => {
    const widgets: Widget[] = [
      { id: 'calendar-1', type: 'calendar', position: 0, events: [] },
    ];

    const draft = {
      title: 'Client slot',
      type: 'appointment' as const,
      date: Date.now(),
      sourceType: 'work' as const,
      sourceId: 'client-slot-1',
      sourceWidgetId: 'work-1',
    };

    const first = addCalendarImport(widgets, 'calendar-1', draft);
    const second = addCalendarImport(first.widgets, 'calendar-1', draft);

    expect(first.result.added).toBe(true);
    expect(second.result).toEqual({ added: false, reason: 'duplicate' });
  });

  it('stores and clears widget AI state by widget id', () => {
    const state: WidgetAIState = {
      widgetId: 'tasks-1',
      feature: 'tasks',
      generatedAt: 1,
      sourceHash: 'hash',
      providerMode: 'mock',
      providerLabel: 'Mock AI',
      privacyMode: 'local-only',
      model: 'mock-organizer-v1',
      dataSummary: [],
      insights: [],
    };

    const saved = saveWidgetAIState({}, state);
    const cleared = clearWidgetAIState(saved, 'tasks-1');

    expect(saved['tasks-1']).toEqual(state);
    expect(cleared['tasks-1']).toBeUndefined();
  });

  it('creates and updates calendar events through the shared command', () => {
    const created = saveCalendarEvent([], {
      title: 'Planning',
      type: 'event',
      description: '',
      date: 123,
      startTime: '09:00',
      endTime: '10:00',
      allDay: false,
      location: undefined,
      reminder: 15,
      reminderSent: false,
      color: 'blue',
      sourceType: undefined,
      sourceId: undefined,
      sourceWidgetId: undefined,
    });

    const updated = saveCalendarEvent(created, {
      ...created[0],
      title: 'Updated planning',
    }, created[0]);

    expect(created).toHaveLength(1);
    expect(updated[0].id).toBe(created[0].id);
    expect(updated[0].title).toBe('Updated planning');
  });
});
