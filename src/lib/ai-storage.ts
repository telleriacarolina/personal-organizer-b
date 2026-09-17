// ---------------------------------------------------------------------------
// AI Storage – persistence for AI suggestions (Phase 1)
//
// Suggestions are stored independently of widget source data so that
// dismissing or applying a suggestion never mutates the widget's own data.
// ---------------------------------------------------------------------------

import type { PersistedSuggestion } from '@/types/ai';

const STORAGE_KEY = 'organizer-ai-suggestions';
const LEGACY_STORAGE_KEY = 'organizer-widget-ai';
const MAX_PERSISTED = 200; // prevent unbounded growth

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function readAll(): PersistedSuggestion[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as PersistedSuggestion[];
    }
  } catch {
    return [];
  }

  try {
    const legacyRaw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!legacyRaw) return [];
    const parsed = JSON.parse(legacyRaw);
    if (!Array.isArray(parsed)) return [];
    writeAll(parsed as PersistedSuggestion[]);
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    return parsed as PersistedSuggestion[];
  } catch {
    return [];
  }
}

function writeAll(suggestions: PersistedSuggestion[]): void {
  if (typeof window === 'undefined') return;
  // Keep only the most recent MAX_PERSISTED entries to limit storage growth
  const trimmed = suggestions.slice(-MAX_PERSISTED);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Return all persisted suggestions. */
export function getAllSuggestions(): PersistedSuggestion[] {
  return readAll();
}

/** Return only suggestions with status === 'pending'. */
export function getPendingSuggestions(): PersistedSuggestion[] {
  return readAll().filter((s) => s.status === 'pending');
}

/**
 * Persist a new batch of suggestions (status = 'pending').
 * Avoids adding duplicates by id.
 */
export function saveSuggestions(incoming: PersistedSuggestion[]): void {
  const existing = readAll();
  const existingIds = new Set(existing.map((s) => s.id));
  const deduped = incoming.filter((s) => !existingIds.has(s.id));
  writeAll([...existing, ...deduped]);
}

/**
 * Update the status of a single suggestion.
 * Returns true if the suggestion was found and updated.
 */
export function updateSuggestionStatus(
  id: string,
  status: PersistedSuggestion['status']
): boolean {
  const all = readAll();
  let found = false;
  const updated = all.map((s) => {
    if (s.id === id) {
      found = true;
      return { ...s, status, statusUpdatedAt: new Date().toISOString() };
    }
    return s;
  });
  if (found) writeAll(updated);
  return found;
}

/** Apply a suggestion – convenience wrapper around updateSuggestionStatus. */
export function applySuggestion(id: string): boolean {
  return updateSuggestionStatus(id, 'applied');
}

/** Dismiss a suggestion – convenience wrapper around updateSuggestionStatus. */
export function dismissSuggestion(id: string): boolean {
  return updateSuggestionStatus(id, 'dismissed');
}

/** Remove all persisted suggestions (e.g. on user request). */
export function clearAllSuggestions(): void {
  writeAll([]);
}
