// @vitest-environment jsdom

import 'fake-indexeddb/auto';
import { Blob as NodeBlob } from 'node:buffer';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useStoredMediaUrl } from '@/hooks/useStoredMediaUrl';
import type { BackgroundImage, Receipt, RecordNote } from '@/types';
import {
  AI_SUGGESTIONS_STORAGE_KEY,
  MEDIA_DB_NAME,
  createMediaId,
  deleteMedia,
  getMedia,
  hasMedia,
  migrateLegacyBackgroundImage,
  migrateLegacyReceipt,
  migrateLegacyRecordNote,
  readLocalStorageJson,
  reportPersistenceIssue,
  saveMedia,
  subscribeToPersistenceIssues,
  writeLocalStorageJson,
} from './persistence';

function MediaProbe({ mediaId, fallbackUrl }: { mediaId?: string; fallbackUrl?: string | null }) {
  const { url, isMissing } = useStoredMediaUrl({ mediaId, fallbackUrl });
  return <div data-testid="probe" data-url={url ?? ''} data-missing={isMissing ? 'yes' : 'no'} />;
}

async function clearMediaDatabase() {
  await new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase(MEDIA_DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
}

async function flushEffects() {
  await act(async () => {
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

async function blobToText(blob: Blob) {
  if (typeof (blob as Blob & { text?: () => Promise<string> }).text === 'function') {
    return await (blob as Blob & { text: () => Promise<string> }).text();
  }
  return await new NodeBlob([JSON.stringify(blob)]).text();
}

function captureIssues() {
  const issues: Array<{ code: string; message: string }> = [];
  const unsubscribe = subscribeToPersistenceIssues((issue) => {
    issues.push({ code: issue.code, message: issue.message });
  });
  return { issues, unsubscribe };
}

describe('persistence media storage', () => {
  let root: Root | null = null;
  let container: HTMLDivElement | null = null;
  let blobCounter = 0;

  beforeEach(async () => {
    // @ts-expect-error test-only React act flag
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    window.localStorage.clear();
    await clearMediaDatabase();
    blobCounter = 0;
    const drain = subscribeToPersistenceIssues(() => {});
    drain();
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: vi.fn(() => `blob:test-${++blobCounter}`),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      writable: true,
      value: vi.fn(),
    });
    vi.stubGlobal('Blob', NodeBlob);
  });

  afterEach(async () => {
    if (root && container) {
      await act(async () => {
        root?.unmount();
      });
    }
    root = null;
    container = null;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    await clearMediaDatabase();
    window.localStorage.clear();
  });

  it('saves, reads, checks, and deletes media blobs', async () => {
    const blob = new Blob(['hello world'], { type: 'text/plain' });
    const saved = await saveMedia({ id: 'record-note-1', kind: 'record-note', blob });

    expect(saved.id).toBe('record-note-1');
    expect(await hasMedia('record-note-1')).toBe(true);

    const loaded = await getMedia('record-note-1');
    expect(loaded.kind).toBe('record-note');
    expect(await blobToText(loaded.blob)).toBe('hello world');

    await deleteMedia('record-note-1');
    expect(await hasMedia('record-note-1')).toBe(false);
  });

  it('reports missing media', async () => {
    await expect(getMedia('missing-media')).rejects.toMatchObject({ code: 'not-found' });
  });

  it('returns fallback and reports corrupted localStorage metadata', () => {
    const { issues, unsubscribe } = captureIssues();
    window.localStorage.setItem('bad-json', '{');

    expect(readLocalStorageJson('bad-json', { ok: true })).toEqual({ ok: true });
    expect(issues).toEqual([
      expect.objectContaining({ code: 'corrupted-data' }),
    ]);

    unsubscribe();
  });

  it('reports IndexedDB unavailability', async () => {
    const originalIndexedDb = indexedDB;
    const { issues, unsubscribe } = captureIssues();

    vi.stubGlobal('indexedDB', undefined);

    await expect(saveMedia({ kind: 'record-note', blob: new Blob(['x']) })).rejects.toMatchObject({
      code: 'storage-unavailable',
    });
    expect(issues).toEqual([
      expect.objectContaining({ code: 'storage-unavailable' }),
    ]);

    vi.stubGlobal('indexedDB', originalIndexedDb);
    unsubscribe();
  });

  it('migrates legacy Base64 record notes into IndexedDB', async () => {
    const legacyRecord: RecordNote = {
      id: '42',
      title: 'Voice memo',
      mediaType: 'voice',
      dataUrl: 'data:text/plain;base64,aGVsbG8=',
      createdAt: 1,
    };

    const migration = await migrateLegacyRecordNote(legacyRecord);

    expect(migration.migrated).toBe(true);
    expect(migration.value.mediaId).toBe(createMediaId('record-note', '42'));
    expect(migration.value.dataUrl).toBeUndefined();
    expect(await hasMedia(migration.value.mediaId!)).toBe(true);
    expect(await blobToText((await getMedia(migration.value.mediaId!)).blob)).toBe('hello');
  });

  it('preserves legacy data when migration fails', async () => {
    const originalIndexedDb = indexedDB;
    vi.stubGlobal('indexedDB', undefined);

    const legacyRecord: RecordNote = {
      id: '99',
      title: 'Photo',
      mediaType: 'photo',
      dataUrl: 'data:text/plain;base64,aGVsbG8=',
      createdAt: 1,
    };

    const migration = await migrateLegacyRecordNote(legacyRecord);

    expect(migration.migrated).toBe(false);
    expect(migration.issue?.code).toBe('storage-unavailable');
    expect(migration.value.dataUrl).toBe(legacyRecord.dataUrl);
    expect(migration.value.mediaId).toBeUndefined();

    vi.stubGlobal('indexedDB', originalIndexedDb);
  });

  it('avoids duplicate migrations after legacy payloads are already converted', async () => {
    const legacyRecord: RecordNote = {
      id: '77',
      title: 'Video',
      mediaType: 'video',
      dataUrl: 'data:text/plain;base64,aGVsbG8=',
      createdAt: 1,
    };

    const firstMigration = await migrateLegacyRecordNote(legacyRecord);
    const secondMigration = await migrateLegacyRecordNote(firstMigration.value);

    expect(firstMigration.migrated).toBe(true);
    expect(secondMigration.migrated).toBe(false);
    expect(secondMigration.value.mediaId).toBe(firstMigration.value.mediaId);
    expect(await hasMedia(firstMigration.value.mediaId!)).toBe(true);
  });

  it('migrates receipt images and theme background images into IndexedDB', async () => {
    const receipt: Receipt = {
      id: 'receipt-1',
      storeName: 'Corner Shop',
      date: Date.now(),
      items: [],
      total: 12,
      imageData: 'data:text/plain;base64,aGVsbG8=',
      createdAt: Date.now(),
    };
    const background: BackgroundImage = {
      url: 'data:text/plain;base64,dGhlbWU=',
      opacity: 40,
    };

    const receiptMigration = await migrateLegacyReceipt(receipt);
    const backgroundMigration = await migrateLegacyBackgroundImage(background);

    expect(receiptMigration.value.imageMediaId).toBe('receipt-image-receipt-1');
    expect(receiptMigration.value.imageData).toBeUndefined();
    expect(await blobToText((await getMedia(receiptMigration.value.imageMediaId!)).blob)).toBe('hello');

    expect(backgroundMigration.value.mediaId).toBe('theme-background-background-image');
    expect(backgroundMigration.value.url).toBeUndefined();
    expect(await blobToText((await getMedia(backgroundMigration.value.mediaId!)).blob)).toBe('theme');
  });

  it('reports localStorage quota failures', () => {
    const { issues, unsubscribe } = captureIssues();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError');
    });

    const result = writeLocalStorageJson('large-value', { ok: true });

    expect(result.ok).toBe(false);
    expect(issues).toEqual([
      expect.objectContaining({ code: 'quota-exceeded' }),
    ]);

    unsubscribe();
  });

  it('queues persistence issues for later subscribers so the UI can surface them', () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    const result = writeLocalStorageJson('circular', circular);
    expect(result.ok).toBe(false);

    const issues: string[] = [];
    const unsubscribe = subscribeToPersistenceIssues((issue) => {
      issues.push(issue.code);
    });

    expect(issues).toContain('serialization-failed');
    unsubscribe();
  });

  it('resolves stored media to object URLs for reload playback and revokes them on cleanup', async () => {
    await saveMedia({
      id: 'record-note-reload',
      kind: 'record-note',
      blob: new Blob(['audio'], { type: 'audio/webm' }),
    });

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(<MediaProbe mediaId="record-note-reload" />);
    });
    await flushEffects();

    const probe = container.querySelector('[data-testid="probe"]');
    expect(probe?.getAttribute('data-url')).toBe('blob:test-1');
    expect(probe?.getAttribute('data-missing')).toBe('no');

    await act(async () => {
      root?.unmount();
    });

    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test-1');
  });

  it('keeps AI suggestion history in its own localStorage key', () => {
    writeLocalStorageJson(AI_SUGGESTIONS_STORAGE_KEY, [{ id: 's1' }]);
    reportPersistenceIssue({
      storage: 'localStorage',
      operation: 'read',
      code: 'unknown',
      message: 'noop',
    });

    expect(window.localStorage.getItem(AI_SUGGESTIONS_STORAGE_KEY)).toContain('s1');
  });
});
