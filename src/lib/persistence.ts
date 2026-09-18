import type {
  BackgroundImage,
  FamilyCalendarPlannerEvent,
  Receipt,
  RecordNote,
  Widget,
  WidgetAIState,
} from '@/types';
import type { AIConfig, PersistedSuggestion } from '@/types/ai';
import type { CustomColors } from '@/types/theme';

export type PersistenceStorage = 'localStorage' | 'indexedDB';
export type PersistenceOperation = 'read' | 'write' | 'delete' | 'migrate';
export type PersistenceErrorCode =
  | 'storage-unavailable'
  | 'quota-exceeded'
  | 'corrupted-data'
  | 'serialization-failed'
  | 'not-found'
  | 'unknown';

export interface PersistenceIssue {
  storage: PersistenceStorage;
  operation: PersistenceOperation;
  code: PersistenceErrorCode;
  key?: string;
  message: string;
  cause?: unknown;
}

export class PersistenceError extends Error {
  readonly storage: PersistenceStorage;
  readonly operation: PersistenceOperation;
  readonly code: PersistenceErrorCode;
  readonly key?: string;
  readonly cause?: unknown;

  constructor(issue: PersistenceIssue) {
    super(issue.message);
    this.name = 'PersistenceError';
    this.storage = issue.storage;
    this.operation = issue.operation;
    this.code = issue.code;
    this.key = issue.key;
    this.cause = issue.cause;
  }
}

const listeners = new Set<(issue: PersistenceIssue) => void>();
const pendingIssues: PersistenceIssue[] = [];

export const AI_SUGGESTIONS_STORAGE_KEY = 'organizer-ai-suggestions';
const LEGACY_AI_SUGGESTIONS_STORAGE_KEY = 'organizer-widget-ai';
export const MEDIA_DB_NAME = 'personal-organizer-media';
export const MEDIA_STORE_NAME = 'media';
const MEDIA_DB_VERSION = 1;

export type MediaKind = 'record-note' | 'receipt-image' | 'theme-background';

export interface MediaRecord {
  id: string;
  kind: MediaKind;
  blob: Blob;
  mimeType: string;
  size: number;
  createdAt: number;
  updatedAt: number;
}

export interface SaveMediaInput {
  id?: string;
  kind: MediaKind;
  blob: Blob;
}

export interface MigrationResult<TValue> {
  value: TValue;
  migrated: boolean;
  issue?: PersistenceIssue;
}

export function subscribeToPersistenceIssues(listener: (issue: PersistenceIssue) => void) {
  listeners.add(listener);
  while (pendingIssues.length > 0) {
    const issue = pendingIssues.shift();
    if (issue) listener(issue);
  }
  return () => listeners.delete(listener);
}

export function reportPersistenceIssue(issue: PersistenceIssue) {
  if (listeners.size === 0) {
    pendingIssues.push(issue);
    return;
  }
  listeners.forEach((listener) => listener(issue));
}

function toPersistenceError(issue: PersistenceIssue): PersistenceError {
  return new PersistenceError(issue);
}

function isQuotaExceededError(error: unknown) {
  return error instanceof DOMException && (
    error.name === 'QuotaExceededError' ||
    error.name === 'NS_ERROR_DOM_QUOTA_REACHED'
  );
}

function buildStorageIssue(
  storage: PersistenceStorage,
  operation: PersistenceOperation,
  key: string | undefined,
  error: unknown,
  fallbackMessage: string,
): PersistenceIssue {
  if (isQuotaExceededError(error)) {
    return {
      storage,
      operation,
      key,
      code: 'quota-exceeded',
      message: `${fallbackMessage} Storage quota was exceeded.`,
      cause: error,
    };
  }

  if (error instanceof SyntaxError) {
    return {
      storage,
      operation,
      key,
      code: 'corrupted-data',
      message: `${fallbackMessage} Stored data is corrupted.`,
      cause: error,
    };
  }

  return {
    storage,
    operation,
    key,
    code: 'unknown',
    message: fallbackMessage,
    cause: error,
  };
}

export function readLocalStorageJson<T>(key: string, fallbackValue: T): T {
  if (typeof window === 'undefined') return fallbackValue;
  if (!window.localStorage) {
    reportPersistenceIssue({
      storage: 'localStorage',
      operation: 'read',
      code: 'storage-unavailable',
      key,
      message: `Could not read "${key}" because localStorage is unavailable.`,
    });
    return fallbackValue;
  }

  let raw: string | null;
  try {
    raw = window.localStorage.getItem(key);
  } catch (error) {
    reportPersistenceIssue(buildStorageIssue(
      'localStorage',
      'read',
      key,
      error,
      `Could not read "${key}" from localStorage.`,
    ));
    return fallbackValue;
  }

  if (raw === null) return fallbackValue;

  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    reportPersistenceIssue(buildStorageIssue(
      'localStorage',
      'read',
      key,
      error,
      `Could not parse "${key}" from localStorage.`,
    ));
    return fallbackValue;
  }
}

export function writeLocalStorageJson<T>(key: string, value: T) {
  if (typeof window === 'undefined') {
    return { ok: true as const };
  }
  if (!window.localStorage) {
    const issue: PersistenceIssue = {
      storage: 'localStorage',
      operation: 'write',
      code: 'storage-unavailable',
      key,
      message: `Could not save "${key}" because localStorage is unavailable.`,
    };
    reportPersistenceIssue(issue);
    return { ok: false as const, error: toPersistenceError(issue) };
  }

  let serialized: string;
  try {
    serialized = JSON.stringify(value);
  } catch (error) {
    const issue: PersistenceIssue = {
      storage: 'localStorage',
      operation: 'write',
      code: 'serialization-failed',
      key,
      message: `Could not serialize "${key}" for localStorage.`,
      cause: error,
    };
    reportPersistenceIssue(issue);
    return { ok: false as const, error: toPersistenceError(issue) };
  }

  try {
    window.localStorage.setItem(key, serialized);
    return { ok: true as const };
  } catch (error) {
    const issue = buildStorageIssue(
      'localStorage',
      'write',
      key,
      error,
      `Could not save "${key}" to localStorage.`,
    );
    reportPersistenceIssue(issue);
    return { ok: false as const, error: toPersistenceError(issue) };
  }
}

export function removeLocalStorageKey(key: string) {
  if (typeof window === 'undefined') {
    return { ok: true as const };
  }
  if (!window.localStorage) {
    const issue: PersistenceIssue = {
      storage: 'localStorage',
      operation: 'delete',
      code: 'storage-unavailable',
      key,
      message: `Could not remove "${key}" because localStorage is unavailable.`,
    };
    reportPersistenceIssue(issue);
    return { ok: false as const, error: toPersistenceError(issue) };
  }

  try {
    window.localStorage.removeItem(key);
    return { ok: true as const };
  } catch (error) {
    const issue = buildStorageIssue(
      'localStorage',
      'delete',
      key,
      error,
      `Could not remove "${key}" from localStorage.`,
    );
    reportPersistenceIssue(issue);
    return { ok: false as const, error: toPersistenceError(issue) };
  }
}

export function readLegacyCompatibleArrayJson<T>(key: string, fallbackKey: string): T[] {
  const direct = readLocalStorageJson<T[] | null>(key, null);
  if (Array.isArray(direct)) return direct;

  const legacy = readLocalStorageJson<unknown>(fallbackKey, []);
  return Array.isArray(legacy) ? legacy as T[] : [];
}

function ensureIndexedDbAvailable(operation: PersistenceOperation) {
  if (typeof indexedDB === 'undefined') {
    const issue: PersistenceIssue = {
      storage: 'indexedDB',
      operation,
      code: 'storage-unavailable',
      message: 'IndexedDB is unavailable in this browser.',
    };
    reportPersistenceIssue(issue);
    throw toPersistenceError(issue);
  }
}

async function openMediaDatabase(operation: PersistenceOperation): Promise<IDBDatabase> {
  ensureIndexedDbAvailable(operation);

  return await new Promise((resolve, reject) => {
    const request = indexedDB.open(MEDIA_DB_NAME, MEDIA_DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(MEDIA_STORE_NAME)) {
        database.createObjectStore(MEDIA_STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      const issue = {
        storage: 'indexedDB',
        operation,
        code: 'unknown',
        message: 'Could not open the media database.',
        cause: request.error,
      } satisfies PersistenceIssue;
      reportPersistenceIssue(issue);
      reject(toPersistenceError(issue));
    };
  });
}

async function runMediaRequest<T>(
  operation: PersistenceOperation,
  executor: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const database = await openMediaDatabase(operation);

  return await new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(MEDIA_STORE_NAME, operation === 'read' ? 'readonly' : 'readwrite');
    const store = transaction.objectStore(MEDIA_STORE_NAME);
    const request = executor(store);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      const issue = buildStorageIssue(
        'indexedDB',
        operation,
        MEDIA_STORE_NAME,
        request.error,
        `Could not ${operation} media in IndexedDB.`,
      );
      reportPersistenceIssue(issue);
      reject(toPersistenceError(issue));
    };

    transaction.oncomplete = () => database.close();
    transaction.onabort = () => {
      const issue = buildStorageIssue(
        'indexedDB',
        operation,
        MEDIA_STORE_NAME,
        transaction.error,
        `Could not ${operation} media in IndexedDB.`,
      );
      reportPersistenceIssue(issue);
      reject(toPersistenceError(issue));
      database.close();
    };
  });
}

export function createMediaId(kind: MediaKind, stablePart?: string) {
  const suffix = stablePart ?? (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
  return `${kind}-${suffix}`;
}

export async function saveMedia(input: SaveMediaInput): Promise<MediaRecord> {
  const timestamp = Date.now();
  const record: MediaRecord = {
    id: input.id ?? createMediaId(input.kind),
    kind: input.kind,
    blob: input.blob,
    mimeType: input.blob.type || 'application/octet-stream',
    size: input.blob.size,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await runMediaRequest('write', (store) => store.put(record));
  return record;
}

export async function getMedia(id: string): Promise<MediaRecord> {
  const record = await runMediaRequest<MediaRecord | undefined>('read', (store) => store.get(id));
  if (!record) {
    throw toPersistenceError({
      storage: 'indexedDB',
      operation: 'read',
      code: 'not-found',
      key: id,
      message: `Media "${id}" was not found.`,
    });
  }
  if (record.blob == null) {
    throw toPersistenceError({
      storage: 'indexedDB',
      operation: 'read',
      code: 'corrupted-data',
      key: id,
      message: `Media "${id}" is corrupted.`,
    });
  }
  return record;
}

export async function hasMedia(id: string): Promise<boolean> {
  const count = await runMediaRequest<number>('read', (store) => store.count(id));
  return count > 0;
}

export async function deleteMedia(id: string): Promise<void> {
  await runMediaRequest('delete', (store) => store.delete(id));
}

export function isDataUrl(value: string | undefined | null): value is string {
  return typeof value === 'string' && value.startsWith('data:');
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const match = dataUrl.match(/^data:([^;,]+)?(?:;charset=[^;,]+)?(;base64)?,(.*)$/s);
  if (!match) {
    throw toPersistenceError({
      storage: 'indexedDB',
      operation: 'migrate',
      code: 'corrupted-data',
      message: 'Legacy media payload is not a valid data URL.',
    });
  }

  const mimeType = match[1] || 'application/octet-stream';
  const isBase64 = Boolean(match[2]);
  const data = match[3] ?? '';
  const binary = isBase64 ? atob(data) : decodeURIComponent(data);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: mimeType });
}

async function migrateLegacyMediaPayload(
  kind: MediaKind,
  mediaId: string | undefined,
  legacyPayload: string | undefined,
  stablePart: string,
): Promise<MigrationResult<{ mediaId?: string; legacyPayload?: string }>> {
  if (!legacyPayload) {
    return { value: { mediaId }, migrated: false };
  }

  try {
    if (mediaId && await hasMedia(mediaId)) {
      return { value: { mediaId }, migrated: true };
    }

    const nextMediaId = mediaId ?? createMediaId(kind, stablePart);
    const blob = dataUrlToBlob(legacyPayload);
    await saveMedia({ id: nextMediaId, kind, blob });
    return { value: { mediaId: nextMediaId }, migrated: true };
  } catch (error) {
    const issue = error instanceof PersistenceError
      ? {
          storage: error.storage,
          operation: error.operation,
          code: error.code,
          key: error.key,
          message: error.message,
          cause: error.cause,
        }
      : buildStorageIssue('indexedDB', 'migrate', stablePart, error, 'Could not migrate legacy media payload.');
    return {
      value: { mediaId, legacyPayload },
      migrated: false,
      issue,
    };
  }
}

export async function migrateLegacyRecordNote(record: RecordNote): Promise<MigrationResult<RecordNote>> {
  const result = await migrateLegacyMediaPayload('record-note', record.mediaId, record.dataUrl, record.id);
  return {
    migrated: result.migrated,
    issue: result.issue,
    value: result.issue
      ? record
      : {
          ...record,
          mediaId: result.value.mediaId,
          dataUrl: undefined,
        },
  };
}

export async function migrateLegacyReceipt(receipt: Receipt): Promise<MigrationResult<Receipt>> {
  const result = await migrateLegacyMediaPayload('receipt-image', receipt.imageMediaId, receipt.imageData, receipt.id);
  return {
    migrated: result.migrated,
    issue: result.issue,
    value: result.issue
      ? receipt
      : {
          ...receipt,
          imageMediaId: result.value.mediaId,
          imageData: undefined,
        },
  };
}

export async function migrateLegacyBackgroundImage(image: BackgroundImage): Promise<MigrationResult<BackgroundImage>> {
  const result = await migrateLegacyMediaPayload('theme-background', image.mediaId, image.url, 'background-image');
  return {
    migrated: result.migrated,
    issue: result.issue,
    value: result.issue
      ? image
      : {
          ...image,
          mediaId: result.value.mediaId,
          url: undefined,
        },
  };
}

export async function migrateWidgetMedia(widget: Widget): Promise<MigrationResult<Widget>> {
  if (widget.type === 'record-note') {
    let migrated = false;
    let issue: PersistenceIssue | undefined;
    const records = await Promise.all(widget.records.map(async (record) => {
      const result = await migrateLegacyRecordNote(record);
      migrated ||= result.migrated;
      issue ??= result.issue;
      return result.value;
    }));
    return {
      migrated,
      issue,
      value: migrated ? { ...widget, records } : widget,
    };
  }

  if (widget.type === 'shopping') {
    let migrated = false;
    let issue: PersistenceIssue | undefined;
    const receipts = await Promise.all((widget.receipts ?? []).map(async (receipt) => {
      const result = await migrateLegacyReceipt(receipt);
      migrated ||= result.migrated;
      issue ??= result.issue;
      return result.value;
    }));
    return {
      migrated,
      issue,
      value: migrated ? { ...widget, receipts } : widget,
    };
  }

  return { migrated: false, value: widget };
}

export async function migrateWidgetsMedia(widgets: Widget[]): Promise<MigrationResult<Widget[]>> {
  let migrated = false;
  let issue: PersistenceIssue | undefined;
  const nextWidgets = await Promise.all(widgets.map(async (widget) => {
    const result = await migrateWidgetMedia(widget);
    migrated ||= result.migrated;
    issue ??= result.issue;
    return result.value;
  }));

  return {
    migrated,
    issue,
    value: migrated ? nextWidgets : widgets,
  };
}

export function hasLegacyWidgetMediaPayload(widgets: Widget[]) {
  return widgets.some((widget) => {
    if (widget.type === 'record-note') {
      return widget.records.some((record) => isDataUrl(record.dataUrl));
    }
    if (widget.type === 'shopping') {
      return (widget.receipts ?? []).some((receipt) => isDataUrl(receipt.imageData));
    }
    return false;
  });
}

export function hasLegacyBackgroundImagePayload(image: BackgroundImage | null | undefined) {
  return Boolean(image && isDataUrl(image.url));
}

export function formatPersistenceIssue(issue: PersistenceIssue) {
  return issue.message;
}

export { LEGACY_AI_SUGGESTIONS_STORAGE_KEY };

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
  aiSuggestions: aiSuggestionsStateRepository,
  mediaRecords: mediaRecordsStateRepository,
};
