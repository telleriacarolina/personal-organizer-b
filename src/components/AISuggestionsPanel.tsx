import { MagicWand, ShieldCheck, Sparkle, WarningCircle } from '@phosphor-icons/react';
import { AIInsightAction, WidgetAIState } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface AISuggestionsPanelProps {
  title: string;
  featureLabel: string;
  state?: WidgetAIState;
  isGenerating: boolean;
  isStale: boolean;
  onGenerate: () => void;
  onApplyAction: (insightId: string, action: AIInsightAction) => void;
  onDismissInsight: (insightId: string) => void;
}

export function AISuggestionsPanel({
  title,
  featureLabel,
  state,
  isGenerating,
  isStale,
  onGenerate,
  onApplyAction,
  onDismissInsight,
}: AISuggestionsPanelProps) {
  const visibleInsights = state?.insights.filter((insight) => insight.status !== 'dismissed') || [];

  return (
    <Card className="border-primary/20 bg-primary/5 p-4 gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkle size={18} className="text-primary" weight="duotone" />
            <h3 className="font-medium text-sm">{title}</h3>
            {isStale && visibleInsights.length > 0 && (
              <Badge variant="outline" className="text-xs">
                Stale
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Generate → Review → Apply or Dismiss. AI never updates {featureLabel} data automatically.
          </p>
          {state && (
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary" className="gap-1">
                <MagicWand size={12} />
                {state.providerLabel}
              </Badge>
              <Badge variant="outline" className="gap-1">
                <ShieldCheck size={12} />
                {state.privacyMode === 'remote' ? 'Shares selected data' : 'Stays in browser'}
              </Badge>
            </div>
          )}
        </div>
        <Button onClick={onGenerate} disabled={isGenerating} size="sm" className="gap-2">
          <Sparkle size={14} />
          {isGenerating ? 'Generating...' : visibleInsights.length > 0 ? 'Regenerate' : 'Generate'}
        </Button>
      </div>

      {state?.error && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-muted-foreground">
          <WarningCircle size={16} className="mt-0.5 text-amber-600" />
          <span>{state.error}</span>
        </div>
      )}

      {state?.dataSummary && state.dataSummary.length > 0 && (
        <div className="rounded-lg border bg-background p-3">
          <p className="text-xs font-medium">Data reviewed for this request</p>
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            {state.dataSummary.map((entry) => (
              <li key={entry}>• {entry}</li>
            ))}
          </ul>
        </div>
      )}

      {visibleInsights.length === 0 ? (
        <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
          Generate suggestions to see prioritization, extraction, and planning recommendations.
        </div>
      ) : (
        <div className="space-y-3">
          {visibleInsights.map((insight) => (
            <div key={insight.id} className="rounded-lg border bg-background p-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-sm">{insight.title}</p>
                <Badge variant={insight.status === 'applied' ? 'default' : 'secondary'} className="text-[10px]">
                  {Math.round(insight.confidence * 100)}% confidence
                </Badge>
                {insight.status === 'applied' && (
                  <Badge variant="outline" className="text-[10px]">
                    Applied
                  </Badge>
                )}
              </div>
              <p className="mt-2 text-sm">{insight.summary}</p>
              <p className="mt-1 text-xs text-muted-foreground">{insight.rationale}</p>
              {insight.bullets && insight.bullets.length > 0 && (
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {insight.bullets.map((bullet) => (
                    <li key={bullet}>• {bullet}</li>
                  ))}
                </ul>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {(insight.actions || []).map((action) => (
                  <Button
                    key={action.id}
                    size="sm"
                    variant="outline"
                    onClick={() => onApplyAction(insight.id, action)}
                    disabled={insight.status === 'applied'}
                  >
                    {action.label}
                  </Button>
                ))}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onDismissInsight(insight.id)}
                  className="text-muted-foreground"
                >
                  Dismiss
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
