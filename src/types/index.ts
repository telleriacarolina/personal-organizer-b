export type WidgetType = 'tasks' | 'notes' | 'habits' | 'goals' | 'calendar' | 'work';

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
  createdAt: number;
}

export interface TasksWidget extends BaseWidget {
  type: 'tasks';
  tasks: Task[];
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
  description?: string;
  date: number;
  startTime?: string;
  endTime?: string;
  reminder?: number;
  reminderSent?: boolean;
  color?: string;
  createdAt: number;
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

export type Widget = TasksWidget | NotesWidget | HabitsWidget | GoalsWidget | CalendarWidget | WorkWidget;
