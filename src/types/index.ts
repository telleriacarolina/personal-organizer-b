export type WidgetType = 'tasks' | 'notes' | 'habits' | 'goals' | 'calendar' | 'work' | 'shopping' | 'daily-focus' | 'ai-chat';

export interface WidgetSize {
  width: number;
  height: number;
  locked?: boolean;
}

export interface BaseWidget {
  id: string;
  type: WidgetType;
  position: number;
  size?: WidgetSize;
}

export interface Task {
  id: string;
  text: string;
  completed: boolean;
  priority?: 'low' | 'medium' | 'high';
  dueDate?: string | null;
  category?: string | null;
  createdAt: number;
}

export type AIProviderMode = 'mock' | 'api' | 'off';
export type AIPrivacyMode = 'local-only' | 'remote';
export type AIInsightStatus = 'active' | 'applied' | 'dismissed';
export type AIWidgetFeature = 'tasks' | 'notes' | 'work' | 'shopping' | 'calendar';
export type AIInsightKind =
  | 'system'
  | 'task-focus'
  | 'note-summary'
  | 'note-task-extraction'
  | 'work-organization'
  | 'shopping-insight'
  | 'calendar-suggestion';
export type AIInsightActionType =
  | 'reprioritize-task'
  | 'add-tasks-to-source'
  | 'set-work-organization'
  | 'set-event-reminders'
  | 'generate-shopping-reminders';

export interface ExtractedTaskDraft {
  text: string;
  priority: 'low' | 'medium' | 'high';
  dueDate?: string | null;
  category?: string | null;
}

export interface TaskPriorityUpdate {
  taskId: string;
  priority: 'low' | 'medium' | 'high';
}

export interface EventReminderUpdate {
  eventId: string;
  reminder: number;
}

export type AIInsightActionPayload =
  | { taskUpdates: TaskPriorityUpdate[] }
  | { tasks: ExtractedTaskDraft[] }
  | { organizationPreference: WorkOrganizationPreference }
  | { reminderUpdates: EventReminderUpdate[] }
  | { generator: 'shopping-reminders' };

export interface AIInsightAction {
  id: string;
  label: string;
  type: AIInsightActionType;
  payload?: AIInsightActionPayload;
}

export interface AIInsight {
  id: string;
  kind: AIInsightKind;
  title: string;
  summary: string;
  rationale: string;
  confidence: number;
  generatedAt: number;
  status: AIInsightStatus;
  bullets?: string[];
  actions?: AIInsightAction[];
}

export interface WidgetAIState {
  widgetId: string;
  feature: AIWidgetFeature;
  generatedAt: number;
  sourceHash: string;
  providerMode: AIProviderMode;
  providerLabel: string;
  privacyMode: AIPrivacyMode;
  model: string;
  dataSummary: string[];
  insights: AIInsight[];
  error?: string;
}

export interface DailyFocusItem {
  id: string;
  title: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  dueDate: string | null;
  category: string | null;
}

export interface TasksWidget extends BaseWidget {
  type: 'tasks';
  tasks: Task[];
}

export interface DailyFocusWidget extends BaseWidget {
  type: 'daily-focus';
  sourceWidgetId?: string | null;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

export interface NotesWidget extends BaseWidget {
  type: 'notes';
  notes: Note[];
}

export interface Habit {
  id: string;
  name: string;
  completions: Record<string, boolean>;
  createdAt: number;
}

export interface HabitsWidget extends BaseWidget {
  type: 'habits';
  habits: Habit[];
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  targetDate?: number;
  completed: boolean;
  createdAt: number;
}

export interface GoalsWidget extends BaseWidget {
  type: 'goals';
  goals: Goal[];
}

export interface CalendarEvent {
  id: string;
  title: string;
  type: CalendarEntryType;
  description?: string;
  date: number;
  startTime?: string;
  endTime?: string;
  allDay?: boolean;
  location?: string;
  reminder?: number;
  reminderSent?: boolean;
  color?: string;
  createdAt: number;
}

export type CalendarEntryType = 'appointment' | 'event' | 'occasion';
export type FamilyCalendarVisibility = 'private' | 'family' | 'selected';

export interface FamilyCalendarPlannerEvent {
  id: string;
  calendarId: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  visibility: FamilyCalendarVisibility;
  selectedMembers?: string[];
  requiresApproval: boolean;
  createdBy: string;
  attendees: string[];
  location?: string;
  reminders: number[];
  color?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarWidget extends BaseWidget {
  type: 'calendar';
  events: CalendarEvent[];
}

export interface ClientSlot {
  id: string;
  clientName: string;
  date: number;
  startTime: string;
  endTime?: string;
  service?: string;
  notes?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  createdAt: number;
}

export interface WorkMeal {
  id: string;
  name: string;
  date: number;
  time: string;
  items?: string[];
  notes?: string;
  createdAt: number;
}

export interface TimeEntry {
  id: string;
  description: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  project?: string;
  createdAt: number;
}

export interface Job {
  id: string;
  title: string;
  client: string;
  description?: string;
  status: 'pending' | 'in-progress' | 'completed' | 'on-hold';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  deadline?: number;
  estimatedHours?: number;
  actualHours?: number;
  createdAt: number;
}

export interface ShoppingItem {
  id: string;
  item: string;
  quantity?: string;
  category?: string;
  purchased: boolean;
  createdAt: number;
}

export interface WorkErrand {
  id: string;
  title: string;
  description?: string;
  location?: string;
  dueDate?: number;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  createdAt: number;
}

export interface WorkRoutine {
  id: string;
  name: string;
  description?: string;
  clientSlots: ClientSlot[];
  meals: WorkMeal[];
  timeEntries: TimeEntry[];
  jobs: Job[];
  shoppingList: ShoppingItem[];
  errands: WorkErrand[];
  createdAt: number;
}

export type WorkOrganizationType = 
  | 'date'
  | 'week'
  | 'month'
  | 'time-of-day'
  | 'job-based';

export interface WorkOrganizationPreference {
  type: WorkOrganizationType;
  startTime?: string;
}

export interface WorkWidget extends BaseWidget {
  type: 'work';
  clientSlots: ClientSlot[];
  meals: WorkMeal[];
  timeEntries: TimeEntry[];
  jobs: Job[];
  shoppingList: ShoppingItem[];
  errands: WorkErrand[];
  routines?: WorkRoutine[];
  activeRoutineId?: string;
  organizationPreference?: WorkOrganizationPreference;
}

export type ShoppingCategory = 
  | 'food'
  | 'clothes'
  | 'personal-items'
  | 'work'
  | 'gifts'
  | 'home-supplies'
  | 'health'
  | 'electronics'
  | 'other';

export interface PersonalShoppingItem {
  id: string;
  name: string;
  quantity?: string;
  category: ShoppingCategory;
  store?: string;
  estimatedPrice?: number;
  actualPrice?: number;
  purchased: boolean;
  priority: 'low' | 'medium' | 'high';
  notes?: string;
  barcode?: string;
  receiptId?: string;
  createdAt: number;
  purchasedAt?: number;
}

export interface ReceiptItem {
  name: string;
  quantity?: string;
  price: number;
  category?: ShoppingCategory;
}

export interface Receipt {
  id: string;
  storeName: string;
  date: number;
  items: ReceiptItem[];
  total: number;
  tax?: number;
  subtotal?: number;
  notes?: string;
  imageData?: string;
  createdAt: number;
}

export interface ShoppingTrip {
  id: string;
  date: number;
  storeName: string;
  total: number;
  itemCount: number;
  receiptIds: string[];
}

export interface ShoppingReminder {
  id: string;
  storeName: string;
  category: ShoppingCategory;
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  nextReminderDate: number;
  averageSpend: number;
  commonItems: string[];
  enabled: boolean;
  lastTriggered?: number;
  createdAt: number;
}

export interface ShoppingWidget extends BaseWidget {
  type: 'shopping';
  items: PersonalShoppingItem[];
  budget?: number;
  receipts?: Receipt[];
  trips?: ShoppingTrip[];
  reminders?: ShoppingReminder[];
}

export interface AIChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
  /** If this message produced suggestions, they are stored here */
  suggestions?: AIInsight[];
  /** Which widget type these suggestions target */
  targetWidget?: string;
}

export interface AIChatWidget extends BaseWidget {
  type: 'ai-chat';
  messages: AIChatMessage[];
  appliedSuggestionIds?: string[];
}

export type Widget = TasksWidget | DailyFocusWidget | NotesWidget | HabitsWidget | GoalsWidget | CalendarWidget | WorkWidget | ShoppingWidget | AIChatWidget;
