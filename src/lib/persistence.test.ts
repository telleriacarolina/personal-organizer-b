import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PersistedSuggestion } from '@/types/ai';
import type { Widget } from '@/types';
import {
  aiInsightRepository,
  aiSuggestionRepository,
  preferencesRepository,
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
