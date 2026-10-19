import { z } from 'zod';
import type {
  AIChatWidget,
  CalendarWidget,
  ClientSlot,
  DailyFocusWidget,
  GoalsWidget,
  Job,
  HabitsWidget,
  AIInsight,
  AIInsightAction,
  EventReminderUpdate,
  ExtractedTaskDraft,
  NotesWidget,
  Receipt,
  ReceiptItem,
  RecordNoteWidget,
  ShoppingReminder,
  ShoppingTrip,
  ShoppingWidget,
  TaskPriorityUpdate,
  TimeEntry,
  TasksWidget,
  Widget,
  WorkErrand,
  WorkMeal,
  WorkOrganizationPreference,
  WorkRoutine,
  ShoppingItem,
  WorkWidget,
} from '@/types';
import type { WidgetDefinitions, ValidationIssue } from './widget-definition';

const baseWidgetSchema = z.object({
  id: z.string().min(1),
  position: z.number().int().nonnegative(),
  size: z
    .object({
      width: z.number().positive(),
      height: z.number().positive(),
      locked: z.boolean().optional(),
    })
    .optional(),
});

const taskSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  completed: z.boolean(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  dueDate: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  createdAt: z.number().int(),
});

const noteSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  content: z.string(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
});

const habitSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  completions: z.record(z.string(), z.boolean()),
  createdAt: z.number().int(),
});

const goalSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string(),
  targetDate: z.number().int().optional(),
  completed: z.boolean(),
  createdAt: z.number().int(),
});

const calendarEventSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    type: z.enum(['appointment', 'event', 'occasion']),
    description: z.string().optional(),
    date: z.number().int(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    allDay: z.boolean().optional(),
    location: z.string().optional(),
    reminder: z.number().int().optional(),
    reminderSent: z.boolean().optional(),
    color: z.string().optional(),
    sourceType: z.enum(['work', 'ical']).optional(),
    sourceId: z.string().optional(),
    sourceWidgetId: z.string().optional(),
    createdAt: z.number().int(),
  })
  .superRefine((event, ctx) => {
    const isAllDay = Boolean(event.allDay);
    if (isAllDay && (event.startTime || event.endTime)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'All-day events cannot include start or end times.',
      });
    }
    if (!isAllDay && event.startTime && event.endTime && event.endTime < event.startTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'End time must be after start time.',
      });
    }
  });

const shoppingItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  quantity: z.string().optional(),
  category: z.enum(['food', 'clothes', 'personal-items', 'work', 'gifts', 'home-supplies', 'health', 'electronics', 'other']),
  store: z.string().optional(),
  estimatedPrice: z.number().optional(),
  actualPrice: z.number().optional(),
  purchased: z.boolean(),
  priority: z.enum(['low', 'medium', 'high']),
  notes: z.string().optional(),
  barcode: z.string().optional(),
  receiptId: z.string().optional(),
  createdAt: z.number().int(),
  purchasedAt: z.number().int().optional(),
});

const recordSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  mediaType: z.enum(['voice', 'video', 'photo']),
  mediaId: z.string().min(1).optional(),
  dataUrl: z.string().min(1).optional(),
  duration: z.number().optional(),
  transcription: z.string().optional(),
  createdAt: z.number().int(),
});

const taskPriorityUpdateSchema: z.ZodType<TaskPriorityUpdate> = z.object({
  taskId: z.string().min(1),
  priority: z.enum(['low', 'medium', 'high']),
});

const extractedTaskDraftSchema: z.ZodType<ExtractedTaskDraft> = z.object({
  text: z.string().min(1),
  priority: z.enum(['low', 'medium', 'high']),
  dueDate: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
});

const eventReminderUpdateSchema: z.ZodType<EventReminderUpdate> = z.object({
  eventId: z.string().min(1),
  reminder: z.number().int(),
});

const workOrganizationPreferenceSchema: z.ZodType<WorkOrganizationPreference> = z.object({
  type: z.enum(['date', 'week', 'month', 'time-of-day', 'job-based']),
  startTime: z.string().optional(),
});

const aiInsightActionSchema: z.ZodType<AIInsightAction> = z.discriminatedUnion('type', [
  z.object({
    id: z.string().min(1),
    label: z.string().min(1),
    type: z.literal('reprioritize-task'),
    payload: z.object({ taskUpdates: z.array(taskPriorityUpdateSchema) }).optional(),
  }),
  z.object({
    id: z.string().min(1),
    label: z.string().min(1),
    type: z.literal('add-tasks-to-source'),
    payload: z.object({ tasks: z.array(extractedTaskDraftSchema) }).optional(),
  }),
  z.object({
    id: z.string().min(1),
    label: z.string().min(1),
    type: z.literal('set-work-organization'),
    payload: z.object({ organizationPreference: workOrganizationPreferenceSchema }).optional(),
  }),
  z.object({
    id: z.string().min(1),
    label: z.string().min(1),
    type: z.literal('set-event-reminders'),
    payload: z.object({ reminderUpdates: z.array(eventReminderUpdateSchema) }).optional(),
  }),
  z.object({
    id: z.string().min(1),
    label: z.string().min(1),
    type: z.literal('generate-shopping-reminders'),
    payload: z.object({ generator: z.literal('shopping-reminders') }).optional(),
  }),
]);

const aiInsightSchema: z.ZodType<AIInsight> = z.object({
  id: z.string().min(1),
  kind: z.enum([
    'system',
    'task-focus',
    'note-summary',
    'note-task-extraction',
    'work-organization',
    'shopping-insight',
    'calendar-suggestion',
  ]),
  title: z.string().min(1),
  summary: z.string(),
  rationale: z.string(),
  confidence: z.number(),
  generatedAt: z.number().int(),
  status: z.enum(['active', 'applied', 'dismissed']),
  bullets: z.array(z.string()).optional(),
  actions: z.array(aiInsightActionSchema).optional(),
});

const receiptItemSchema: z.ZodType<ReceiptItem> = z.object({
  name: z.string().min(1),
  quantity: z.string().optional(),
  price: z.number(),
  category: z.enum(['food', 'clothes', 'personal-items', 'work', 'gifts', 'home-supplies', 'health', 'electronics', 'other']).optional(),
});

const receiptSchema: z.ZodType<Receipt> = z.object({
  id: z.string().min(1),
  storeName: z.string().min(1),
  date: z.number().int(),
  items: z.array(receiptItemSchema),
  total: z.number(),
  tax: z.number().optional(),
  subtotal: z.number().optional(),
  notes: z.string().optional(),
  imageMediaId: z.string().optional(),
  imageData: z.string().optional(),
  imageRef: z
    .object({
      id: z.string().min(1),
      mimeType: z.string().min(1),
      byteSize: z.number().int(),
      createdAt: z.number().int(),
    })
    .optional(),
  createdAt: z.number().int(),
});

const shoppingTripSchema: z.ZodType<ShoppingTrip> = z.object({
  id: z.string().min(1),
  date: z.number().int(),
  storeName: z.string().min(1),
  total: z.number(),
  itemCount: z.number().int(),
  receiptIds: z.array(z.string().min(1)),
});

const shoppingReminderSchema: z.ZodType<ShoppingReminder> = z.object({
  id: z.string().min(1),
  storeName: z.string().min(1),
  category: z.enum(['food', 'clothes', 'personal-items', 'work', 'gifts', 'home-supplies', 'health', 'electronics', 'other']),
  frequency: z.enum(['daily', 'weekly', 'biweekly', 'monthly']),
  nextReminderDate: z.number().int(),
  averageSpend: z.number(),
  commonItems: z.array(z.string()),
  enabled: z.boolean(),
  lastTriggered: z.number().int().optional(),
  createdAt: z.number().int(),
});

const clientSlotSchema: z.ZodType<ClientSlot> = z.object({
  id: z.string().min(1),
  clientName: z.string().min(1),
  date: z.number().int(),
  startTime: z.string().min(1),
  endTime: z.string().optional(),
  service: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['scheduled', 'completed', 'cancelled']),
  createdAt: z.number().int(),
});

const workMealSchema: z.ZodType<WorkMeal> = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  date: z.number().int(),
  time: z.string().min(1),
  items: z.array(z.string()).optional(),
  notes: z.string().optional(),
  createdAt: z.number().int(),
});

const timeEntrySchema: z.ZodType<TimeEntry> = z.object({
  id: z.string().min(1),
  description: z.string().min(1),
  startTime: z.number().int(),
  endTime: z.number().int().optional(),
  duration: z.number().optional(),
  project: z.string().optional(),
  createdAt: z.number().int(),
});

const jobSchema: z.ZodType<Job> = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  client: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(['pending', 'in-progress', 'completed', 'on-hold']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  deadline: z.number().int().optional(),
  estimatedHours: z.number().optional(),
  actualHours: z.number().optional(),
  createdAt: z.number().int(),
});

const workShoppingItemSchema: z.ZodType<ShoppingItem> = z.object({
  id: z.string().min(1),
  item: z.string().min(1),
  quantity: z.string().optional(),
  category: z.string().optional(),
  purchased: z.boolean(),
  createdAt: z.number().int(),
});

const workErrandSchema: z.ZodType<WorkErrand> = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  location: z.string().optional(),
  dueDate: z.number().int().optional(),
  completed: z.boolean(),
  priority: z.enum(['low', 'medium', 'high']),
  createdAt: z.number().int(),
});

const workRoutineSchema: z.ZodType<WorkRoutine> = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  clientSlots: z.array(clientSlotSchema),
  meals: z.array(workMealSchema),
  timeEntries: z.array(timeEntrySchema),
  jobs: z.array(jobSchema),
  shoppingList: z.array(workShoppingItemSchema),
  errands: z.array(workErrandSchema),
  createdAt: z.number().int(),
});

const aiMessageSchema = z.object({
  id: z.string().min(1),
  role: z.enum(['user', 'assistant']),
  text: z.string(),
  timestamp: z.number().int(),
  suggestions: z.array(aiInsightSchema).optional(),
  targetWidget: z.string().optional(),
});

const tasksWidgetSchema: z.ZodType<TasksWidget> = baseWidgetSchema.extend({ type: z.literal('tasks'), tasks: z.array(taskSchema) });
const dailyFocusWidgetSchema: z.ZodType<DailyFocusWidget> = baseWidgetSchema.extend({ type: z.literal('daily-focus'), sourceWidgetId: z.string().nullable().optional() });
const notesWidgetSchema: z.ZodType<NotesWidget> = baseWidgetSchema.extend({ type: z.literal('notes'), notes: z.array(noteSchema) });
const habitsWidgetSchema: z.ZodType<HabitsWidget> = baseWidgetSchema.extend({ type: z.literal('habits'), habits: z.array(habitSchema) });
const goalsWidgetSchema: z.ZodType<GoalsWidget> = baseWidgetSchema.extend({ type: z.literal('goals'), goals: z.array(goalSchema) });
const calendarWidgetSchema: z.ZodType<CalendarWidget> = baseWidgetSchema.extend({ type: z.literal('calendar'), events: z.array(calendarEventSchema) });
const shoppingWidgetSchema: z.ZodType<ShoppingWidget> = baseWidgetSchema.extend({
  type: z.literal('shopping'),
  items: z.array(shoppingItemSchema),
  budget: z.number().optional(),
  receipts: z.array(receiptSchema).optional(),
  trips: z.array(shoppingTripSchema).optional(),
  reminders: z.array(shoppingReminderSchema).optional(),
});
const aiChatWidgetSchema: z.ZodType<AIChatWidget> = baseWidgetSchema.extend({
  type: z.literal('ai-chat'),
  messages: z.array(aiMessageSchema),
  appliedSuggestionIds: z.array(z.string()).optional(),
});
const recordNoteWidgetSchema: z.ZodType<RecordNoteWidget> = baseWidgetSchema.extend({ type: z.literal('record-note'), records: z.array(recordSchema) });
const workWidgetSchema: z.ZodType<WorkWidget> = baseWidgetSchema.extend({
  type: z.literal('work'),
  clientSlots: z.array(clientSlotSchema),
  meals: z.array(workMealSchema),
  timeEntries: z.array(timeEntrySchema),
  jobs: z.array(jobSchema),
  shoppingList: z.array(workShoppingItemSchema),
  errands: z.array(workErrandSchema),
  routines: z.array(workRoutineSchema).optional(),
  activeRoutineId: z.string().optional(),
  activeTimerEntryId: z.string().nullable().optional(),
  calendarSourceWidgetId: z.string().nullable().optional(),
  organizationPreference: workOrganizationPreferenceSchema.optional(),
});

const toIssues = (result: z.SafeParseError<unknown>): ValidationIssue[] =>
  result.error.issues.map((issue) => ({
    field: issue.path.join('.') || 'widget',
    message: issue.message,
    severity: 'error',
  }));

const ensurePosition = <T extends Widget>(widget: T): T => ({
  ...widget,
  position: Number.isFinite(widget.position) ? widget.position : 0,
});

export const widgetDefinitions: WidgetDefinitions = {
  tasks: {
    type: 'tasks',
    schema: tasksWidgetSchema,
    defaultState: ({ id, position }) => ({ id, type: 'tasks', position, tasks: [] }),
    normalize: (widget) => ensurePosition({ ...widget, tasks: widget.tasks ?? [] }),
    validate: (widget) => {
      const parsed = tasksWidgetSchema.safeParse(widget);
      return parsed.success ? [] : toIssues(parsed);
    },
    migrate: (widget, _context) => tasksWidgetSchema.parse(widget),
    capabilities: { canResize: true, canLockSize: true, supportsAI: false },
  },
  'daily-focus': {
    type: 'daily-focus',
    schema: dailyFocusWidgetSchema,
    defaultState: ({ id, position }) => ({ id, type: 'daily-focus', position, sourceWidgetId: null }),
    normalize: (widget) => ensurePosition({ ...widget, sourceWidgetId: widget.sourceWidgetId ?? null }),
    validate: (widget) => {
      const parsed = dailyFocusWidgetSchema.safeParse(widget);
      return parsed.success ? [] : toIssues(parsed);
    },
    migrate: (widget, _context) => dailyFocusWidgetSchema.parse(widget),
    capabilities: { canResize: true, canLockSize: true, supportsAI: true },
  },
  notes: {
    type: 'notes',
    schema: notesWidgetSchema,
    defaultState: ({ id, position }) => ({ id, type: 'notes', position, notes: [] }),
    normalize: (widget) => ensurePosition({ ...widget, notes: widget.notes ?? [] }),
    validate: (widget) => {
      const parsed = notesWidgetSchema.safeParse(widget);
      return parsed.success ? [] : toIssues(parsed);
    },
    migrate: (widget, _context) => notesWidgetSchema.parse(widget),
    capabilities: { canResize: true, canLockSize: true, supportsAI: true },
  },
  habits: {
    type: 'habits',
    schema: habitsWidgetSchema,
    defaultState: ({ id, position }) => ({ id, type: 'habits', position, habits: [] }),
    normalize: (widget) => ensurePosition({ ...widget, habits: widget.habits ?? [] }),
    validate: (widget) => {
      const parsed = habitsWidgetSchema.safeParse(widget);
      return parsed.success ? [] : toIssues(parsed);
    },
    migrate: (widget, _context) => habitsWidgetSchema.parse(widget),
    capabilities: { canResize: true, canLockSize: true, supportsAI: false },
  },
  goals: {
    type: 'goals',
    schema: goalsWidgetSchema,
    defaultState: ({ id, position }) => ({ id, type: 'goals', position, goals: [] }),
    normalize: (widget) => ensurePosition({ ...widget, goals: widget.goals ?? [] }),
    validate: (widget) => {
      const parsed = goalsWidgetSchema.safeParse(widget);
      return parsed.success ? [] : toIssues(parsed);
    },
    migrate: (widget, _context) => goalsWidgetSchema.parse(widget),
    capabilities: { canResize: true, canLockSize: true, supportsAI: false },
  },
  calendar: {
    type: 'calendar',
    schema: calendarWidgetSchema,
    defaultState: ({ id, position }) => ({ id, type: 'calendar', position, events: [] }),
    normalize: (widget) =>
      ensurePosition({
        ...widget,
        events: widget.events.map((event) => ({
          ...event,
          allDay: event.allDay ?? false,
          reminderSent: event.reminderSent ?? false,
        })),
      }),
    validate: (widget) => {
      const parsed = calendarWidgetSchema.safeParse(widget);
      return parsed.success ? [] : toIssues(parsed);
    },
    migrate: (widget, _context) => calendarWidgetSchema.parse(widget),
    capabilities: { canResize: true, canLockSize: true, supportsAI: true, supportsImport: true, supportsSync: true },
  },
  shopping: {
    type: 'shopping',
    schema: shoppingWidgetSchema,
    defaultState: ({ id, position }) => ({ id, type: 'shopping', position, items: [], receipts: [], trips: [], reminders: [] }),
    normalize: (widget) =>
      ensurePosition({
        ...widget,
        items: widget.items ?? [],
        receipts: widget.receipts ?? [],
        trips: widget.trips ?? [],
        reminders: widget.reminders ?? [],
      }),
    validate: (widget) => {
      const parsed = shoppingWidgetSchema.safeParse(widget);
      return parsed.success ? [] : toIssues(parsed);
    },
    migrate: (widget, _context) => shoppingWidgetSchema.parse(widget),
    capabilities: { canResize: true, canLockSize: true, supportsAI: true },
  },
  work: {
    type: 'work',
    schema: workWidgetSchema,
    defaultState: ({ id, position }) => ({
      id,
      type: 'work',
      position,
      clientSlots: [],
      meals: [],
      timeEntries: [],
      jobs: [],
      shoppingList: [],
      errands: [],
      routines: [],
      activeRoutineId: undefined,
      activeTimerEntryId: null,
      calendarSourceWidgetId: null,
      organizationPreference: undefined,
    }),
    normalize: (widget) =>
      ensurePosition({
        ...widget,
        clientSlots: widget.clientSlots ?? [],
        meals: widget.meals ?? [],
        timeEntries: widget.timeEntries ?? [],
        jobs: widget.jobs ?? [],
        shoppingList: widget.shoppingList ?? [],
        errands: widget.errands ?? [],
        routines: widget.routines ?? [],
        activeRoutineId: widget.activeRoutineId,
        activeTimerEntryId: widget.activeTimerEntryId ?? null,
        calendarSourceWidgetId: widget.calendarSourceWidgetId ?? null,
        organizationPreference: widget.organizationPreference,
      }),
    validate: (widget) => {
      const parsed = workWidgetSchema.safeParse(widget);
      return parsed.success ? [] : toIssues(parsed);
    },
    migrate: (widget, _context) => workWidgetSchema.parse(widget),
    capabilities: { canResize: true, canLockSize: true, supportsAI: true, supportsImport: true },
  },
  'ai-chat': {
    type: 'ai-chat',
    schema: aiChatWidgetSchema,
    defaultState: ({ id, position }) => ({ id, type: 'ai-chat', position, messages: [], appliedSuggestionIds: [] }),
    normalize: (widget) => ensurePosition({ ...widget, messages: widget.messages ?? [], appliedSuggestionIds: widget.appliedSuggestionIds ?? [] }),
    validate: (widget) => {
      const parsed = aiChatWidgetSchema.safeParse(widget);
      return parsed.success ? [] : toIssues(parsed);
    },
    migrate: (widget, _context) => aiChatWidgetSchema.parse(widget),
    capabilities: { canResize: true, canLockSize: true, supportsAI: false },
  },
  'record-note': {
    type: 'record-note',
    schema: recordNoteWidgetSchema,
    defaultState: ({ id, position }) => ({ id, type: 'record-note', position, records: [] }),
    normalize: (widget) => ensurePosition({ ...widget, records: widget.records ?? [] }),
    validate: (widget) => {
      const parsed = recordNoteWidgetSchema.safeParse(widget);
      return parsed.success ? [] : toIssues(parsed);
    },
    migrate: (widget, _context) => recordNoteWidgetSchema.parse(widget),
    capabilities: { canResize: true, canLockSize: true, supportsAI: false },
  },
};

export const widgetDefinitionList = Object.values(widgetDefinitions);

export const normalizeWidget = (widget: Widget): Widget => widgetDefinitions[widget.type].normalize(widget as never);

export const validateWidget = (widget: Widget): ValidationIssue[] => widgetDefinitions[widget.type].validate(widget as never);
