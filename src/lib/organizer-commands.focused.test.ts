import { describe, expect, it } from 'vitest';
import type { WidgetAIState } from '@/types';
import {
  addCalendarImport,
  addTaskToSource,
  clearWidgetAIState,
  createWidget,
  createWorkWidget,
  saveWidgetAIState,
  toggleTaskInSource,
  updateTaskPriorityInSource,
} from './organizer-commands';

describe('organizer command helpers (focused)', () => {
  it('creates widgets for dashboard coordination', () => {
    const tasksWidget = createWidget('tasks', 0, []);
    const dailyFocusWidget = createWidget('daily-focus', 1, [tasksWidget]);

    expect(tasksWidget.type).toBe('tasks');
    expect(tasksWidget.type === 'tasks' ? tasksWidget.tasks : undefined).toEqual([]);
    expect(dailyFocusWidget.type === 'daily-focus' ? dailyFocusWidget.sourceWidgetId : undefined).toBe(tasksWidget.id);
  });

  it('adds, toggles, and reprioritizes source tasks', () => {
    const taskWidget = createWidget('tasks', 0, []);
    const taskWidgetId = taskWidget.id;

    const withTask = addTaskToSource([taskWidget], taskWidgetId, {
      text: 'Submit report',
      priority: 'high',
      dueDate: null,
      category: null,
    });
    const createdTaskId = (withTask[0].type === 'tasks' ? withTask[0].tasks[0].id : null) as string;
    const toggled = toggleTaskInSource(withTask, taskWidgetId, createdTaskId);
    const reprioritized = updateTaskPriorityInSource(toggled, taskWidgetId, createdTaskId, 'low');
    const task = reprioritized[0].type === 'tasks' ? reprioritized[0].tasks[0] : null;

    expect(task?.completed).toBe(true);
    expect(task?.priority).toBe('low');
  });

  it('deduplicates imported calendar entries', () => {
    const calendarWidget = createWidget('calendar', 0, []);
    const widgets = [calendarWidget];
    const draft = {
      title: 'Client slot',
      type: 'appointment' as const,
      date: Date.now(),
      sourceType: 'work' as const,
      sourceId: 'client-slot-1',
      sourceWidgetId: 'work-1',
    };

    const first = addCalendarImport(widgets, calendarWidget.id, draft);
    const second = addCalendarImport(first.widgets, calendarWidget.id, draft);

    expect(first.result).toEqual({ added: true });
    expect(second.result).toEqual({ added: false, reason: 'duplicate' });
  });

  it('saves and clears widget AI state by widget id', () => {
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
    const cleared = clearWidgetAIState(saved, state.widgetId);

    expect(saved[state.widgetId]).toEqual(state);
    expect(cleared[state.widgetId]).toBeUndefined();
  });

  it('creates a work widget with configured preference and defaults', () => {
    const preference = { type: 'week' as const, startTime: '09:00' };
    const workWidget = createWorkWidget(preference, 2);

    expect(workWidget.type).toBe('work');
    if (workWidget.type !== 'work') {
      throw new Error('Expected work widget');
    }
    expect(workWidget.position).toBe(2);
    expect(workWidget.organizationPreference).toEqual(preference);
    expect(workWidget.clientSlots).toEqual([]);
    expect(workWidget.activeTimerEntryId).toBeNull();
    expect(workWidget.calendarSourceWidgetId).toBeNull();
  });
});
