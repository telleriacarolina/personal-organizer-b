// ---------------------------------------------------------------------------
// AI Service – app-level boundary (Phase 1)
//
// Reads VITE_ORGANIZER_AI_MODE at startup (defaults to 'off').
// Exposes a singleton `aiService` that delegates to the active provider.
// The app is fully functional when mode === 'off'.
// ---------------------------------------------------------------------------

import { v4 as uuidv4 } from 'uuid';
import type {
  AIConfig,
  AIMode,
  AIProvider,
  AIRequestContext,
  AISuggestion,
} from '@/types/ai';
import { DEFAULT_AI_CONFIG } from '@/types/ai';

// ---------------------------------------------------------------------------
// Disabled provider – returns nothing, is always "available"
// ---------------------------------------------------------------------------

class DisabledProvider implements AIProvider {
  readonly mode: AIMode = 'off';

  isAvailable(): boolean {
    return true;
  }

  async generateSuggestions(_request: AIRequestContext): Promise<AISuggestion[]> {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Mock provider – returns deterministic demo suggestions
// ---------------------------------------------------------------------------

const MOCK_SUGGESTIONS: Record<string, string[]> = {
  tasks: [
    'Break this task into smaller sub-steps to make progress more visible.',
    'Consider setting a due date to keep this task on track.',
  ],
  notes: [
    'This note contains action items – consider converting them to tasks.',
    'Adding tags to this note will make it easier to find later.',
  ],
  habits: [
    'Try habit stacking: pair this habit with an existing routine.',
    'Your completion rate improves when you log habits at the same time each day.',
  ],
  goals: [
    'Define a measurable milestone to track progress toward this goal.',
    'Breaking this goal into 30-day chunks increases completion rates.',
  ],
  calendar: [
    'You have back-to-back events tomorrow – consider adding a buffer.',
    'This recurring event could be shortened based on recent patterns.',
  ],
  shopping: [
    'Several items share the same store – grouping them saves a trip.',
    'You tend to restock this category every two weeks.',
  ],
  work: [
    'Your upcoming deadline overlaps with a high-priority client slot.',
    'Batching similar errands into one outing saves ~30 minutes.',
  ],
  'daily-focus': [
    'Starting with your highest-priority task sets a productive tone.',
    'You completed all focus items yesterday – great momentum!',
  ],
  general: [
    'Your organizer is looking great – consider reviewing older goals.',
    'You have uncompleted habits from last week worth revisiting.',
  ],
};

function buildMockSuggestions(request: AIRequestContext): AISuggestion[] {
  const texts = MOCK_SUGGESTIONS[request.context] ?? MOCK_SUGGESTIONS.general;
  const max = request.maxSuggestions ?? 2;
  return texts.slice(0, max).map((text, i) => ({
    id: uuidv4(),
    context: request.context,
    text,
    confidence: 0.7 + i * 0.05,
    rationale: `Mock provider – demonstration suggestion for context "${request.context}".`,
    generatedAt: new Date().toISOString(),
  }));
}

class MockProvider implements AIProvider {
  readonly mode: AIMode = 'mock';

  isAvailable(): boolean {
    return true;
  }

  async generateSuggestions(request: AIRequestContext): Promise<AISuggestion[]> {
    // Simulate a small async delay so the UI can show a loading state
    await new Promise((resolve) => setTimeout(resolve, 350));
    return buildMockSuggestions(request);
  }
}

// ---------------------------------------------------------------------------
// Normalisers
// ---------------------------------------------------------------------------

/**
 * Clamps a raw provider confidence value to [0, 1].
 * This normalises values from different providers into a consistent range.
 */
export function normalizeConfidence(raw: number): number {
  if (!Number.isFinite(raw)) return 0;
  return Math.max(0, Math.min(1, raw));
}

/**
 * Ensures every required field of an AISuggestion is present and valid.
 * Returns a normalised copy, or null if the suggestion is too malformed to use.
 */
export function normalizeSuggestion(raw: Partial<AISuggestion>): AISuggestion | null {
  if (!raw.text?.trim()) return null;
  return {
    id: raw.id ?? uuidv4(),
    context: raw.context ?? 'general',
    text: raw.text.trim(),
    payload: raw.payload,
    confidence: normalizeConfidence(raw.confidence ?? 0),
    rationale: raw.rationale?.trim() || 'No rationale provided.',
    generatedAt: raw.generatedAt ?? new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// AIService – singleton boundary
// ---------------------------------------------------------------------------

const CONFIG_STORAGE_KEY = 'organizer-ai-config';

function readConfigFromStorage(): AIConfig {
  if (typeof window === 'undefined') return { ...DEFAULT_AI_CONFIG };
  try {
    const raw = window.localStorage.getItem(CONFIG_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_AI_CONFIG };
    return { ...DEFAULT_AI_CONFIG, ...(JSON.parse(raw) as Partial<AIConfig>) };
  } catch {
    return { ...DEFAULT_AI_CONFIG };
  }
}

function resolveInitialMode(): AIMode {
  const envMode = import.meta.env.VITE_ORGANIZER_AI_MODE as string | undefined;
  if (envMode === 'mock' || envMode === 'openai') return envMode;
  // Fall back to the persisted user preference
  const stored = readConfigFromStorage();
  return stored.mode;
}

function buildProvider(mode: AIMode): AIProvider {
  switch (mode) {
    case 'mock':
      return new MockProvider();
    case 'openai':
      // OpenAI provider is planned but not yet implemented (Phase 2+).
      // Return a disabled provider so isEnabled stays false and the UI
      // reflects that no provider is actually available.
      return new DisabledProvider();
    case 'off':
    default:
      return new DisabledProvider();
  }
}

export class AIService {
  private provider: AIProvider;
  private config: AIConfig;

  constructor() {
    const mode = resolveInitialMode();
    this.config = { ...readConfigFromStorage(), mode };
    this.provider = buildProvider(mode);
  }

  get currentConfig(): AIConfig {
    return { ...this.config };
  }

  get isEnabled(): boolean {
    return this.config.mode !== 'off' && this.provider.isAvailable() && this.provider.mode !== 'off';
  }

  configure(updates: Partial<AIConfig>): void {
    this.config = { ...this.config, ...updates };
    this.provider = buildProvider(this.config.mode);
    if (typeof window !== 'undefined') {
      // Never persist the API key to localStorage
      const { apiKey: _ignored, ...safe } = this.config;
      window.localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(safe));
    }
  }

  async generateSuggestions(request: AIRequestContext): Promise<AISuggestion[]> {
    if (!this.isEnabled) return [];
    if (!this.provider.isAvailable()) return [];

    const raw = await this.provider.generateSuggestions(request);
    // Normalise every suggestion that comes back from the provider
    return raw
      .map((s) => normalizeSuggestion(s))
      .filter((s): s is AISuggestion => s !== null);
  }
}

/** App-wide singleton – import this wherever AI suggestions are needed. */
export const aiService = new AIService();
