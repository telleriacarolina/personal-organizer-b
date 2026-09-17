import type { BackgroundImage, Receipt, RecordNote, Widget } from '@/types';

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
