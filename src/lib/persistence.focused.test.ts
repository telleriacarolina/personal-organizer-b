import { beforeEach, describe, expect, it } from 'vitest';
import { createLocalStorageStateRepository, writeLocalStorageJson } from './persistence';

describe('persistence helpers (focused)', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('round-trips values with localStorage state repositories', () => {
    const repository = createLocalStorageStateRepository('test.widgets', []);
    const value = [{ id: 'widget-1', type: 'tasks' }];

    repository.save(value);

    expect(repository.load()).toEqual(value);
  });

  it('falls back when stored JSON is malformed', () => {
    const repository = createLocalStorageStateRepository('test.bad-json', ['fallback']);
    window.localStorage.setItem('test.bad-json', '{');

    expect(repository.load()).toEqual(['fallback']);
  });

  it('writes serialized JSON successfully', () => {
    const result = writeLocalStorageJson('test.serialize', { ok: true, count: 2 });

    expect(result).toEqual({ ok: true });
    expect(window.localStorage.getItem('test.serialize')).toBe('{"ok":true,"count":2}');
  });
});
