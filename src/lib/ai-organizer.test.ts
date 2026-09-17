// ---------------------------------------------------------------------------
// Tests – ai-organizer: hash, provider selection, state generation, insight updates
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  buildAIInputHash,
  generateWidgetAIState,
  updateAIInsightStatus,
  getOrganizerAIProvider,
} from './ai-organizer';
import type { AIProviderRequest } from './ai-organizer';
import type { AIInsight } from '@/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(overrides: Partial<AIProviderRequest> = {}): AIProviderRequest {
  return {
    widgetId: 'widget-1',
    feature: 'tasks',
    input: { items: ['a', 'b'] },
    dataSummary: ['2 tasks pending'],
    ...overrides,
  };
}

function makeInsight(overrides: Partial<AIInsight> = {}): AIInsight {
  return {
    id: 'insight-1',
    kind: 'system',
    title: 'Test',
    summary: 'Summary',
    rationale: 'Rationale',
    confidence: 0.9,
    generatedAt: Date.now(),
    status: 'active',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// buildAIInputHash
// ---------------------------------------------------------------------------

describe('buildAIInputHash', () => {
  it('returns a string', () => {
    expect(typeof buildAIInputHash({ x: 1 })).toBe('string');
  });

  it('returns the same hash for identical inputs', () => {
    const a = buildAIInputHash({ tasks: ['buy milk', 'call doctor'] });
    const b = buildAIInputHash({ tasks: ['buy milk', 'call doctor'] });
    expect(a).toBe(b);
  });

  it('returns different hashes for different inputs', () => {
    const a = buildAIInputHash({ tasks: ['buy milk'] });
    const b = buildAIInputHash({ tasks: ['call doctor'] });
    expect(a).not.toBe(b);
  });

  it('handles null without throwing', () => {
    expect(() => buildAIInputHash(null)).not.toThrow();
  });

  it('handles empty objects', () => {
    expect(typeof buildAIInputHash({})).toBe('string');
  });
});

// ---------------------------------------------------------------------------
// getOrganizerAIProvider – env-based resolution
// ---------------------------------------------------------------------------

describe('getOrganizerAIProvider', () => {
  it('returns off provider when mode is off', () => {
    vi.stubEnv('VITE_ORGANIZER_AI_MODE', 'off');
    const provider = getOrganizerAIProvider();
    expect(provider.mode).toBe('off');
    vi.unstubAllEnvs();
  });

  it('returns mock provider when mode is mock', () => {
    vi.stubEnv('VITE_ORGANIZER_AI_MODE', 'mock');
    const provider = getOrganizerAIProvider();
    expect(provider.mode).toBe('mock');
    vi.unstubAllEnvs();
  });

  it('returns api provider when mode is api', () => {
    vi.stubEnv('VITE_ORGANIZER_AI_MODE', 'api');
    const provider = getOrganizerAIProvider();
    expect(provider.mode).toBe('api');
    vi.unstubAllEnvs();
  });

  it('returns off provider when mode is absent', () => {
    vi.stubEnv('VITE_ORGANIZER_AI_MODE', '');
    const provider = getOrganizerAIProvider();
    expect(provider.mode).toBe('off');
    vi.unstubAllEnvs();
  });
});

// ---------------------------------------------------------------------------
// generateWidgetAIState – all provider modes
// ---------------------------------------------------------------------------

describe('generateWidgetAIState', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns a WidgetAIState with correct widgetId and feature (off mode)', async () => {
    vi.stubEnv('VITE_ORGANIZER_AI_MODE', 'off');
    const req = makeRequest();
    const state = await generateWidgetAIState(req);
    expect(state.widgetId).toBe('widget-1');
    expect(state.feature).toBe('tasks');
    expect(state.providerMode).toBe('off');
    expect(Array.isArray(state.insights)).toBe(true);
  });

  it('sets sourceHash from the request input', async () => {
    vi.stubEnv('VITE_ORGANIZER_AI_MODE', 'off');
    const req = makeRequest({ input: { items: [1, 2, 3] } });
    const state = await generateWidgetAIState(req);
    expect(state.sourceHash).toBe(buildAIInputHash(req.input));
  });

  it('populates dataSummary from the request', async () => {
    vi.stubEnv('VITE_ORGANIZER_AI_MODE', 'off');
    const req = makeRequest({ dataSummary: ['item A', 'item B'] });
    const state = await generateWidgetAIState(req);
    expect(state.dataSummary).toEqual(['item A', 'item B']);
  });

  it('returns a state in mock mode with a non-empty insight', async () => {
    vi.stubEnv('VITE_ORGANIZER_AI_MODE', 'mock');
    const req = makeRequest();
    const state = await generateWidgetAIState(req);
    expect(state.providerMode).toBe('mock');
    expect(state.insights.length).toBeGreaterThan(0);
  });

  it('returns an error in api mode (Phase 1 placeholder)', async () => {
    vi.stubEnv('VITE_ORGANIZER_AI_MODE', 'api');
    const req = makeRequest();
    const state = await generateWidgetAIState(req);
    expect(state.providerMode).toBe('api');
    expect(typeof state.error).toBe('string');
    expect(state.error!.length).toBeGreaterThan(0);
  });

  it('records a generatedAt timestamp', async () => {
    vi.stubEnv('VITE_ORGANIZER_AI_MODE', 'off');
    const before = Date.now();
    const state = await generateWidgetAIState(makeRequest());
    expect(state.generatedAt).toBeGreaterThanOrEqual(before);
  });
});

// ---------------------------------------------------------------------------
// updateAIInsightStatus
// ---------------------------------------------------------------------------

describe('updateAIInsightStatus', () => {
  it('sets the target insight to applied', async () => {
    vi.stubEnv('VITE_ORGANIZER_AI_MODE', 'off');
    const state = await generateWidgetAIState(makeRequest());
    const insight = state.insights[0];
    const updated = updateAIInsightStatus(state, insight.id, 'applied');
    expect(updated.insights.find((i) => i.id === insight.id)?.status).toBe('applied');
  });

  it('sets the target insight to dismissed', async () => {
    vi.stubEnv('VITE_ORGANIZER_AI_MODE', 'off');
    const state = await generateWidgetAIState(makeRequest());
    const insight = state.insights[0];
    const updated = updateAIInsightStatus(state, insight.id, 'dismissed');
    expect(updated.insights.find((i) => i.id === insight.id)?.status).toBe('dismissed');
  });

  it('does not mutate other insights', async () => {
    vi.stubEnv('VITE_ORGANIZER_AI_MODE', 'mock');
    const state = await generateWidgetAIState(makeRequest());
    const [first, ...rest] = state.insights;
    const updated = updateAIInsightStatus(state, first.id, 'applied');
    // All other insights retain their original status
    rest.forEach((original) => {
      const inUpdated = updated.insights.find((i) => i.id === original.id);
      expect(inUpdated?.status).toBe(original.status);
    });
  });

  it('returns a new state object (immutability)', async () => {
    vi.stubEnv('VITE_ORGANIZER_AI_MODE', 'off');
    const state = await generateWidgetAIState(makeRequest());
    const updated = updateAIInsightStatus(state, state.insights[0].id, 'applied');
    expect(updated).not.toBe(state);
  });

  it('is a no-op for an unknown insight id', async () => {
    vi.stubEnv('VITE_ORGANIZER_AI_MODE', 'off');
    const state = await generateWidgetAIState(makeRequest());
    const updated = updateAIInsightStatus(state, 'does-not-exist', 'applied');
    expect(updated.insights).toEqual(state.insights);
  });

  it('works with a manually assembled state containing multiple insights', () => {
    const state = {
      widgetId: 'w1',
      feature: 'tasks' as const,
      generatedAt: Date.now(),
      sourceHash: 'abc',
      providerMode: 'mock' as const,
      providerLabel: 'Mock',
      privacyMode: 'local-only' as const,
      model: 'test',
      dataSummary: [],
      insights: [
        makeInsight({ id: 'i1', status: 'active' }),
        makeInsight({ id: 'i2', status: 'active' }),
      ],
    };
    const updated = updateAIInsightStatus(state, 'i1', 'dismissed');
    expect(updated.insights[0].status).toBe('dismissed');
    expect(updated.insights[1].status).toBe('active');
  });
});
