import type {
  CalendarEntryType,
  FamilyCalendarVisibility,
  ShoppingCategory,
  Widget,
} from './index';

export type OrganizerToolDomain =
  | 'tasks'
  | 'notes'
  | 'habits'
  | 'goals'
  | 'calendar'
  | 'work'
  | 'shopping'
  | 'record_notes';

export type OrganizerToolName =
  | 'tasks.list'
  | 'tasks.get'
  | 'tasks.create'
  | 'tasks.update'
  | 'tasks.set_status'
  | 'tasks.delete'
  | 'notes.list'
  | 'notes.get'
  | 'notes.create'
  | 'notes.update'
  | 'notes.delete'
  | 'habits.list'
  | 'habits.get'
  | 'habits.create'
  | 'habits.update'
  | 'habits.mark_completion'
  | 'habits.delete'
  | 'goals.list'
  | 'goals.get'
  | 'goals.create'
  | 'goals.update'
  | 'goals.set_status'
  | 'goals.delete'
  | 'calendar.list'
  | 'calendar.get'
  | 'calendar.create_event'
  | 'calendar.update_event'
  | 'calendar.delete_event'
  | 'calendar.set_reminder'
  | 'work.get_overview'
  | 'work.list_client_slots'
  | 'work.list_meals'
  | 'work.list_time_entries'
  | 'work.list_jobs'
  | 'work.list_errands'
  | 'work.list_routines'
  | 'work.create_client_slot'
  | 'work.update_client_slot'
  | 'work.delete_client_slot'
  | 'work.create_meal'
  | 'work.delete_meal'
  | 'work.start_timer'
  | 'work.stop_timer'
  | 'work.delete_time_entry'
  | 'work.create_job'
  | 'work.update_job'
  | 'work.delete_job'
  | 'work.create_errand'
  | 'work.update_errand'
  | 'work.delete_errand'
  | 'work.save_routine'
  | 'work.load_routine'
  | 'work.delete_routine'
  | 'work.publish_to_calendar'
  | 'shopping.list_items'
  | 'shopping.list_receipts'
  | 'shopping.list_trips'
  | 'shopping.list_reminders'
  | 'shopping.create_item'
  | 'shopping.update_item'
  | 'shopping.mark_purchased'
  | 'shopping.delete_item'
  | 'shopping.set_budget'
  | 'shopping.create_receipt'
  | 'shopping.delete_receipt'
  | 'shopping.create_reminder'
  | 'shopping.update_reminder'
  | 'shopping.delete_reminder'
  | 'record_notes.list'
  | 'record_notes.get_metadata'
  | 'record_notes.get_transcript'
  | 'record_notes.save_capture'
  | 'record_notes.update_metadata'
  | 'record_notes.delete'
  | 'record_notes.export_media';

export type AgentPermission =
  | 'read:tasks'
  | 'write:tasks'
  | 'delete:tasks'
  | 'read:notes'
  | 'write:notes'
  | 'delete:notes'
  | 'read:habits'
  | 'write:habits'
  | 'delete:habits'
  | 'read:goals'
  | 'write:goals'
  | 'delete:goals'
  | 'read:calendar'
  | 'write:calendar'
  | 'delete:calendar'
  | 'share:calendar'
  | 'read:work'
  | 'write:work'
  | 'delete:work'
  | 'publish:work_to_calendar'
  | 'read:shopping'
  | 'write:shopping'
  | 'delete:shopping'
  | 'read:record-notes'
  | 'write:record-notes'
  | 'delete:record-notes'
  | 'read:record_note_transcript'
  | 'export:record_note_media';

export type AgentConfirmationLevel = 'c0' | 'c1' | 'c2' | 'c3';

export type AgentActivityStatus =
  | 'read'
  | 'proposed'
  | 'completed'
  | 'cancelled'
  | 'blocked'
  | 'expired';

export interface AgentMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isThinking?: boolean;
}

export interface AgentActorContext {
  userId: string;
  householdId?: string;
  workspaceId: string;
  permissions: AgentPermission[];
}

export interface AgentToolFieldDefinition {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

export interface AgentToolSchema {
  name: OrganizerToolName;
  domain: OrganizerToolDomain;
  description: string;
  inputs: AgentToolFieldDefinition[];
  outputs: AgentToolFieldDefinition[];
  validation: string[];
  permissions: AgentPermission[];
  confirmationLevel: AgentConfirmationLevel;
  v1Available: boolean;
}

export interface AgentBaseToolInput {
  requestId: string;
  workspaceId: string;
  actorContext: AgentActorContext;
  dryRun?: boolean;
  idempotencyKey?: string;
  confirmationToken?: string;
}

export interface AgentToolResponse<TData = unknown, TProposedChange = unknown> {
  ok: boolean;
  requiresConfirmation: boolean;
  confirmationToken?: string;
  summary: string;
  affectedResourceIds: string[];
  data?: TData;
  proposedChange?: TProposedChange;
  warnings: string[];
  auditId: string;
}

export interface AgentToolCall<TInput = Record<string, unknown>> {
  toolName: OrganizerToolName;
  input: TInput;
}

export interface AgentPendingAction<TInput = Record<string, unknown>> {
  id: string;
  toolName: OrganizerToolName;
  input: TInput;
  description: string;
  summary: string;
  confirmationLevel: AgentConfirmationLevel;
  confirmationToken: string;
  confirmationPhrase?: string;
  resourceFingerprint: string;
}

export interface AgentActivityEntry {
  id: string;
  timestamp: string;
  toolName: OrganizerToolName;
  summary: string;
  status: AgentActivityStatus;
  confirmationLevel: AgentConfirmationLevel;
  auditId: string;
  warnings: string[];
}

export interface AgentResponse {
  message: string;
  pendingAction?: AgentPendingAction;
  activity?: AgentActivityEntry;
}

export interface AgentContext {
  widgets: Widget[];
  updateWidgets: (updater: (widgets: Widget[]) => Widget[]) => void;
  currentDate: Date;
  actorContext: AgentActorContext;
}

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
  reminder?: number;
  visibility?: FamilyCalendarVisibility;
}
