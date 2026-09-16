// ---------------------------------------------------------------------------
// AISuggestionPanel – Generate → Review → Apply/Dismiss UI (Phase 1)
// ---------------------------------------------------------------------------

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkle, CheckCircle, XCircle, ArrowClockwise, CaretDown, CaretUp } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import { aiService } from '@/lib/ai-service';
import { saveSuggestions, applySuggestion, dismissSuggestion } from '@/lib/ai-storage';
import type { AISuggestion, AIRequestContext, PersistedSuggestion } from '@/types/ai';
import { v4 as uuidv4 } from 'uuid';

interface AISuggestionPanelProps {
  context: AIRequestContext['context'];
  /** Serialisable snapshot of the widget's current data for the AI to reason about */
  data: unknown;
  /** Called when the user clicks Apply on a suggestion */
  onApply?: (suggestion: AISuggestion) => void;
  className?: string;
}

type PanelState = 'idle' | 'loading' | 'review' | 'empty';

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const variant =
    pct >= 80 ? 'default' : pct >= 50 ? 'secondary' : 'outline';
  return (
    <Badge variant={variant} className="text-xs tabular-nums">
      {pct}% confidence
    </Badge>
  );
}

export function AISuggestionPanel({
  context,
  data,
  onApply,
  className = '',
}: AISuggestionPanelProps) {
  const [panelState, setPanelState] = useState<PanelState>('idle');
  const [suggestions, setSuggestions] = useState<PersistedSuggestion[]>([]);
  const [expanded, setExpanded] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async () => {
    setError(null);
    setPanelState('loading');
    setExpanded(true);

    try {
      const raw = await aiService.generateSuggestions({ context, data, maxSuggestions: 3 });
      if (raw.length === 0) {
        setPanelState('empty');
        return;
      }
      const persisted: PersistedSuggestion[] = raw.map((s) => ({
        ...s,
        id: s.id || uuidv4(),
        status: 'pending',
      }));
      saveSuggestions(persisted);
      setSuggestions(persisted);
      setPanelState('review');
    } catch {
      setError('Could not generate suggestions. Please try again.');
      setPanelState('idle');
    }
  }, [context, data]);

  const handleApply = (suggestion: PersistedSuggestion) => {
    applySuggestion(suggestion.id);
    setSuggestions((prev) =>
      prev.map((s) => (s.id === suggestion.id ? { ...s, status: 'applied' } : s))
    );
    onApply?.(suggestion);
  };

  const handleDismiss = (id: string) => {
    dismissSuggestion(id);
    setSuggestions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: 'dismissed' } : s))
    );
  };

  const pendingCount = suggestions.filter((s) => s.status === 'pending').length;

  if (!aiService.isEnabled) return null;

  return (
    <div className={`rounded-lg border border-primary/20 bg-primary/5 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2">
          <Sparkle size={16} className="text-primary" weight="fill" />
          <span className="text-sm font-medium text-foreground">AI Suggestions</span>
          {panelState === 'review' && pendingCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {pendingCount}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 gap-1 text-xs px-2"
            onClick={generate}
            disabled={panelState === 'loading'}
            title="Generate suggestions"
          >
            <ArrowClockwise
              size={13}
              className={panelState === 'loading' ? 'animate-spin' : ''}
            />
            {panelState === 'idle' || panelState === 'empty' ? 'Generate' : 'Refresh'}
          </Button>
          {panelState === 'review' && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              onClick={() => setExpanded((v) => !v)}
              title={expanded ? 'Collapse' : 'Expand'}
            >
              {expanded ? <CaretUp size={13} /> : <CaretDown size={13} />}
            </Button>
          )}
        </div>
      </div>

      {/* Body */}
      <AnimatePresence initial={false}>
        {error && (
          <motion.p
            key="error"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-3 pb-2 text-xs text-destructive"
          >
            {error}
          </motion.p>
        )}

        {panelState === 'loading' && (
          <motion.div
            key="loading"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-3 pb-3 flex items-center gap-2 text-xs text-muted-foreground"
          >
            <ArrowClockwise size={13} className="animate-spin" />
            Thinking…
          </motion.div>
        )}

        {panelState === 'empty' && (
          <motion.p
            key="empty"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-3 pb-3 text-xs text-muted-foreground"
          >
            No suggestions available for this context right now.
          </motion.p>
        )}

        {panelState === 'review' && expanded && (
          <motion.ul
            key="list"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-3 pb-3 space-y-2"
          >
            {suggestions.map((suggestion) => (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                onApply={handleApply}
                onDismiss={handleDismiss}
              />
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SuggestionCard
// ---------------------------------------------------------------------------

interface SuggestionCardProps {
  suggestion: PersistedSuggestion;
  onApply: (s: PersistedSuggestion) => void;
  onDismiss: (id: string) => void;
}

function SuggestionCard({ suggestion, onApply, onDismiss }: SuggestionCardProps) {
  const [showRationale, setShowRationale] = useState(false);
  const isDone = suggestion.status !== 'pending';

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: isDone ? 0.5 : 1, y: 0 }}
      className={`rounded-md border bg-background p-2.5 text-sm ${
        isDone ? 'pointer-events-none' : ''
      }`}
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 space-y-1">
          <p className="text-foreground leading-snug">{suggestion.text}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <ConfidenceBadge confidence={suggestion.confidence} />
            {suggestion.status === 'applied' && (
              <Badge variant="default" className="text-xs gap-1">
                <CheckCircle size={10} weight="fill" /> Applied
              </Badge>
            )}
            {suggestion.status === 'dismissed' && (
              <Badge variant="outline" className="text-xs gap-1">
                <XCircle size={10} /> Dismissed
              </Badge>
            )}
            <button
              onClick={() => setShowRationale((v) => !v)}
              className="text-xs text-muted-foreground underline-offset-2 hover:underline"
            >
              {showRationale ? 'Hide reason' : 'Why?'}
            </button>
          </div>
          <AnimatePresence>
            {showRationale && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="text-xs text-muted-foreground italic mt-1"
              >
                {suggestion.rationale}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {!isDone && (
          <div className="flex flex-col gap-1 shrink-0">
            <Button
              size="sm"
              variant="default"
              className="h-7 text-xs px-2 gap-1"
              onClick={() => onApply(suggestion)}
            >
              <CheckCircle size={13} weight="fill" />
              Apply
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs px-2 gap-1 text-muted-foreground"
              onClick={() => onDismiss(suggestion.id)}
            >
              <XCircle size={13} />
              Dismiss
            </Button>
          </div>
        )}
      </div>
    </motion.li>
  );
}
