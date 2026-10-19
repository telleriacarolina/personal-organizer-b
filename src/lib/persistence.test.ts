import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PersistedSuggestion } from '@/types/ai';
import type { Widget } from '@/types';
import {
  aiInsightRepository,
  aiSuggestionRepository,
  preferencesRepository,
  stateRepositories,
  storageKeys,
  widgetRepository,
} from './persistence';

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

vi.stubGlobal('window', { localStorage: localStorageMock });

beforeEach(() => {
  localStorageMock.clear();
});

describe('preferencesRepository', () => {
  it('round-trips layout preferences and drag hint state', () => {
    preferencesRepository.setSnapToGrid(true);
    preferencesRepository.setGlobalLock(true);
    preferencesRepository.setDragHintShown(true);

    expect(preferencesRepository.getSnapToGrid()).toBe(true);
    expect(preferencesRepository.getGlobalLock()).toBe(true);
    expect(preferencesRepository.isDragHintShown()).toBe(true);
  });
});

describe('widgetRepository', () => {
  it('saves, lists, removes, and reorders widgets', () => {
    const tasksWidget: Widget = { id: 'tasks-1', type: 'tasks', position: 0, tasks: [] };
    const notesWidget: Widget = { id: 'notes-1', type: 'notes', position: 1, notes: [] };

    widgetRepository.save(tasksWidget);
    widgetRepository.save(notesWidget);
    expect(widgetRepository.list()).toHaveLength(2);

    const reordered = widgetRepository.reorder(['notes-1', 'tasks-1']);
    expect(reordered.map((widget) => widget.id)).toEqual(['notes-1', 'tasks-1']);
    expect(reordered.map((widget) => widget.position)).toEqual([0, 1]);

    widgetRepository.remove('tasks-1');
    expect(widgetRepository.list().map((widget) => widget.id)).toEqual(['notes-1']);
  });

  it('preserves valid sibling widgets when malformed saved widgets are filtered out', () => {
    const validWidget: Widget = {
      id: 'tasks-1',
      type: 'tasks',
      position: 0,
      tasks: [{ id: 'task-1', text: 'Valid task', completed: false, createdAt: Date.now() }],
    };
    const malformedWidget = {
      id: 'unknown-1',
      type: 'unknown-widget',
      position: 1,
      payload: 'not-a-widget',
    } as unknown as Widget;

    localStorageMock.setItem(storageKeys.widgets, JSON.stringify([validWidget, malformedWidget]));
    const loaded = stateRepositories.widgets.load();

    expect(loaded).toHaveLength(1);
    expect(loaded[0]).toMatchObject({ id: 'tasks-1', type: 'tasks' });
  });

  it('retains valid nested work data while skipping malformed entries', () => {
    const validJob = {
      id: 'job-1',
      title: 'Design sprint',
      client: 'Client A',
      status: 'pending',
      priority: 'high',
      createdAt: Date.now(),
    };
    const validErrand = {
      id: 'errand-1',
      title: 'Pickup supplies',
      completed: false,
      priority: 'medium',
      createdAt: Date.now(),
    };
    const malformedWidget = {
      id: 'work-1',
      type: 'work',
      position: 2,
      clientSlots: [],
      meals: [],
      timeEntries: [],
      jobs: [validJob],
      shoppingList: [],
      errands: [
        { ...validErrand, priority: 'invalid' },
        validErrand,
      ],
      routines: [],
    } as unknown as Widget;

    localStorageMock.setItem(storageKeys.widgets, JSON.stringify([malformedWidget]));
    const loaded = stateRepositories.widgets.load();

    expect(loaded).toHaveLength(1);
    expect(loaded[0]).toMatchObject({ id: 'work-1', type: 'work' });
    expect((loaded[0] as Extract<Widget, { type: 'work' }>).jobs).toHaveLength(1);
    expect((loaded[0] as Extract<Widget, { type: 'work' }>).errands).toHaveLength(1);
    expect((loaded[0] as Extract<Widget, { type: 'work' }>).errands[0]).toMatchObject({ id: 'errand-1', priority: 'medium' });
  });

  it('loads legacy persisted widgets with stringified boolean values', () => {
    const legacyWidget: Widget = {
      id: 'tasks-legacy',
      type: 'tasks',
      position: 0,
      size: { width: 350, height: 400, locked: 'false' as unknown as boolean },
      tasks: [{ id: 'task-1', text: 'Legacy task', completed: 'false' as unknown as boolean, createdAt: Date.now() }],
    };

    localStorageMock.setItem(storageKeys.widgets, JSON.stringify([legacyWidget]));
    const loaded = stateRepositories.widgets.load();

    expect(loaded).toHaveLength(1);
    expect(loaded[0]).toMatchObject({ id: 'tasks-legacy', type: 'tasks' });
    expect((loaded[0] as Extract<Widget, { type: 'tasks' }>).size?.locked).toBe(false);
    expect((loaded[0] as Extract<Widget, { type: 'tasks' }>).tasks[0]?.completed).toBe(false);
  });
});

describe('ai repositories', () => {
  it('stores widget AI state separately from suggestion history', () => {
    aiInsightRepository.saveWidgetState({
      widgetId: 'widget-1',
      feature: 'tasks',
      generatedAt: 1,
      sourceHash: 'hash',
      providerMode: 'mock',
      providerLabel: 'Mock AI',
      privacyMode: 'local-only',
      model: 'mock-organizer-v1',
      dataSummary: [],
      insights: [],
    });

    const suggestion: PersistedSuggestion = {
      id: 'suggestion-1',
      context: 'tasks',
      text: 'Review priorities',
      confidence: 0.8,
      rationale: 'Test',
      generatedAt: new Date().toISOString(),
      status: 'pending',
    };

    aiSuggestionRepository.saveAll([suggestion]);

    expect(localStorageMock.getItem(storageKeys.widgetAIState)).toContain('widget-1');
    expect(localStorageMock.getItem(storageKeys.aiSuggestions)).toContain('suggestion-1');
  });
});
