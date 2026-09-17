import type { ShoppingCategory, CalendarEntryType, Widget } from './index';

// ---------------------------------------------------------------------------
// Agent message types
// ---------------------------------------------------------------------------

export interface AgentMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isThinking?: boolean;
}

// ---------------------------------------------------------------------------
// Data shapes for write actions
// ---------------------------------------------------------------------------

export interface AgentTaskData {
  text: string;
  priority?: 'low' | 'medium' | 'high';
  dueDate?: string | null;
  category?: string | null;
}

export interface AgentNoteData {
  title: string;
  content: string;
}

export interface AgentGoalData {
  title: string;
  description: string;
  targetDate?: number;
}

export interface AgentHabitData {
  name: string;
}

export interface AgentShoppingItemData {
  name: string;
  quantity?: string;
  category?: ShoppingCategory;
  priority?: 'low' | 'medium' | 'high';
}

export interface AgentCalendarEventData {
  title: string;
  type: CalendarEntryType;
  date: number;
  startTime?: string;
  endTime?: string;
  allDay?: boolean;
  description?: string;
  location?: string;
}

// ---------------------------------------------------------------------------
// Write actions (used for pending confirmations and immediate executions)
// ---------------------------------------------------------------------------

export type AgentWriteAction =
  | { type: 'create-task'; widgetId: string; data: AgentTaskData; description: string }
  | { type: 'create-note'; widgetId: string; data: AgentNoteData; description: string }
  | { type: 'create-goal'; widgetId: string; data: AgentGoalData; description: string }
  | { type: 'add-habit'; widgetId: string; data: AgentHabitData; description: string }
  | { type: 'add-shopping-item'; widgetId: string; data: AgentShoppingItemData; description: string }
  | { type: 'create-calendar-event'; widgetId: string; data: AgentCalendarEventData; description: string };

// ---------------------------------------------------------------------------
// Handlers the agent can call to mutate app state
// ---------------------------------------------------------------------------

export interface AgentHandlers {
  onAddTask: (widgetId: string, task: AgentTaskData) => void;
  onAddNote: (widgetId: string, note: AgentNoteData) => void;
  onAddGoal: (widgetId: string, goal: AgentGoalData) => void;
  onAddHabit: (widgetId: string, habit: AgentHabitData) => void;
  onAddShoppingItem: (widgetId: string, item: AgentShoppingItemData) => void;
  onAddCalendarEvent: (widgetId: string, event: AgentCalendarEventData) => void;
}

// ---------------------------------------------------------------------------
// Context passed to the agent on every message
// ---------------------------------------------------------------------------

export interface AgentContext {
  widgets: Widget[];
  handlers: AgentHandlers;
  currentDate: Date;
}

// ---------------------------------------------------------------------------
// Response returned by the agent service
// ---------------------------------------------------------------------------

export interface AgentResponse {
  /** Primary text response to display to the user */
  message: string;
  /**
   * A write action that requires explicit user confirmation before executing.
   * When present, the panel will show a confirmation prompt.
   */
  pendingAction?: AgentWriteAction;
}
