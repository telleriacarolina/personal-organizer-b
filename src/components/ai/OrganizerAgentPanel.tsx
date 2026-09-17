// ---------------------------------------------------------------------------
// OrganizerAgentPanel – Conversational chat UI for the Organizer Agent
// ---------------------------------------------------------------------------

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { PaperPlaneRight, Robot, Trash, CheckCircle, XCircle, ShieldCheck } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';
import { handleAgentMessage, WELCOME_MESSAGE } from '@/lib/organizer-agent-service';
import type { AgentActivityEntry, AgentMessage, AgentPendingAction, AgentContext } from '@/types/agent';

interface OrganizerAgentPanelProps {
  context: AgentContext;
}

// ---------------------------------------------------------------------------
// Markdown-lite renderer (bold, italic, bullets)
// ---------------------------------------------------------------------------

function renderMarkdown(text: string) {
  const lines = text.split('\n');
  return lines.map((line, i) => {
    const trimmed = line.trim();
    const isBullet = trimmed.startsWith('• ') || trimmed.startsWith('- ');
    const content = isBullet ? trimmed.slice(2) : trimmed;
    const rendered = applyInlineStyles(content);
    if (isBullet) {
      return (
        <div key={i} className="flex gap-1.5">
          <span className="text-muted-foreground mt-0.5 shrink-0">•</span>
          <span>{rendered}</span>
        </div>
      );
    }
    if (!trimmed) return <div key={i} className="h-1.5" />;
    return <div key={i}>{rendered}</div>;
  });
}

function applyInlineStyles(text: string) {
  // Split on bold (**text**), italic (_text_), and code (`text`)
  const parts = text.split(/(\*\*[^*]+\*\*|_[^_]+_|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('_') && part.endsWith('_') && part.length > 2) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return <code key={i} className="rounded bg-muted px-1 py-0.5 text-xs font-mono">{part.slice(1, -1)}</code>;
    }
    return part;
  });
}

// ---------------------------------------------------------------------------
// Thinking indicator
// ---------------------------------------------------------------------------

function ThinkingBubble() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      className="flex items-end gap-2"
    >
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <Robot size={14} className="text-primary" />
      </div>
      <div className="rounded-2xl rounded-bl-sm bg-muted px-3 py-2">
        <div className="flex gap-1 items-center h-4">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-muted-foreground"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Message bubble
// ---------------------------------------------------------------------------

interface MessageBubbleProps {
  message: AgentMessage;
}

function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex items-end gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {!isUser && (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Robot size={14} className="text-primary" />
        </div>
      )}
      <div
        className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm leading-relaxed space-y-0.5 ${
          isUser
            ? 'rounded-br-sm bg-primary text-primary-foreground'
            : 'rounded-bl-sm bg-muted text-foreground'
        }`}
      >
        {renderMarkdown(message.content)}
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Pending action confirmation banner
// ---------------------------------------------------------------------------

interface ConfirmBannerProps {
  action: AgentPendingAction;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmBanner({ action, onConfirm, onCancel }: ConfirmBannerProps) {
  const [typedValue, setTypedValue] = useState('');
  const needsTypedConfirmation = action.confirmationLevel === 'c3';
  const isTypedConfirmationValid = !needsTypedConfirmation || typedValue.trim().toUpperCase() === action.confirmationPhrase;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="mx-4 mb-2 rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2"
    >
      <div className="flex items-center gap-2">
        <ShieldCheck size={14} className="text-primary" weight="fill" />
        <p className="text-xs font-medium text-foreground">{action.description}</p>
      </div>
      <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
        Confirmation level: {action.confirmationLevel.toUpperCase()}
      </p>
      {needsTypedConfirmation && (
        <Input
          value={typedValue}
          onChange={(event) => setTypedValue(event.target.value)}
          placeholder={`Type ${action.confirmationPhrase} to confirm`}
          className="h-8 text-xs"
        />
      )}
      <div className="flex gap-2">
        <Button size="sm" className="h-7 gap-1 text-xs" onClick={onConfirm} disabled={!isTypedConfirmationValid}>
          <CheckCircle size={13} weight="fill" />
          Confirm
        </Button>
        <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs text-muted-foreground" onClick={onCancel}>
          <XCircle size={13} />
          Cancel
        </Button>
      </div>
    </motion.div>
  );
}

interface ActivityLogProps {
  entries: AgentActivityEntry[];
}

function ActivityLog({ entries }: ActivityLogProps) {
  if (entries.length === 0) return null;
  const recentEntries = entries.slice(-6).reverse();

  return (
    <div className="border-t px-4 py-3 space-y-2 shrink-0">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
        <ShieldCheck size={13} />
        Activity Log
      </div>
      <div className="space-y-2">
        {recentEntries.map((entry) => (
          <div key={entry.id} className="rounded-md border bg-muted/40 px-3 py-2 text-xs space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-foreground">{entry.toolName}</span>
              <Badge variant="outline" className="text-[10px] uppercase">
                {entry.status}
              </Badge>
            </div>
            <p className="text-muted-foreground">{entry.summary}</p>
            {entry.warnings.length > 0 && (
              <p className="text-[11px] text-amber-700 dark:text-amber-300">{entry.warnings[0]}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------

export function OrganizerAgentPanel({ context }: OrganizerAgentPanelProps) {
  const [messages, setMessages] = useState<AgentMessage[]>([
    {
      id: uuidv4(),
      role: 'assistant',
      content: WELCOME_MESSAGE,
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [pendingAction, setPendingAction] = useState<AgentPendingAction | undefined>(undefined);
  const [activityLog, setActivityLog] = useState<AgentActivityEntry[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Mirror messages in a ref so sendMessage always reads the latest history
  // without needing to be included as a dependency of the callback.
  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      // Find the ScrollArea viewport
      const viewport = el.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, [messages, isThinking]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isThinking) return;

      const userMsg: AgentMessage = {
        id: uuidv4(),
        role: 'user',
        content: trimmed,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInput('');
      setIsThinking(true);

      // Clear pending action once user replies
      const currentPending = pendingAction;
      setPendingAction(undefined);

      try {
        // Inject a fresh date so the agent always uses today, even if the
        // memoized context was created before midnight.
        const freshContext = { ...context, currentDate: new Date() };
        const response = await handleAgentMessage(trimmed, messagesRef.current, freshContext, currentPending);

        const assistantMsg: AgentMessage = {
          id: uuidv4(),
          role: 'assistant',
          content: response.message,
          timestamp: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, assistantMsg]);
        if (response.activity) {
          setActivityLog((prev) => [...prev, response.activity!]);
        }

        if (response.pendingAction) {
          setPendingAction(response.pendingAction);
        }
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: uuidv4(),
            role: 'assistant',
            content: 'Something went wrong on my end. Please try again.',
            timestamp: new Date().toISOString(),
          },
        ]);
      } finally {
        setIsThinking(false);
        inputRef.current?.focus();
      }
    },
    [isThinking, context, pendingAction],
  );

  const handleConfirmAction = useCallback(() => {
    if (!pendingAction) return;
    sendMessage(pendingAction.confirmationPhrase ?? 'yes');
  }, [pendingAction, sendMessage]);

  const handleCancelAction = useCallback(() => {
    if (!pendingAction) return;
    sendMessage('no');
  }, [pendingAction, sendMessage]);

  const clearConversation = () => {
    setMessages([
      {
        id: uuidv4(),
        role: 'assistant',
        content: WELCOME_MESSAGE,
        timestamp: new Date().toISOString(),
      },
    ]);
    setPendingAction(undefined);
    setActivityLog([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
        <div className="flex items-center gap-2">
          <Robot size={18} className="text-primary" weight="fill" />
          <span className="font-semibold text-sm text-foreground">Organizer Agent</span>
          <Badge variant="secondary" className="text-xs">Beta</Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearConversation}
          title="Clear conversation"
          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
        >
          <Trash size={14} />
        </Button>
      </div>

      {/* Message area */}
      <ScrollArea ref={scrollRef} className="flex-1 min-h-0">
        <div className="flex flex-col gap-3 p-4">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            {isThinking && <ThinkingBubble key="thinking" />}
          </AnimatePresence>
        </div>
      </ScrollArea>

      {/* Pending action confirmation */}
      <AnimatePresence>
        {pendingAction && (
          <ConfirmBanner
            key="confirm-banner"
            action={pendingAction}
            onConfirm={handleConfirmAction}
            onCancel={handleCancelAction}
          />
        )}
      </AnimatePresence>

      <ActivityLog entries={activityLog} />

      {/* Input row */}
      <div className="flex items-center gap-2 px-4 py-3 border-t shrink-0">
        <Input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask me anything…"
          disabled={isThinking}
          className="flex-1 text-sm h-9"
          autoComplete="off"
        />
        <Button
          size="sm"
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || isThinking}
          className="h-9 w-9 p-0 shrink-0"
          title="Send message"
        >
          <PaperPlaneRight size={15} weight="fill" />
        </Button>
      </div>
    </div>
  );
}
