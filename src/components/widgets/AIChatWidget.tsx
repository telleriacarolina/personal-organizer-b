import { useState, useRef, useEffect } from 'react';
import { WidgetContainer } from '@/components/WidgetContainer';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkle, PaperPlaneTilt, CheckCircle, XCircle, Robot } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import { AIChatMessage, AIInsight, WidgetSize } from '@/types';
import { generateWidgetAIState } from '@/lib/ai-organizer';
import { toast } from 'sonner';
import { CollectionMutation, appendItem, replaceItems } from '@/lib/atomic-state';
import { createId } from '@/lib/id';
import {
  beginChatRequest,
  clearChatRequestState,
  createChatRequestState,
  isChatRequestCurrent,
} from '@/lib/ai-chat-session';

interface AIChatWidgetProps {
  widgetId: string;
  messages: AIChatMessage[];
  appliedSuggestionIds?: string[];
  onUpdate: (mutation: CollectionMutation<AIChatMessage>) => void;
  onApplySuggestion: (id: string) => void;
  onRemove: () => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  size?: WidgetSize;
  onSizeChange?: (size: WidgetSize) => void;
  snapToGrid?: boolean;
  globalLock?: boolean;
  /** All available widget labels for context */
  availableWidgets?: { id: string; type: string }[];
}

const FEATURE_LABELS: Record<string, string> = {
  tasks: 'Tasks',
  notes: 'Notes',
  habits: 'Habits',
  goals: 'Goals',
  calendar: 'Calendar',
  shopping: 'Shopping',
  work: 'Work',
  'daily-focus': 'Daily Focus',
};

const FEATURE_PROMPTS = [
  { label: 'Task planning tips', target: 'tasks' },
  { label: 'Note organization ideas', target: 'notes' },
  { label: 'Habit building advice', target: 'habits' },
  { label: 'Goal-setting strategies', target: 'goals' },
  { label: 'Calendar scheduling tips', target: 'calendar' },
  { label: 'Shopping list optimization', target: 'shopping' },
  { label: 'Work productivity ideas', target: 'work' },
];

export function AIChatWidget({
  widgetId,
  messages,
  appliedSuggestionIds = [],
  onUpdate,
  onApplySuggestion,
  onRemove,
  onDragStart,
  onDragEnd,
  size,
  onSizeChange,
  snapToGrid,
  globalLock,
  availableWidgets = [],
}: AIChatWidgetProps) {
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const requestStateRef = useRef(createChatRequestState());

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text: string, target?: string) => {
    if (!text.trim() || isGenerating) return;

    const userMsg: AIChatMessage = {
      id: createId('chat-message'),
      role: 'user',
      text: text.trim(),
      timestamp: Date.now(),
    };

    const { nextState, token } = beginChatRequest(requestStateRef.current);
    requestStateRef.current = nextState;
    onUpdate(appendItem(userMsg));
    setInput('');
    setIsGenerating(true);

    try {
      const feature = (target ?? 'tasks') as Parameters<typeof generateWidgetAIState>[0]['feature'];
      const result = await generateWidgetAIState({
        widgetId,
        feature,
        input: { query: text, availableWidgets },
        dataSummary: [`User query: "${text}"`, `Target: ${FEATURE_LABELS[feature] ?? feature}`],
      });

      const assistantMsg: AIChatMessage = {
        id: createId('chat-message'),
        role: 'assistant',
        text:
          result.insights.length > 0
            ? `Here are ${result.insights.length} suggestion${result.insights.length > 1 ? 's' : ''} for you:`
            : result.error ?? 'No suggestions were generated. Try rephrasing your question.',
        timestamp: Date.now(),
        suggestions: result.insights.length > 0 ? result.insights : undefined,
        targetWidget: feature,
      };

      if (!isChatRequestCurrent(requestStateRef.current, token)) {
        return;
      }

      onUpdate(appendItem(assistantMsg));
    } catch {
      if (!isChatRequestCurrent(requestStateRef.current, token)) {
        return;
      }

      const errMsg: AIChatMessage = {
        id: createId('chat-message'),
        role: 'assistant',
        text: 'Sorry, something went wrong. Please try again.',
        timestamp: Date.now(),
      };
      onUpdate(appendItem(errMsg));
    } finally {
      if (isChatRequestCurrent(requestStateRef.current, token)) {
        setIsGenerating(false);
      }
    }
  };

  const handleApply = (suggestion: AIInsight) => {
    onApplySuggestion(suggestion.id);
    toast.success(`Suggestion "${suggestion.title}" marked as applied`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <WidgetContainer
      title="AI Assistant"
      icon={<Robot size={20} weight="duotone" />}
      onRemove={onRemove}
      value={{ id: widgetId, type: 'ai-chat' }}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      size={size}
      onSizeChange={onSizeChange}
      snapToGrid={snapToGrid}
      widgetType="ai-chat"
      globalLock={globalLock}
    >
      <div className="flex flex-col gap-3 h-full min-h-0">
        {/* Chat history */}
        <ScrollArea className="flex-1 min-h-0 pr-1">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
              <div className="flex items-center justify-center w-14 h-14 rounded-full bg-primary/10">
                <Sparkle size={28} className="text-primary" weight="duotone" />
              </div>
              <div>
                <p className="font-medium text-foreground mb-1">AI Chat Assistant</p>
                <p className="text-xs text-muted-foreground max-w-[240px]">
                  Ask for suggestions to apply to your other widgets. Choose a quick prompt or type your own below.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {FEATURE_PROMPTS.map((p) => (
                  <Button
                    key={p.target}
                    variant="outline"
                    size="sm"
                    className="text-xs gap-1"
                    onClick={() => sendMessage(p.label, p.target)}
                  >
                    <Sparkle size={12} />
                    {p.label}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3 pb-2">
              <AnimatePresence initial={false}>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                        <Sparkle size={14} className="text-primary" weight="duotone" />
                      </div>
                    )}
                    <div
                      className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-foreground'
                      }`}
                    >
                      <p className="leading-snug">{msg.text}</p>
                      {msg.suggestions && msg.suggestions.length > 0 && (
                        <div className="mt-2 space-y-2">
                          {msg.suggestions.map((s) => {
                            const isApplied = appliedSuggestionIds.includes(s.id);
                            return (
                              <div
                                key={s.id}
                                className={`rounded-lg border bg-background p-2.5 ${isApplied ? 'opacity-60' : ''}`}
                              >
                                <div className="flex items-start gap-2">
                                  <div className="flex-1">
                                    <p className="font-medium text-xs text-foreground">{s.title}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">{s.summary}</p>
                                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                      <Badge variant="secondary" className="text-[10px]">
                                        {Math.round(s.confidence * 100)}% confidence
                                      </Badge>
                                      {msg.targetWidget && FEATURE_LABELS[msg.targetWidget] && (
                                        <Badge variant="outline" className="text-[10px]">
                                          {FEATURE_LABELS[msg.targetWidget]}
                                        </Badge>
                                      )}
                                      {isApplied && (
                                        <Badge variant="default" className="text-[10px] gap-0.5">
                                          <CheckCircle size={9} weight="fill" /> Applied
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  {!isApplied && (
                                    <Button
                                      size="sm"
                                      variant="default"
                                      className="h-6 text-[10px] px-2 gap-1 shrink-0"
                                      onClick={() => handleApply(s)}
                                    >
                                      <CheckCircle size={10} weight="fill" />
                                      Apply
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      <p className="text-[10px] opacity-50 mt-1 text-right">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {isGenerating && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-2 justify-start"
                >
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                    <Sparkle size={14} className="text-primary animate-pulse" weight="duotone" />
                  </div>
                  <div className="bg-muted rounded-xl px-3 py-2 text-xs text-muted-foreground">
                    Thinking…
                  </div>
                </motion.div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </ScrollArea>

        {/* Quick prompts (when there are messages) */}
        {messages.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {FEATURE_PROMPTS.slice(0, 3).map((p) => (
              <Button
                key={p.target}
                variant="outline"
                size="sm"
                className="text-[10px] h-6 px-2 gap-1"
                onClick={() => sendMessage(p.label, p.target)}
                disabled={isGenerating}
              >
                {p.label}
              </Button>
            ))}
          </div>
        )}

        {/* Input area */}
        <div className="flex gap-2 items-end">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask for suggestions… (Enter to send)"
            className="resize-none text-sm min-h-[60px] max-h-[120px]"
            disabled={isGenerating}
          />
          <div className="flex flex-col gap-1">
            <Button
              size="icon"
              className="h-9 w-9"
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isGenerating}
              title="Send message"
            >
              <PaperPlaneTilt size={16} weight="fill" />
            </Button>
            {messages.length > 0 && (
              <Button
                size="icon"
                variant="ghost"
                className="h-9 w-9 text-muted-foreground hover:text-destructive"
                onClick={() => {
                  requestStateRef.current = clearChatRequestState(requestStateRef.current);
                  setIsGenerating(false);
                  onUpdate(replaceItems([]));
                }}
                title="Clear chat"
              >
                <XCircle size={16} />
              </Button>
            )}
          </div>
        </div>
      </div>
    </WidgetContainer>
  );
}
