// ---------------------------------------------------------------------------
// AI Foundation – shared types (Phase 1)
// ---------------------------------------------------------------------------

/** The mode the AI service operates in. */
export type AIMode = 'off' | 'mock' | 'openai';

/** A single normalised AI suggestion returned by any provider. */
export interface AISuggestion {
  id: string;
  /** Which feature area generated this suggestion */
  context: 'tasks' | 'notes' | 'habits' | 'goals' | 'calendar' | 'shopping' | 'work' | 'daily-focus' | 'general';
  /** Human-readable suggestion text */
  text: string;
  /** Optional structured payload that the apply handler can consume */
  payload?: unknown;
  /** 0–1 confidence score from the provider */
  confidence: number;
  /** Provider's explanation of why this suggestion was made */
  rationale: string;
  /** ISO timestamp when this suggestion was generated */
  generatedAt: string;
}

/** Persisted suggestion with user-action state */
export interface PersistedSuggestion extends AISuggestion {
  status: 'pending' | 'applied' | 'dismissed';
  /** ISO timestamp of the last status change */
  statusUpdatedAt?: string;
}

// ---------------------------------------------------------------------------
// Provider interface
// ---------------------------------------------------------------------------

export interface AIRequestContext {
  /** Which widget / feature is requesting suggestions */
  context: AISuggestion['context'];
  /** Serialisable data that the provider can reason about */
  data: unknown;
  /** Maximum number of suggestions to return (hint) */
  maxSuggestions?: number;
}

export interface AIProvider {
  readonly mode: AIMode;
  /** Returns true when the provider is ready to accept requests */
  isAvailable(): boolean;
  /**
   * Generate suggestions for the given context.
   * Implementations MUST NOT throw – they should return an empty array on failure.
   */
  generateSuggestions(request: AIRequestContext): Promise<AISuggestion[]>;
}

// ---------------------------------------------------------------------------
// Configuration (persisted in localStorage / env)
// ---------------------------------------------------------------------------

export interface AIConfig {
  mode: AIMode;
  /** User-visible label for the current provider */
  providerLabel: string;
  /** Whether the user has opted in to sending data to an external AI service */
  privacyAccepted: boolean;
  /** Optional API key for real providers (never committed / logged) */
  apiKey?: string;
}

export const DEFAULT_AI_CONFIG: AIConfig = {
  mode: 'off',
  providerLabel: 'Disabled',
  privacyAccepted: false,
};
