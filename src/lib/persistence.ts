import type { Widget, WidgetAIState, FamilyCalendarPlannerEvent, RecordNote } from '@/types';
import type { AIConfig, PersistedSuggestion } from '@/types/ai';
import type { BackgroundImage, CustomColors } from '@/types/theme';

export interface StateRepository<T> {
  load(): T;
  save(value: T): void;
}

export interface OrganizerDashboard {
  widgets: Widget[];
}

export interface OrganizerRepository {
  loadDashboard(): OrganizerDashboard;
  saveDashboard(dashboard: OrganizerDashboard): void;
}

export interface WidgetRepository {
  list(): Widget[];
  replaceAll(widgets: Widget[]): void;
  save(widget: Widget): Widget[];
  remove(widgetId: string): Widget[];
  reorder(widgetIds: string[]): Widget[];
}

export interface PreferencesRepository {
  getSnapToGrid(): boolean;
  setSnapToGrid(value: boolean): void;
  getGlobalLock(): boolean;
  setGlobalLock(value: boolean): void;
  isDragHintShown(): boolean;
  setDragHintShown(value: boolean): void;
  getTheme(): string;
  setTheme(value: string): void;
  getCustomColors(): CustomColors | null;
  setCustomColors(value: CustomColors | null): void;
  getBackgroundImage(): BackgroundImage | null;
  setBackgroundImage(value: BackgroundImage | null): void;
  getAIConfig(): AIConfig;
  setAIConfig(config: AIConfig): void;
}

export interface AIInsightRepository {
  getAllWidgetStates(): Record<string, WidgetAIState>;
  replaceAllWidgetStates(states: Record<string, WidgetAIState>): void;
  getWidgetState(widgetId: string): WidgetAIState | undefined;
  saveWidgetState(state: WidgetAIState): Record<string, WidgetAIState>;
  clearWidgetState(widgetId: string): Record<string, WidgetAIState>;
}

export interface AISuggestionRepository {
  list(): PersistedSuggestion[];
  listPending(): PersistedSuggestion[];
  saveAll(incoming: PersistedSuggestion[]): PersistedSuggestion[];
  updateStatus(id: string, status: PersistedSuggestion['status']): boolean;
  clearAll(): void;
}

export interface MediaRepository {
  listRecordNotes(): RecordNote[];
  saveRecord(record: RecordNote): RecordNote[];
  getRecord(id: string): RecordNote | undefined;
  deleteRecord(id: string): RecordNote[];
}

export interface CalendarSyncPort {
  syncEvents(events: FamilyCalendarPlannerEvent[]): Promise<void>;
}

export const storageKeys = {
  widgets: 'organizer-widgets',
  snapToGrid: 'organizer-snap-to-grid',
  globalLock: 'organizer-global-lock',
  widgetAIState: 'organizer-widget-ai',
  dragHintShown: 'drag-hint-shown',
  theme: 'organizer-theme',
  customColors: 'organizer-custom-colors',
  backgroundImage: 'organizer-bg-image',
  familyPlannerEvents: 'family-calendar-planner-events',
  aiConfig: 'organizer-ai-config',
  aiSuggestions: 'organizer-ai-suggestions',
  mediaRecords: 'organizer-media-records',
} as const;

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function getBrowserStorage(): KeyValueStore | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage;
}

function readJson<T>(key: string, fallback: T, store = getBrowserStorage()): T {
  if (!store) {
    return fallback;
  }

  try {
    const raw = store.getItem(key);
    if (raw === null) {
      return fallback;
    }

    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T, store = getBrowserStorage()): void {
  if (!store) {
    return;
  }

  store.setItem(key, JSON.stringify(value));
}

function removeValue(key: string, store = getBrowserStorage()): void {
  if (!store) {
    return;
  }

  store.removeItem(key);
}

export function createLocalStorageStateRepository<T>(key: string, fallback: T): StateRepository<T> {
  return {
    load: () => readJson(key, fallback),
    save: (value) => writeJson(key, value),
  };
}

const widgetsStateRepository = createLocalStorageStateRepository<Widget[]>(storageKeys.widgets, []);
const snapToGridStateRepositoryInternal = createLocalStorageStateRepository<boolean>(storageKeys.snapToGrid, false);
const globalLockStateRepositoryInternal = createLocalStorageStateRepository<boolean>(storageKeys.globalLock, false);
const widgetAIStateRepositoryInternal = createLocalStorageStateRepository<Record<string, WidgetAIState>>(storageKeys.widgetAIState, {});
const themeStateRepositoryInternal = createLocalStorageStateRepository<string>(storageKeys.theme, 'Warm Terracotta');
const customColorsStateRepositoryInternal = createLocalStorageStateRepository<CustomColors | null>(storageKeys.customColors, null);
const backgroundImageStateRepositoryInternal = createLocalStorageStateRepository<BackgroundImage | null>(storageKeys.backgroundImage, null);
const plannerEventsStateRepositoryInternal = createLocalStorageStateRepository<FamilyCalendarPlannerEvent[]>(storageKeys.familyPlannerEvents, []);
const aiConfigStateRepositoryInternal = createLocalStorageStateRepository<AIConfig>(storageKeys.aiConfig, {
  mode: 'off',
  providerLabel: 'Disabled',
  privacyAccepted: false,
});
const aiSuggestionsStateRepository = createLocalStorageStateRepository<PersistedSuggestion[]>(storageKeys.aiSuggestions, []);
const mediaRecordsStateRepository = createLocalStorageStateRepository<RecordNote[]>(storageKeys.mediaRecords, []);
const MAX_PERSISTED_AI_SUGGESTIONS = 200;

export const organizerRepository: OrganizerRepository = {
  loadDashboard: () => ({
    widgets: widgetsStateRepository.load(),
  }),
  saveDashboard: (dashboard) => {
    widgetsStateRepository.save(dashboard.widgets);
  },
};

export const widgetRepository: WidgetRepository = {
  list: () => organizerRepository.loadDashboard().widgets,
  replaceAll: (widgets) => organizerRepository.saveDashboard({ widgets }),
  save: (widget) => {
    const current = widgetRepository.list();
    const existingIndex = current.findIndex((entry) => entry.id === widget.id);
    const next =
      existingIndex >= 0
        ? current.map((entry) => (entry.id === widget.id ? widget : entry))
        : [...current, widget];
    widgetRepository.replaceAll(next);
    return next;
  },
  remove: (widgetId) => {
    const next = widgetRepository.list().filter((widget) => widget.id !== widgetId);
    widgetRepository.replaceAll(next);
    return next;
  },
  reorder: (widgetIds) => {
    const current = widgetRepository.list();
    const lookup = new Map(current.map((widget) => [widget.id, widget] as const));
    const next = widgetIds
      .map((id) => lookup.get(id))
      .filter((widget): widget is Widget => Boolean(widget))
      .map((widget, position) => ({ ...widget, position }));
    widgetRepository.replaceAll(next);
    return next;
  },
};

export const preferencesRepository: PreferencesRepository = {
  getSnapToGrid: () => snapToGridStateRepositoryInternal.load(),
  setSnapToGrid: (value) => snapToGridStateRepositoryInternal.save(value),
  getGlobalLock: () => globalLockStateRepositoryInternal.load(),
  setGlobalLock: (value) => globalLockStateRepositoryInternal.save(value),
  isDragHintShown: () => readJson(storageKeys.dragHintShown, false),
  setDragHintShown: (value) => {
    if (value) {
      writeJson(storageKeys.dragHintShown, true);
      return;
    }

    removeValue(storageKeys.dragHintShown);
  },
  getTheme: () => themeStateRepositoryInternal.load(),
  setTheme: (value) => themeStateRepositoryInternal.save(value),
  getCustomColors: () => customColorsStateRepositoryInternal.load(),
  setCustomColors: (value) => customColorsStateRepositoryInternal.save(value),
  getBackgroundImage: () => backgroundImageStateRepositoryInternal.load(),
  setBackgroundImage: (value) => backgroundImageStateRepositoryInternal.save(value),
  getAIConfig: () => aiConfigStateRepositoryInternal.load(),
  setAIConfig: (config) => aiConfigStateRepositoryInternal.save(config),
};

export const aiInsightRepository: AIInsightRepository = {
  getAllWidgetStates: () => widgetAIStateRepositoryInternal.load(),
  replaceAllWidgetStates: (states) => widgetAIStateRepositoryInternal.save(states),
  getWidgetState: (widgetId) => aiInsightRepository.getAllWidgetStates()[widgetId],
  saveWidgetState: (state) => {
    const next = {
      ...aiInsightRepository.getAllWidgetStates(),
      [state.widgetId]: state,
    };
    aiInsightRepository.replaceAllWidgetStates(next);
    return next;
  },
  clearWidgetState: (widgetId) => {
    const next = { ...aiInsightRepository.getAllWidgetStates() };
    delete next[widgetId];
    aiInsightRepository.replaceAllWidgetStates(next);
    return next;
  },
};

export const aiSuggestionRepository: AISuggestionRepository = {
  list: () => aiSuggestionsStateRepository.load(),
  listPending: () => aiSuggestionRepository.list().filter((suggestion) => suggestion.status === 'pending'),
  saveAll: (incoming) => {
    const existing = aiSuggestionRepository.list();
    const existingIds = new Set(existing.map((suggestion) => suggestion.id));
    const deduped = incoming.filter((suggestion) => !existingIds.has(suggestion.id));
    const next = [...existing, ...deduped].slice(-MAX_PERSISTED_AI_SUGGESTIONS);
    aiSuggestionsStateRepository.save(next);
    return next;
  },
  updateStatus: (id, status) => {
    const all = aiSuggestionRepository.list();
    let found = false;
    const updated = all.map((suggestion) => {
      if (suggestion.id === id) {
        found = true;
        return { ...suggestion, status, statusUpdatedAt: new Date().toISOString() };
      }

      return suggestion;
    });

    if (found) {
      aiSuggestionsStateRepository.save(updated);
    }

    return found;
  },
  clearAll: () => aiSuggestionsStateRepository.save([]),
};

export const mediaRepository: MediaRepository = {
  listRecordNotes: () => mediaRecordsStateRepository.load(),
  saveRecord: (record) => {
    const next = [...mediaRepository.listRecordNotes(), record];
    mediaRecordsStateRepository.save(next);
    return next;
  },
  getRecord: (id) => mediaRepository.listRecordNotes().find((record) => record.id === id),
  deleteRecord: (id) => {
    const next = mediaRepository.listRecordNotes().filter((record) => record.id !== id);
    mediaRecordsStateRepository.save(next);
    return next;
  },
};

export const stateRepositories = {
  widgets: widgetsStateRepository,
  snapToGrid: snapToGridStateRepositoryInternal,
  globalLock: globalLockStateRepositoryInternal,
  widgetAIState: widgetAIStateRepositoryInternal,
  theme: themeStateRepositoryInternal,
  customColors: customColorsStateRepositoryInternal,
  backgroundImage: backgroundImageStateRepositoryInternal,
  plannerEvents: plannerEventsStateRepositoryInternal,
  aiConfig: aiConfigStateRepositoryInternal,
};
