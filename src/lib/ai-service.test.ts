// ---------------------------------------------------------------------------
// Tests – AI service, normalisers, storage, disabled-provider, apply/dismiss
// ---------------------------------------------------------------------------

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Normalisation helpers
// ---------------------------------------------------------------------------

import { normalizeConfidence, normalizeSuggestion, AIService } from './ai-service';

describe('normalizeConfidence', () => {
  it('clamps values above 1', () => {
    expect(normalizeConfidence(1.5)).toBe(1);
  });

  it('clamps values below 0', () => {
    expect(normalizeConfidence(-0.3)).toBe(0);
  });

  it('passes through values in range', () => {
    expect(normalizeConfidence(0.75)).toBe(0.75);
  });

  it('returns 0 for NaN', () => {
    expect(normalizeConfidence(NaN)).toBe(0);
  });

  it('returns 0 for Infinity', () => {
    expect(normalizeConfidence(Infinity)).toBe(0);
  });
});

describe('normalizeSuggestion', () => {
  it('returns null for missing text', () => {
    expect(normalizeSuggestion({ confidence: 0.8 })).toBeNull();
  });

  it('returns null for blank text', () => {
    expect(normalizeSuggestion({ text: '   ' })).toBeNull();
  });

  it('trims text', () => {
    const result = normalizeSuggestion({ text: '  hello  ' });
    expect(result?.text).toBe('hello');
  });

  it('assigns a fallback rationale', () => {
    const result = normalizeSuggestion({ text: 'do something' });
    expect(result?.rationale).toBe('No rationale provided.');
  });

  it('clamps confidence', () => {
    const result = normalizeSuggestion({ text: 'ok', confidence: 999 });
    expect(result?.confidence).toBe(1);
  });

  it('preserves provided fields', () => {
    const result = normalizeSuggestion({
      text: 'ok',
      id: 'abc',
      context: 'tasks',
      confidence: 0.6,
      rationale: 'because',
      generatedAt: '2024-01-01T00:00:00Z',
    });
    expect(result?.id).toBe('abc');
    expect(result?.context).toBe('tasks');
    expect(result?.rationale).toBe('because');
  });
});

// ---------------------------------------------------------------------------
// AIService – disabled provider
// ---------------------------------------------------------------------------

describe('AIService disabled provider', () => {
  it('returns empty suggestions when mode is off', async () => {
    const service = new AIService();
    // Force off mode regardless of env
    service.configure({ mode: 'off', providerLabel: 'Disabled', privacyAccepted: false });
    const results = await service.generateSuggestions({ context: 'tasks', data: [] });
    expect(results).toEqual([]);
  });

  it('isEnabled returns false when mode is off', () => {
    const service = new AIService();
    service.configure({ mode: 'off', providerLabel: 'Disabled', privacyAccepted: false });
    expect(service.isEnabled).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// AIService – mock provider
// ---------------------------------------------------------------------------

describe('AIService mock provider', () => {
  it('returns suggestions when mode is mock', async () => {
    const service = new AIService();
    service.configure({ mode: 'mock', providerLabel: 'Demo', privacyAccepted: true });
    const results = await service.generateSuggestions({ context: 'tasks', data: [] });
    expect(results.length).toBeGreaterThan(0);
  });

  it('normalises every suggestion (confidence in [0,1])', async () => {
    const service = new AIService();
    service.configure({ mode: 'mock', providerLabel: 'Demo', privacyAccepted: true });
    const results = await service.generateSuggestions({ context: 'general', data: {} });
    for (const s of results) {
      expect(s.confidence).toBeGreaterThanOrEqual(0);
      expect(s.confidence).toBeLessThanOrEqual(1);
      expect(s.text.trim()).not.toBe('');
      expect(s.rationale).toBeTruthy();
    }
  });

  it('isEnabled returns true when mode is mock', () => {
    const service = new AIService();
    service.configure({ mode: 'mock', providerLabel: 'Demo', privacyAccepted: true });
    expect(service.isEnabled).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// AI Storage – persistence, apply, dismiss
// ---------------------------------------------------------------------------

import {
  getAllSuggestions,
  getPendingSuggestions,
  saveSuggestions,
  applySuggestion,
  dismissSuggestion,
  clearAllSuggestions,
} from './ai-storage';
import type { PersistedSuggestion } from '@/types/ai';

function makePersistedSuggestion(overrides: Partial<PersistedSuggestion> = {}): PersistedSuggestion {
  return {
    id: 'test-id-1',
    context: 'tasks',
    text: 'Test suggestion',
    confidence: 0.8,
    rationale: 'Test rationale',
    generatedAt: new Date().toISOString(),
    status: 'pending',
    ...overrides,
  };
}

// Mock localStorage for Node environment
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

describe('ai-storage persistence', () => {
  it('starts empty', () => {
    expect(getAllSuggestions()).toEqual([]);
  });

  it('saves suggestions', () => {
    const s = makePersistedSuggestion();
    saveSuggestions([s]);
    expect(getAllSuggestions()).toHaveLength(1);
  });

  it('deduplicates by id', () => {
    const s = makePersistedSuggestion();
    saveSuggestions([s]);
    saveSuggestions([s]);
    expect(getAllSuggestions()).toHaveLength(1);
  });

  it('returns only pending suggestions via getPendingSuggestions', () => {
    const pending = makePersistedSuggestion({ id: 'p1', status: 'pending' });
    const applied = makePersistedSuggestion({ id: 'a1', status: 'applied' });
    saveSuggestions([pending, applied]);
    const result = getPendingSuggestions();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('p1');
  });

  it('clearAllSuggestions empties the store', () => {
    saveSuggestions([makePersistedSuggestion()]);
    clearAllSuggestions();
    expect(getAllSuggestions()).toEqual([]);
  });
});

describe('ai-storage apply/dismiss', () => {
  it('applySuggestion updates status to applied', () => {
    const s = makePersistedSuggestion({ id: 'x1' });
    saveSuggestions([s]);
    const found = applySuggestion('x1');
    expect(found).toBe(true);
    const all = getAllSuggestions();
    expect(all[0].status).toBe('applied');
    expect(all[0].statusUpdatedAt).toBeTruthy();
  });

  it('dismissSuggestion updates status to dismissed', () => {
    const s = makePersistedSuggestion({ id: 'x2' });
    saveSuggestions([s]);
    const found = dismissSuggestion('x2');
    expect(found).toBe(true);
    const all = getAllSuggestions();
    expect(all[0].status).toBe('dismissed');
  });

  it('applySuggestion returns false for unknown id', () => {
    expect(applySuggestion('does-not-exist')).toBe(false);
  });

  it('dismissSuggestion returns false for unknown id', () => {
    expect(dismissSuggestion('does-not-exist')).toBe(false);
  });
});
