// ---------------------------------------------------------------------------
// AI Storage – persistence for AI suggestions (Phase 1)
//
// Suggestions are stored independently of widget source data so that
// dismissing or applying a suggestion never mutates the widget's own data.
// ---------------------------------------------------------------------------

import type { PersistedSuggestion } from '@/types/ai';
import { AI_SUGGESTIONS_STORAGE_KEY, readLegacyCompatibleArrayJson, writeLocalStorageJson } from '@/lib/persistence';

const STORAGE_KEY = AI_SUGGESTIONS_STORAGE_KEY;
const MAX_PERSISTED = 200; // prevent unbounded growth
import { aiSuggestionRepository } from '@/lib/persistence';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function readAll(): PersistedSuggestion[] {
  if (typeof window === 'undefined') return [];
  return readLegacyCompatibleArrayJson<PersistedSuggestion>(STORAGE_KEY, 'organizer-widget-ai');
}

function writeAll(suggestions: PersistedSuggestion[]): void {
  if (typeof window === 'undefined') return;
  // Keep only the most recent MAX_PERSISTED entries to limit storage growth
  const trimmed = suggestions.slice(-MAX_PERSISTED);
  writeLocalStorageJson(STORAGE_KEY, trimmed);
  return aiSuggestionRepository.list();
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
  return aiSuggestionRepository.listPending();
}

/**
 * Persist a new batch of suggestions (status = 'pending').
 * Avoids adding duplicates by id.
 */
export function saveSuggestions(incoming: PersistedSuggestion[]): void {
  aiSuggestionRepository.saveAll(incoming);
}

/**
 * Update the status of a single suggestion.
 * Returns true if the suggestion was found and updated.
 */
export function updateSuggestionStatus(
  id: string,
  status: PersistedSuggestion['status']
): boolean {
  return aiSuggestionRepository.updateStatus(id, status);
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
  aiSuggestionRepository.clearAll();
}
