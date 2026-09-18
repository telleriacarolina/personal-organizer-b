import { AIInsight, AIWidgetFeature, WidgetAIState } from '@/types';
import { createId } from '@/lib/id';

export interface AIProviderRequest<TInput = unknown> {
  widgetId: string;
  feature: AIWidgetFeature;
  input: TInput;
  dataSummary: string[];
}

export interface OrganizerAIProvider {
  mode: WidgetAIState['providerMode'];
  label: string;
  privacyMode: WidgetAIState['privacyMode'];
  model: string;
  generate<TInput>(request: AIProviderRequest<TInput>): Promise<WidgetAIState>;
}

type AIConfig = {
  mode: WidgetAIState['providerMode'];
  providerLabel?: string;
  apiBaseUrl?: string;
};

const hashString = (value: string) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return String(hash);
};

export const buildAIInputHash = (value: unknown) => hashString(JSON.stringify(value));

const createState = (
  provider: OrganizerAIProvider,
  request: AIProviderRequest,
  insights: AIInsight[],
  error?: string,
): WidgetAIState => ({
  widgetId: request.widgetId,
  feature: request.feature,
  generatedAt: Date.now(),
  sourceHash: buildAIInputHash(request.input),
  providerMode: provider.mode,
  providerLabel: provider.label,
  privacyMode: provider.privacyMode,
  model: provider.model,
  dataSummary: request.dataSummary,
  insights,
  error,
});

const createSystemInsight = (
  request: AIProviderRequest,
  title: string,
  summary: string,
  rationale: string,
): AIInsight => {
  const generatedAt = Date.now();

  return {
    id: createId('ai-insight'),
    kind: 'system',
    title,
    summary,
    rationale,
    confidence: 0.99,
    generatedAt,
    status: 'active',
    bullets: request.dataSummary,
  };
};

class DisabledAIProvider implements OrganizerAIProvider {
  mode: WidgetAIState['providerMode'] = 'off';
  label = 'AI disabled';
  privacyMode: WidgetAIState['privacyMode'] = 'local-only';
  model = 'disabled';

  async generate<TInput>(request: AIProviderRequest<TInput>) {
    return createState(this, request, [
      createSystemInsight(
        request,
        'AI is disabled',
        'Configure a provider or enable mock mode to preview the AI review workflow.',
        `No ${request.feature} data will be sent anywhere while AI is disabled.`
      ),
    ]);
  }
}

class MockAIProvider implements OrganizerAIProvider {
  mode: WidgetAIState['providerMode'] = 'mock';
  label = 'Mock AI';
  privacyMode: WidgetAIState['privacyMode'] = 'local-only';
  model = 'mock-organizer-v1';

  async generate<TInput>(request: AIProviderRequest<TInput>) {
    return createState(this, request, [
      createSystemInsight(
        request,
        'Mock provider active',
        `The ${request.feature} review UI is working in demo mode.`,
        'This phase validates provider selection, persistence, privacy messaging, and the review shell before live feature logic is added.'
      ),
    ]);
  }
}

class RealAIProviderPlaceholder implements OrganizerAIProvider {
  mode: WidgetAIState['providerMode'] = 'api';
  label: string;
  privacyMode: WidgetAIState['privacyMode'] = 'remote';
  model = 'configured-provider';

  constructor(label: string) {
    this.label = label;
  }

  async generate<TInput>(request: AIProviderRequest<TInput>) {
    return createState(this, request, [
      createSystemInsight(
        request,
        'Real provider configured',
        'External AI is configured but not yet enabled in Phase 1.',
        `When Phase 2 is implemented, ${request.feature} requests will send only the reviewed data summary shown here to the configured provider.`
      ),
    ], 'Phase 1 intentionally stops before live provider requests.');
  }
}

const providerRegistry = {
  off: new DisabledAIProvider(),
  mock: new MockAIProvider(),
};

const getAIConfig = (): AIConfig => ({
  mode: (import.meta.env.VITE_ORGANIZER_AI_MODE as WidgetAIState['providerMode'] | undefined) ?? 'off',
  providerLabel: import.meta.env.VITE_ORGANIZER_AI_PROVIDER as string | undefined,
  apiBaseUrl: import.meta.env.VITE_ORGANIZER_AI_API_URL as string | undefined,
});

export const getOrganizerAIProvider = (): OrganizerAIProvider => {
  const config = getAIConfig();
  if (config.mode === 'mock') {
    return providerRegistry.mock;
  }
  if (config.mode === 'api') {
    return new RealAIProviderPlaceholder(config.providerLabel || 'Real AI provider');
  }
  return providerRegistry.off;
};

export const generateWidgetAIState = async <TInput>(request: AIProviderRequest<TInput>) =>
  getOrganizerAIProvider().generate(request);

export const updateAIInsightStatus = (
  state: WidgetAIState,
  insightId: string,
  status: AIInsight['status'],
): WidgetAIState => ({
  ...state,
  insights: state.insights.map((insight) =>
    insight.id === insightId ? { ...insight, status } : insight
  ),
});
