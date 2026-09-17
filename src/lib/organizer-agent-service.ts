// ---------------------------------------------------------------------------
// Organizer Agent Service
//
// Provides a mock implementation of the Organizer Agent that reads real widget
// data, understands natural language intents, creates organizer items, and
// formats helpful responses. Structured for future real-AI provider integration.
// ---------------------------------------------------------------------------

import { format, addDays, parseISO, isToday as dateFnsIsToday } from 'date-fns';
import type {
  Task,
  Note,
  Habit,
  Goal,
  CalendarEvent,
  PersonalShoppingItem,
  Widget,
  TasksWidget,
  NotesWidget,
  HabitsWidget,
  GoalsWidget,
  CalendarWidget,
  ShoppingWidget,
  WorkWidget,
} from '@/types';
import type {
  AgentContext,
  AgentMessage,
  AgentResponse,
  AgentWriteAction,
  AgentTaskData,
  AgentShoppingItemData,
} from '@/types/agent';

// ---------------------------------------------------------------------------
// System prompt (used by real AI providers in future phases)
// ---------------------------------------------------------------------------

export const ORGANIZER_AGENT_SYSTEM_PROMPT = `You are the Organizer Agent, an AI productivity assistant built into the Personal Organizer application.

Your purpose is to help the user organize, understand, plan, and manage information across their personal productivity dashboard.

The application may contain: Tasks, Notes, Habits, Goals, Calendar events, Work items, Shopping lists, and Record Notes.

Core Principles:
- Be useful: understand intent and help with fewest necessary steps.
- Be accurate: never invent data; use tools to retrieve current information.
- Preserve user control: reading is safe; creating, editing, or deleting requires appropriate confirmation.
- Be transparent: clearly distinguish retrieved data, inferred info, suggestions, and completed actions.

Confirmation rules:
- Require confirmation before: deleting tasks, notes, goals, habits, calendar events, work records, shopping data, or bulk operations.
- For ordinary single-item creation, creation may proceed without additional confirmation.

Always use the smallest number of tools necessary. Report outcomes accurately.`;

// ---------------------------------------------------------------------------
// Widget data accessors
// ---------------------------------------------------------------------------

const getTaskWidgets = (widgets: Widget[]): TasksWidget[] =>
  widgets.filter((w): w is TasksWidget => w.type === 'tasks');

const getNoteWidgets = (widgets: Widget[]): NotesWidget[] =>
  widgets.filter((w): w is NotesWidget => w.type === 'notes');

const getHabitWidgets = (widgets: Widget[]): HabitsWidget[] =>
  widgets.filter((w): w is HabitsWidget => w.type === 'habits');

const getGoalWidgets = (widgets: Widget[]): GoalsWidget[] =>
  widgets.filter((w): w is GoalsWidget => w.type === 'goals');

const getCalendarWidgets = (widgets: Widget[]): CalendarWidget[] =>
  widgets.filter((w): w is CalendarWidget => w.type === 'calendar');

const getShoppingWidgets = (widgets: Widget[]): ShoppingWidget[] =>
  widgets.filter((w): w is ShoppingWidget => w.type === 'shopping');

const getWorkWidgets = (widgets: Widget[]): WorkWidget[] =>
  widgets.filter((w): w is WorkWidget => w.type === 'work');

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

function parseRelativeDate(message: string, today: Date): string | null {
  const lower = message.toLowerCase();
  if (/\btoday\b/.test(lower)) return format(today, 'yyyy-MM-dd');
  if (/\btomorrow\b/.test(lower)) return format(addDays(today, 1), 'yyyy-MM-dd');
  if (/\bnext\s+week\b/.test(lower)) return format(addDays(today, 7), 'yyyy-MM-dd');
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  for (let i = 0; i < dayNames.length; i++) {
    if (new RegExp(`\\b${dayNames[i]}\\b`).test(lower)) {
      const todayDay = today.getDay();
      let daysUntil = i - todayDay;
      if (daysUntil <= 0) daysUntil += 7;
      return format(addDays(today, daysUntil), 'yyyy-MM-dd');
    }
  }
  return null;
}

function extractTime(message: string): string | undefined {
  const match = message.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
  if (match) {
    let hour = parseInt(match[1], 10);
    const minute = match[2] ? parseInt(match[2], 10) : 0;
    const meridiem = match[3].toLowerCase();
    if (meridiem === 'pm' && hour !== 12) hour += 12;
    if (meridiem === 'am' && hour === 12) hour = 0;
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  }
  const h24 = message.match(/\b(\d{2}):(\d{2})\b/);
  if (h24) return `${h24[1]}:${h24[2]}`;
  return undefined;
}

function extractPriority(message: string): 'low' | 'medium' | 'high' | undefined {
  const lower = message.toLowerCase();
  if (/\b(urgent|high.?priority|important|asap|critical)\b/.test(lower)) return 'high';
  if (/\bmedium.?priority\b/.test(lower)) return 'medium';
  if (/\blow.?priority\b/.test(lower)) return 'low';
  return undefined;
}

// ---------------------------------------------------------------------------
// Text extraction helpers
// ---------------------------------------------------------------------------

function stripTaskPrefix(message: string): string {
  let text = message.trim();
  const prefixes = [
    /^(add|create|make)\s+(an?\s+)?(urgent\s+|high.?priority\s+|low.?priority\s+)?task\s+(to\s+|:\s*)?/i,
    /^remind\s+me\s+to\s+/i,
    /^task\s*:\s*/i,
    /^new\s+task\s*:\s*/i,
  ];
  for (const p of prefixes) text = text.replace(p, '');
  // strip trailing date words
  text = text.replace(/\s+(today|tomorrow|next\s+week|on\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday))\s*$/i, '');
  return text.trim();
}

function stripNotePrefix(message: string): { title: string; content: string } {
  let text = message.trim();
  text = text.replace(/^(add|create|make|write(\s+down)?)\s+(an?\s+)?note\s*(about\s+|on\s+|titled?\s+|:\s*)?/i, '');
  const colonIdx = text.indexOf(':');
  if (colonIdx > 0 && colonIdx < 60) {
    return { title: text.slice(0, colonIdx).trim(), content: text.slice(colonIdx + 1).trim() };
  }
  const words = text.split(/\s+/);
  const title = words.slice(0, Math.min(6, words.length)).join(' ');
  return { title, content: text };
}

function stripGoalPrefix(message: string): string {
  let text = message.trim();
  text = text.replace(/^(add|create|set|make)\s+(an?\s+)?goal\s*(to\s+|:\s*|for\s+)?/i, '');
  return text.trim();
}

function stripHabitPrefix(message: string): string {
  let text = message.trim();
  text = text.replace(/^(add|create|track|start)\s+(an?\s+)?habit\s*(of\s+|to\s+|:\s*)?/i, '');
  return text.trim();
}

function extractShoppingItem(message: string): { name: string; quantity?: string } | null {
  // "add X to my shopping list" / "add X to the list" / "add X to shopping"
  const explicit = message.match(/^(?:add|put)\s+(.+?)\s+to\s+(?:my\s+)?(?:shopping|grocery)(?:\s+list)?$/i);
  if (explicit) {
    const raw = explicit[1].trim();
    const qtyMatch = raw.match(/^(\d+(?:\.\d+)?(?:\s*(?:kg|g|lb|oz|l|ml|pack|packs|cans?|bottles?|box(?:es)?|bags?|dozen|pcs?|units?))?\s+)(.+)/i);
    if (qtyMatch) return { name: qtyMatch[2].trim(), quantity: qtyMatch[1].trim() };
    return { name: raw };
  }
  // "I need (to buy) X"
  const need = message.match(/^(?:i\s+)?need\s+(?:to\s+buy\s+)?(.+)$/i);
  if (need) return { name: need[1].trim() };
  return null;
}

// ---------------------------------------------------------------------------
// Response formatters
// ---------------------------------------------------------------------------

const PRIORITY_ICON: Record<string, string> = { high: '🔴', medium: '🟡', low: '🟢' };

function formatTasks(tasks: Task[]): string {
  if (tasks.length === 0) return 'No tasks found.';
  const pending = tasks.filter((t) => !t.completed);
  const done = tasks.filter((t) => t.completed);
  const lines: string[] = [];
  if (pending.length > 0) {
    lines.push(`📋 **${pending.length} pending task${pending.length !== 1 ? 's' : ''}:**`);
    pending.forEach((t) => {
      const icon = PRIORITY_ICON[t.priority ?? 'medium'] ?? '⬜';
      const due = t.dueDate ? ` · due ${t.dueDate}` : '';
      lines.push(`${icon} ${t.text}${due}`);
    });
  }
  if (done.length > 0) {
    lines.push(`\n✅ ${done.length} completed task${done.length !== 1 ? 's' : ''}`);
  }
  return lines.join('\n');
}

function formatNotes(notes: Note[]): string {
  if (notes.length === 0) return 'No notes found.';
  const lines = [`📝 **${notes.length} note${notes.length !== 1 ? 's' : ''}:**`];
  notes.forEach((n) => {
    const preview = n.content.length > 60 ? n.content.slice(0, 60) + '…' : n.content;
    lines.push(`• **${n.title}** — ${preview}`);
  });
  return lines.join('\n');
}

function formatHabits(habits: Habit[]): string {
  if (habits.length === 0) return 'No habits found.';
  const today = format(new Date(), 'yyyy-MM-dd');
  const lines = [`🔄 **${habits.length} habit${habits.length !== 1 ? 's' : ''}:**`];
  habits.forEach((h) => {
    const doneToday = h.completions[today] === true;
    lines.push(`${doneToday ? '✅' : '⭕'} ${h.name}`);
  });
  return lines.join('\n');
}

function formatGoals(goals: Goal[]): string {
  if (goals.length === 0) return 'No goals found.';
  const active = goals.filter((g) => !g.completed);
  const done = goals.filter((g) => g.completed);
  const lines: string[] = [];
  if (active.length > 0) {
    lines.push(`🎯 **${active.length} active goal${active.length !== 1 ? 's' : ''}:**`);
    active.forEach((g) => {
      const target = g.targetDate ? ` · target ${format(new Date(g.targetDate), 'MMM d, yyyy')}` : '';
      lines.push(`• ${g.title}${target}`);
      if (g.description) lines.push(`  _${g.description}_`);
    });
  }
  if (done.length > 0) lines.push(`\n✅ ${done.length} completed goal${done.length !== 1 ? 's' : ''}`);
  return lines.join('\n');
}

function formatCalendarEvents(events: CalendarEvent[], filterDate?: Date): string {
  let filtered = [...events].sort((a, b) => a.date - b.date);
  if (filterDate) {
    const dayStr = format(filterDate, 'yyyy-MM-dd');
    filtered = filtered.filter((e) => format(new Date(e.date), 'yyyy-MM-dd') === dayStr);
  }
  if (filtered.length === 0) {
    return filterDate
      ? `No events on ${format(filterDate, 'EEEE, MMM d')}.`
      : 'No calendar events found.';
  }
  const label = filterDate ? `on ${format(filterDate, 'EEEE, MMM d')}` : '';
  const lines = [`📅 **${filtered.length} event${filtered.length !== 1 ? 's' : ''} ${label}:**`.trim()];
  filtered.forEach((e) => {
    const time = e.allDay ? 'All day' : e.startTime ? e.startTime : format(new Date(e.date), 'MMM d');
    const loc = e.location ? ` @ ${e.location}` : '';
    lines.push(`• ${e.title} — ${time}${loc}`);
  });
  return lines.join('\n');
}

function formatShoppingItems(items: PersonalShoppingItem[]): string {
  if (items.length === 0) return 'Your shopping list is empty.';
  const pending = items.filter((i) => !i.purchased);
  const bought = items.filter((i) => i.purchased);
  const lines: string[] = [];
  if (pending.length > 0) {
    lines.push(`🛒 **${pending.length} item${pending.length !== 1 ? 's' : ''} to buy:**`);
    pending.forEach((i) => {
      const qty = i.quantity ? ` (${i.quantity})` : '';
      lines.push(`• ${i.name}${qty}`);
    });
  }
  if (bought.length > 0) lines.push(`\n✅ ${bought.length} already purchased`);
  return lines.join('\n');
}

function formatWorkSummary(widget: WorkWidget): string {
  const parts: string[] = [];
  if (widget.clientSlots.length > 0) {
    const upcoming = widget.clientSlots.filter((s) => s.status === 'scheduled');
    parts.push(`👤 **${upcoming.length} upcoming client slot${upcoming.length !== 1 ? 's' : ''}**`);
    upcoming.slice(0, 5).forEach((s) => {
      parts.push(`  • ${s.clientName} — ${format(new Date(s.date), 'MMM d')} at ${s.startTime}`);
    });
  }
  if (widget.jobs.length > 0) {
    const active = widget.jobs.filter((j) => j.status !== 'completed');
    parts.push(`💼 **${active.length} active job${active.length !== 1 ? 's' : ''}**`);
    active.slice(0, 5).forEach((j) => {
      parts.push(`  • ${j.title} [${j.priority}]`);
    });
  }
  if (widget.errands.length > 0) {
    const pending = widget.errands.filter((e) => !e.completed);
    parts.push(`📌 **${pending.length} pending errand${pending.length !== 1 ? 's' : ''}**`);
  }
  if (widget.meals.length > 0) {
    parts.push(`🍽 **${widget.meals.length} meal${widget.meals.length !== 1 ? 's' : ''} scheduled**`);
  }
  return parts.length > 0 ? parts.join('\n') : 'No work items found.';
}

// ---------------------------------------------------------------------------
// Intent detection
// ---------------------------------------------------------------------------

type IntentType =
  | 'read-tasks'
  | 'read-notes'
  | 'read-habits'
  | 'read-goals'
  | 'read-calendar'
  | 'read-shopping'
  | 'read-work'
  | 'read-overview'
  | 'create-task'
  | 'create-note'
  | 'create-goal'
  | 'create-habit'
  | 'add-shopping'
  | 'create-event'
  | 'unknown';

function detectIntent(message: string): IntentType {
  const m = message.toLowerCase();

  // ---- Create intents (checked first to avoid false reads) ----
  if (/\b(add|create|make|new)\s+(an?\s+)?task\b/.test(m) || /\bremind\s+me\s+to\b/.test(m)) return 'create-task';
  if (/\b(add|create|make|write)\s+(an?\s+)?note\b/.test(m) || /\bwrite\s+(this\s+)?down\b/.test(m)) return 'create-note';
  if (/\b(add|create|set|make)\s+(an?\s+)?goal\b/.test(m)) return 'create-goal';
  if (/\b(add|create|track|start)\s+(an?\s+)?habit\b/.test(m)) return 'create-habit';
  if (
    /\b(add|put)\s+.+\s+to\s+(my\s+)?(shopping|grocery)(\s+list)?\b/.test(m) ||
    /\b(i\s+)?need\s+to\s+buy\b/.test(m)
  ) return 'add-shopping';
  if (
    /\b(schedule|book|add|create)\s+(an?\s+)?(meeting|appointment|event|call|session)\b/.test(m) ||
    /\bput\s+.+\s+on\s+(my\s+)?calendar\b/.test(m)
  ) return 'create-event';

  // ---- Read intents ----
  if (/\btasks?\b/.test(m) && /\b(show|list|what|see|my|have|do|any)\b/.test(m)) return 'read-tasks';
  if (/\bnotes?\b/.test(m) && /\b(show|list|what|see|my|have|any)\b/.test(m)) return 'read-notes';
  if (/\bhabits?\b/.test(m)) return 'read-habits';
  if (/\bgoals?\b/.test(m) && /\b(show|list|what|see|my|have|any)\b/.test(m)) return 'read-goals';
  if (
    /\b(calendar|schedule|events?|agenda)\b/.test(m) ||
    (/\bwhat\b/.test(m) && /\b(today|tomorrow|this\s+week)\b/.test(m))
  ) return 'read-calendar';
  if (/\b(shopping(\s+list)?|grocery|groceries)\b/.test(m)) return 'read-shopping';
  if (/\bwork\b/.test(m) && /\b(schedule|jobs?|clients?|meals?|errands?|what)\b/.test(m)) return 'read-work';
  if (/\b(overview|summary|focus|priorities?|plan\s+for\s+today|what.*(have|going\s+on))\b/.test(m)) return 'read-overview';

  // fallback – short messages asking about "today"
  if (/\btoday\b/.test(m)) return 'read-overview';

  return 'unknown';
}

// ---------------------------------------------------------------------------
// Confirmation detection
// ---------------------------------------------------------------------------

function isConfirmation(message: string): boolean {
  return /^\s*(yes|yeah|yep|yup|sure|ok|okay|confirm|go ahead|do it|proceed|please|affirmative)\b/i.test(message);
}

function isDenial(message: string): boolean {
  return /^\s*(no|nope|nah|cancel|stop|never mind|nevermind|abort|don'?t)\b/i.test(message);
}

// ---------------------------------------------------------------------------
// Help text
// ---------------------------------------------------------------------------

const HELP_TEXT = `I can help you with your Personal Organizer! Here are some things you can ask me:

**Reading your data:**
• "Show me my tasks"
• "What's on my calendar today?"
• "What are my goals?"
• "Show my shopping list"
• "Give me an overview of today"

**Creating items:**
• "Add a task to call John"
• "Remind me to review the report tomorrow"
• "Add milk to my shopping list"
• "Create a goal to exercise three times a week"
• "Track a new habit: daily reading"
• "Schedule a meeting with the team on Friday at 2pm"

**Tips:**
• Include priority: "add an urgent task to finish the proposal"
• Include dates: "remind me to pay bills tomorrow"
• I always read your actual organizer data — no invented info.`;

// ---------------------------------------------------------------------------
// Core mock handler
// ---------------------------------------------------------------------------

async function mockHandleMessage(
  message: string,
  _history: AgentMessage[],
  context: AgentContext,
  pendingAction?: AgentWriteAction,
): Promise<AgentResponse> {
  // Simulate thinking time
  await new Promise((r) => setTimeout(r, 400 + Math.random() * 300));

  const { widgets, handlers, currentDate } = context;
  const trimmed = message.trim();

  // ---- Handle pending confirmation ----
  if (pendingAction) {
    if (isConfirmation(trimmed)) {
      executeAction(pendingAction, handlers);
      return { message: `✅ Done! ${pendingAction.description}` };
    }
    if (isDenial(trimmed)) {
      return { message: "No problem, I've cancelled that action. Let me know if you need anything else." };
    }
    // Treat as a new message, ignoring the pending action
  }

  const intent = detectIntent(trimmed);

  // ---- READ intents ----
  if (intent === 'read-tasks') {
    const twids = getTaskWidgets(widgets);
    if (twids.length === 0) return { message: "I don't see a Tasks widget in your organizer yet. Add one from the widget panel!" };
    const allTasks = twids.flatMap((w) => w.tasks);
    return { message: formatTasks(allTasks) };
  }

  if (intent === 'read-notes') {
    const nwids = getNoteWidgets(widgets);
    if (nwids.length === 0) return { message: "I don't see a Notes widget in your organizer yet." };
    const allNotes = nwids.flatMap((w) => w.notes);
    return { message: formatNotes(allNotes) };
  }

  if (intent === 'read-habits') {
    const hwids = getHabitWidgets(widgets);
    if (hwids.length === 0) return { message: "I don't see a Habits widget in your organizer yet." };
    const allHabits = hwids.flatMap((w) => w.habits);
    return { message: formatHabits(allHabits) };
  }

  if (intent === 'read-goals') {
    const gwids = getGoalWidgets(widgets);
    if (gwids.length === 0) return { message: "I don't see a Goals widget in your organizer yet." };
    const allGoals = gwids.flatMap((w) => w.goals);
    return { message: formatGoals(allGoals) };
  }

  if (intent === 'read-calendar') {
    const cwids = getCalendarWidgets(widgets);
    if (cwids.length === 0) return { message: "I don't see a Calendar widget in your organizer yet." };
    const allEvents = cwids.flatMap((w) => w.events);
    // Check if user asked about a specific date
    const dateStr = parseRelativeDate(trimmed, currentDate);
    const filterDate = dateStr ? parseISO(dateStr) : undefined;
    return { message: formatCalendarEvents(allEvents, filterDate) };
  }

  if (intent === 'read-shopping') {
    const swids = getShoppingWidgets(widgets);
    if (swids.length === 0) return { message: "I don't see a Shopping widget in your organizer yet." };
    const allItems = swids.flatMap((w) => w.items);
    return { message: formatShoppingItems(allItems) };
  }

  if (intent === 'read-work') {
    const wwids = getWorkWidgets(widgets);
    if (wwids.length === 0) return { message: "I don't see a Work widget in your organizer yet." };
    const parts = wwids.map(formatWorkSummary);
    return { message: parts.join('\n\n') };
  }

  if (intent === 'read-overview') {
    return buildDailyOverview(widgets, currentDate);
  }

  // ---- CREATE intents ----

  if (intent === 'create-task') {
    const taskWidgets = getTaskWidgets(widgets);
    if (taskWidgets.length === 0) {
      return { message: "There's no Tasks widget in your organizer. Add one first, then I can create tasks for you!" };
    }
    const text = stripTaskPrefix(trimmed);
    if (!text) {
      return { message: "What would you like the task to be? For example: \"Add a task to call John\"" };
    }
    const priority = extractPriority(trimmed);
    const dueDate = parseRelativeDate(trimmed, currentDate);
    const taskData: AgentTaskData = { text, priority, dueDate };
    const targetWidget = taskWidgets[0];
    handlers.onAddTask(targetWidget.id, taskData);
    const prioNote = priority ? ` [${priority} priority]` : '';
    const dueNote = dueDate ? ` due on ${format(parseISO(dueDate), 'EEEE, MMM d')}` : '';
    return { message: `✅ Added task: **${text}**${prioNote}${dueNote}` };
  }

  if (intent === 'create-note') {
    const noteWidgets = getNoteWidgets(widgets);
    if (noteWidgets.length === 0) {
      return { message: "There's no Notes widget in your organizer. Add one first!" };
    }
    const { title, content } = stripNotePrefix(trimmed);
    if (!title && !content) {
      return { message: "What should the note say? For example: \"Create a note: Meeting agenda — discuss Q3 goals\"" };
    }
    handlers.onAddNote(noteWidgets[0].id, { title: title || 'New Note', content });
    return { message: `✅ Note created: **${title || 'New Note'}**` };
  }

  if (intent === 'create-goal') {
    const goalWidgets = getGoalWidgets(widgets);
    if (goalWidgets.length === 0) {
      return { message: "There's no Goals widget in your organizer. Add one first!" };
    }
    const title = stripGoalPrefix(trimmed);
    if (!title) {
      return { message: "What's the goal? For example: \"Create a goal to run a 5K by June\"" };
    }
    handlers.onAddGoal(goalWidgets[0].id, { title, description: '' });
    return { message: `✅ Goal added: **${title}**` };
  }

  if (intent === 'create-habit') {
    const habitWidgets = getHabitWidgets(widgets);
    if (habitWidgets.length === 0) {
      return { message: "There's no Habits widget in your organizer. Add one first!" };
    }
    const name = stripHabitPrefix(trimmed);
    if (!name) {
      return { message: "What habit would you like to track? For example: \"Track a new habit: morning walk\"" };
    }
    handlers.onAddHabit(habitWidgets[0].id, { name });
    return { message: `✅ Habit added: **${name}**` };
  }

  if (intent === 'add-shopping') {
    const shoppingWidgets = getShoppingWidgets(widgets);
    if (shoppingWidgets.length === 0) {
      return { message: "There's no Shopping widget in your organizer. Add one first!" };
    }
    const parsed = extractShoppingItem(trimmed);
    if (!parsed) {
      return { message: "What would you like to add to your shopping list? For example: \"Add milk to my shopping list\"" };
    }
    // Duplicate check
    const existingItems = shoppingWidgets.flatMap((w) => w.items);
    const duplicate = existingItems.find(
      (i) => i.name.toLowerCase() === parsed.name.toLowerCase() && !i.purchased,
    );
    if (duplicate) {
      return { message: `**${parsed.name}** is already on your shopping list.` };
    }
    const itemData: AgentShoppingItemData = {
      name: parsed.name,
      quantity: parsed.quantity,
      category: 'other',
      priority: 'medium',
    };
    handlers.onAddShoppingItem(shoppingWidgets[0].id, itemData);
    const qtyNote = parsed.quantity ? ` (${parsed.quantity})` : '';
    return { message: `✅ Added **${parsed.name}**${qtyNote} to your shopping list.` };
  }

  if (intent === 'create-event') {
    const calWidgets = getCalendarWidgets(widgets);
    if (calWidgets.length === 0) {
      return { message: "There's no Calendar widget in your organizer. Add one first!" };
    }
    // Extract event details
    let title = trimmed
      .replace(/^(schedule|book|add|create|put)\s+(an?\s+)?/i, '')
      .replace(/\s+(meeting|appointment|event|call|session)\b/i, '')
      .replace(/\s+on\s+my\s+calendar\b/i, '')
      .replace(/\s+(today|tomorrow|next\s+week|on\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday))\b/i, '')
      .replace(/\s+(at\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*$/i, '')
      .trim();
    if (!title) title = 'New Event';

    const dateStr = parseRelativeDate(trimmed, currentDate);
    if (!dateStr) {
      return { message: `What date should I schedule "${title}"? For example: "Schedule ${title} tomorrow at 2pm"` };
    }
    const startTime = extractTime(trimmed);
    const eventDate = parseISO(dateStr).getTime();

    handlers.onAddCalendarEvent(calWidgets[0].id, {
      title,
      type: 'appointment',
      date: eventDate,
      startTime,
      allDay: !startTime,
    });

    const dateLabel = format(parseISO(dateStr), 'EEEE, MMM d');
    const timeLabel = startTime ? ` at ${startTime}` : ' (all day)';
    return { message: `✅ Event added: **${title}** on ${dateLabel}${timeLabel}` };
  }

  // ---- Help / unknown ----
  if (/\b(help|what can you do|how does this work|commands?)\b/i.test(trimmed)) {
    return { message: HELP_TEXT };
  }

  return {
    message: `I'm not sure how to help with that. Here are some things I can do:\n\n${HELP_TEXT}`,
  };
}

// ---------------------------------------------------------------------------
// Daily overview builder
// ---------------------------------------------------------------------------

function buildDailyOverview(widgets: Widget[], today: Date): AgentResponse {
  const sections: string[] = [`📊 **Your overview for ${format(today, 'EEEE, MMMM d')}**\n`];

  // Tasks
  const allTasks = getTaskWidgets(widgets).flatMap((w) => w.tasks);
  const pendingTasks = allTasks.filter((t) => !t.completed);
  const highPriority = pendingTasks.filter((t) => t.priority === 'high');
  const todayDue = pendingTasks.filter((t) => t.dueDate && dateFnsIsToday(parseISO(t.dueDate)));

  if (pendingTasks.length > 0) {
    sections.push(`📋 **Tasks:** ${pendingTasks.length} pending${highPriority.length > 0 ? `, ${highPriority.length} high-priority` : ''}`);
    if (highPriority.length > 0) {
      highPriority.slice(0, 3).forEach((t) => sections.push(`  🔴 ${t.text}`));
    }
    if (todayDue.length > 0) {
      sections.push(`  ⚠️ ${todayDue.length} due today`);
    }
  }

  // Calendar
  const allEvents = getCalendarWidgets(widgets).flatMap((w) => w.events);
  const todayDateStr = format(today, 'yyyy-MM-dd');
  const todayEvents = allEvents.filter((e) => format(new Date(e.date), 'yyyy-MM-dd') === todayDateStr);
  if (todayEvents.length > 0) {
    sections.push(`\n📅 **Calendar (${todayEvents.length} event${todayEvents.length !== 1 ? 's' : ''} today):**`);
    todayEvents.slice(0, 5).forEach((e) => {
      const time = e.allDay ? 'All day' : e.startTime ?? '';
      sections.push(`  • ${e.title}${time ? ' — ' + time : ''}`);
    });
  }

  // Habits
  const allHabits = getHabitWidgets(widgets).flatMap((w) => w.habits);
  if (allHabits.length > 0) {
    const doneToday = allHabits.filter((h) => h.completions[todayDateStr] === true);
    sections.push(`\n🔄 **Habits:** ${doneToday.length}/${allHabits.length} completed today`);
  }

  // Work
  const workWidgets = getWorkWidgets(widgets);
  if (workWidgets.length > 0) {
    const slots = workWidgets.flatMap((w) => w.clientSlots).filter((s) => s.status === 'scheduled');
    const todaySlots = slots.filter((s) => format(new Date(s.date), 'yyyy-MM-dd') === todayDateStr);
    if (todaySlots.length > 0) {
      sections.push(`\n👤 **Work:** ${todaySlots.length} client slot${todaySlots.length !== 1 ? 's' : ''} today`);
    }
  }

  if (sections.length === 1) {
    sections.push('Your organizer is empty. Add some widgets and items to get started!');
  }

  return { message: sections.join('\n') };
}

// ---------------------------------------------------------------------------
// Action executor
// ---------------------------------------------------------------------------

function executeAction(action: AgentWriteAction, handlers: AgentContext['handlers']): void {
  switch (action.type) {
    case 'create-task':
      handlers.onAddTask(action.widgetId, action.data);
      break;
    case 'create-note':
      handlers.onAddNote(action.widgetId, action.data);
      break;
    case 'create-goal':
      handlers.onAddGoal(action.widgetId, action.data);
      break;
    case 'add-habit':
      handlers.onAddHabit(action.widgetId, action.data);
      break;
    case 'add-shopping-item':
      handlers.onAddShoppingItem(action.widgetId, action.data);
      break;
    case 'create-calendar-event':
      handlers.onAddCalendarEvent(action.widgetId, action.data);
      break;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const WELCOME_MESSAGE = `👋 Hi! I'm your **Organizer Agent**. I can help you:

• Read and search your tasks, notes, goals, habits, calendar, shopping list, and work items
• Create new tasks, notes, goals, habits, shopping items, and events
• Give you a daily overview of what's on your plate

Just ask me anything — for example:
_"What do I have today?"_ or _"Add a task to call Sarah tomorrow"_

Type **help** for a full list of commands.`;

/**
 * Handle a user message and return the agent's response.
 * Delegates to the mock provider for now; structured for future AI providers.
 */
export async function handleAgentMessage(
  message: string,
  history: AgentMessage[],
  context: AgentContext,
  pendingAction?: AgentWriteAction,
): Promise<AgentResponse> {
  return mockHandleMessage(message, history, context, pendingAction);
}
