export type WidgetType = 'tasks' | 'notes' | 'habits' | 'goals' | 'calendar';

export interface BaseWidget {
  id: string;
  type: WidgetType;
  position: number;
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

export type Widget = TasksWidget | NotesWidget | HabitsWidget | GoalsWidget | CalendarWidget;
