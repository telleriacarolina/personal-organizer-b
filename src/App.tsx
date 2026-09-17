import { memo, useCallback, useState, useEffect, useRef, useMemo } from 'react';
import { useLocalStorageState } from '@/hooks/useLocalStorageState';
import { Button } from '@/components/ui/button';
import { Plus, ArrowsOutCardinal, GridFour, Lock, LockOpen } from '@phosphor-icons/react';
import { Toaster, toast } from 'sonner';
import { AddWidgetDialog } from '@/components/AddWidgetDialog';
import { ThemeCustomizationButton } from '@/components/ThemeCustomization';
import { AIConfigButton } from '@/components/ai/AIConfigButton';
import { OrganizerAgentButton } from '@/components/ai/OrganizerAgentButton';
import { AIChatWidget } from '@/components/widgets/AIChatWidget';
import { WorkOrganizationQuestionnaire, WorkOrganizationPreference } from '@/components/WorkOrganizationQuestionnaire';
import { TasksWidget } from '@/components/widgets/TasksWidget';
import { NotesWidget } from '@/components/widgets/NotesWidget';
import { HabitsWidget } from '@/components/widgets/HabitsWidget';
import { GoalsWidget } from '@/components/widgets/GoalsWidget';
import { CalendarWidget } from '@/components/widgets/CalendarWidget';
import { WorkWidget } from '@/components/widgets/WorkWidget';
import { ShoppingWidget } from '@/components/widgets/ShoppingWidget';
import { DailyFocusWidget } from '@/components/widgets/DailyFocusWidget';
import { RecordNoteWidget } from '@/components/widgets/RecordNoteWidget';
import { Task, Widget, WidgetAIState, WidgetType } from '@/types';
import { appendImportedCalendarEvent, type CalendarImportDraft } from '@/lib/calendar-imports';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import type { AgentContext, AgentHandlers } from '@/types/agent';

interface TaskSourceView {
  id: string;
  tasks: Task[];
}

interface CalendarSourceView {
  id: string;
}

interface AvailableWidgetView {
  id: string;
  type: Widget['type'];
}

interface WidgetRenderProps {
  widget: Widget;
  snapToGrid: boolean;
  globalLock: boolean;
  taskSources: TaskSourceView[];
  calendarSources: CalendarSourceView[];
  availableWidgets: AvailableWidgetView[];
  aiState?: WidgetAIState;
  onRemoveWidget: (widgetId: string) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onSizeChange: (widgetId: string, size: { width: number; height: number }) => void;
  onUpdateWidget: (widgetId: string, data: Partial<Widget>) => void;
  onUpdateWidgetAIState: (widgetId: string, state: WidgetAIState) => void;
  onAddCalendarEvent: (
    destinationWidgetId: string,
    event: CalendarImportDraft
  ) => { added: boolean; reason?: 'invalid-destination' | 'duplicate' };
  onDailyFocusSourceChange: (widgetId: string, sourceWidgetId: string | null) => void;
  onAddTaskToSource: (
    sourceWidgetId: string,
    task: Pick<Task, 'text' | 'priority' | 'dueDate' | 'category'>
  ) => void;
  onToggleTaskInSource: (sourceWidgetId: string, taskId: string) => void;
  onUpdateTaskPriorityInSource: (
    sourceWidgetId: string,
    taskId: string,
    priority: 'low' | 'medium' | 'high'
  ) => void;
}

const WidgetRenderer = memo(function WidgetRenderer({
  widget,
  snapToGrid,
  globalLock,
  taskSources,
  calendarSources,
  availableWidgets,
  aiState,
  onRemoveWidget,
  onDragStart,
  onDragEnd,
  onSizeChange,
  onUpdateWidget,
  onUpdateWidgetAIState,
  onAddCalendarEvent,
  onDailyFocusSourceChange,
  onAddTaskToSource,
  onToggleTaskInSource,
  onUpdateTaskPriorityInSource,
}: WidgetRenderProps) {
  const widgetProps = {
    key: widget.id,
    widgetId: widget.id,
    onRemove: () => onRemoveWidget(widget.id),
    onDragStart: globalLock ? undefined : onDragStart,
    onDragEnd: globalLock ? undefined : onDragEnd,
    size: widget.size,
    onSizeChange: (size: { width: number; height: number }) => onSizeChange(widget.id, size),
    snapToGrid,
    globalLock,
  };

  switch (widget.type) {
    case 'tasks':
      return (
        <TasksWidget
          {...widgetProps}
          tasks={widget.tasks}
          onUpdate={(tasks) => onUpdateWidget(widget.id, { tasks })}
        />
      );
    case 'notes':
      return (
        <NotesWidget
          {...widgetProps}
          notes={widget.notes}
          taskSources={taskSources}
          aiState={aiState}
          onAIStateChange={(state) => onUpdateWidgetAIState(widget.id, state)}
          onUpdate={(notes) => onUpdateWidget(widget.id, { notes })}
        />
      );
    case 'habits':
      return (
        <HabitsWidget
          {...widgetProps}
          habits={widget.habits}
          onUpdate={(habits) => onUpdateWidget(widget.id, { habits })}
        />
      );
    case 'goals':
      return (
        <GoalsWidget
          {...widgetProps}
          goals={widget.goals}
          onUpdate={(goals) => onUpdateWidget(widget.id, { goals })}
        />
      );
    case 'calendar':
      return (
        <CalendarWidget
          {...widgetProps}
          events={widget.events}
          aiState={aiState}
          onAIStateChange={(state) => onUpdateWidgetAIState(widget.id, state)}
          onUpdate={(events) => onUpdateWidget(widget.id, { events })}
        />
      );
    case 'shopping':
      return (
        <ShoppingWidget
          {...widgetProps}
          items={widget.items}
          budget={widget.budget}
          receipts={widget.receipts}
          trips={widget.trips}
          reminders={widget.reminders}
          aiState={aiState}
          onAIStateChange={(state) => onUpdateWidgetAIState(widget.id, state)}
          onUpdate={(data) => onUpdateWidget(widget.id, data)}
        />
      );
    case 'work':
      return (
        <WorkWidget
          {...widgetProps}
          clientSlots={widget.clientSlots}
          meals={widget.meals}
          timeEntries={widget.timeEntries}
          jobs={widget.jobs}
          shoppingList={widget.shoppingList}
          errands={widget.errands}
          routines={widget.routines}
          activeRoutineId={widget.activeRoutineId}
          organizationPreference={widget.organizationPreference}
          calendarSources={calendarSources}
          aiState={aiState}
          onAIStateChange={(state) => onUpdateWidgetAIState(widget.id, state)}
          onAddCalendarEvent={onAddCalendarEvent}
          onUpdate={(data) => onUpdateWidget(widget.id, data)}
        />
      );
    case 'daily-focus':
      return (
        <DailyFocusWidget
          {...widgetProps}
          taskSources={taskSources}
          sourceWidgetId={widget.sourceWidgetId}
          onSourceWidgetChange={(sourceWidgetId) =>
            onDailyFocusSourceChange(widget.id, sourceWidgetId)
          }
          aiState={aiState}
          onAIStateChange={(state) => onUpdateWidgetAIState(widget.id, state)}
          onAddTask={onAddTaskToSource}
          onToggleTask={onToggleTaskInSource}
          onPriorityChange={onUpdateTaskPriorityInSource}
        />
      );
    case 'ai-chat':
      return (
        <AIChatWidget
          {...widgetProps}
          messages={widget.messages}
          appliedSuggestionIds={widget.appliedSuggestionIds ?? []}
          onUpdate={(messages) => onUpdateWidget(widget.id, { messages })}
          onApplySuggestion={(id) =>
            onUpdateWidget(widget.id, {
              appliedSuggestionIds: [...(widget.appliedSuggestionIds ?? []), id],
            })
          }
          availableWidgets={availableWidgets}
        />
      );
    case 'record-note':
      return (
        <RecordNoteWidget
          {...widgetProps}
          records={widget.records}
          onUpdate={(records) => onUpdateWidget(widget.id, { records })}
        />
      );
    default:
      return null;
  }
}, (prev, next) => {
  if (prev.widget !== next.widget) return false;
  if (prev.snapToGrid !== next.snapToGrid || prev.globalLock !== next.globalLock) return false;
  if (prev.aiState !== next.aiState) return false;

  switch (prev.widget.type) {
    case 'notes':
    case 'daily-focus':
      return prev.taskSources === next.taskSources;
    case 'work':
      return prev.calendarSources === next.calendarSources;
    case 'ai-chat':
      return prev.availableWidgets === next.availableWidgets;
    default:
      return true;
  }
});

function App() {
  const [widgets, setWidgets] = useLocalStorageState<Widget[]>(
    'organizer-widgets',
    [],
    { persistMode: 'debounced', debounceMs: 300 }
  );
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDragHint, setShowDragHint] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showWorkQuestionnaire, setShowWorkQuestionnaire] = useState(false);
  const [snapToGrid, setSnapToGrid] = useLocalStorageState<boolean>('organizer-snap-to-grid', false);
  const [globalLock, setGlobalLock] = useLocalStorageState<boolean>('organizer-global-lock', false);
  const [widgetAIState, setWidgetAIState] = useLocalStorageState<Record<string, WidgetAIState>>(
    'organizer-widget-ai',
    {},
    { persistMode: 'debounced', debounceMs: 300 }
  );
  const dragStartTimeRef = useRef<number>(0);

  const addWidget = (type: WidgetType) => {
    if (type === 'work') {
      setShowAddDialog(false);
      setShowWorkQuestionnaire(true);
      return;
    }

    const newWidget: Widget = {
      id: Date.now().toString(),
      type,
      position: (widgets || []).length,
      ...(type === 'tasks' && { tasks: [] }),
      ...(type === 'daily-focus' && { sourceWidgetId: (widgets || []).find((widget) => widget.type === 'tasks')?.id ?? null }),
      ...(type === 'notes' && { notes: [] }),
      ...(type === 'habits' && { habits: [] }),
      ...(type === 'goals' && { goals: [] }),
      ...(type === 'calendar' && { events: [] }),
      ...(type === 'shopping' && { items: [], receipts: [], trips: [], reminders: [] }),
      ...(type === 'ai-chat' && { messages: [], appliedSuggestionIds: [] }),
      ...(type === 'record-note' && { records: [] }),
    } as Widget;

    setWidgets((current) => [...(current || []), newWidget]);
    toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} widget added!`);
  };

  const handleWorkOrganizationComplete = (preference: WorkOrganizationPreference) => {
    const newWidget: Widget = {
      id: Date.now().toString(),
      type: 'work',
      position: (widgets || []).length,
      clientSlots: [],
      meals: [],
      timeEntries: [],
      jobs: [],
      shoppingList: [],
      errands: [],
      routines: [],
      activeRoutineId: undefined,
      organizationPreference: preference,
    } as Widget;

    setWidgets((current) => [...(current || []), newWidget]);
    toast.success(`Work widget added with ${preference.type} organization!`);
  };

  const removeWidget = useCallback((id: string) => {
    setWidgets((current) => (current || []).filter((w) => w.id !== id));
    setWidgetAIState((current) => {
      const nextState = { ...(current || {}) };
      delete nextState[id];
      return nextState;
    });
    toast.success('Widget removed');
  }, [setWidgetAIState, setWidgets]);

  const updateWidget = useCallback((id: string, data: Partial<Widget>) => {
    setWidgets((current) =>
      (current || []).map((w) => (w.id === id ? { ...w, ...data } as Widget : w))
    );
  }, [setWidgets]);

  const updateWidgetSize = useCallback((id: string, size: { width: number; height: number }) => {
    setWidgets((current) =>
      (current || []).map((w) => (w.id === id ? { ...w, size } as Widget : w))
    );
  }, [setWidgets]);

  const updateTasksWidget = useCallback((sourceWidgetId: string, updater: (tasks: Task[]) => Task[]) => {
    setWidgets((current) =>
      (current || []).map((widget) =>
        widget.id === sourceWidgetId && widget.type === 'tasks'
          ? ({ ...widget, tasks: updater(widget.tasks) } as Widget)
          : widget
      )
    );
  }, [setWidgets]);

  const addTaskToSource = useCallback((
    sourceWidgetId: string,
    task: Pick<Task, 'text' | 'priority' | 'dueDate' | 'category'>
  ) => {
    updateTasksWidget(sourceWidgetId, (tasks) => [
      ...tasks,
      {
        id: Date.now().toString(),
        text: task.text,
        completed: false,
        priority: task.priority,
        dueDate: task.dueDate ?? null,
        category: task.category ?? null,
        createdAt: Date.now(),
      },
    ]);
  }, [updateTasksWidget]);

  const toggleTaskInSource = useCallback((sourceWidgetId: string, taskId: string) => {
    updateTasksWidget(sourceWidgetId, (tasks) =>
      tasks.map((task) => (task.id === taskId ? { ...task, completed: !task.completed } : task))
    );
  }, [updateTasksWidget]);

  const updateTaskPriorityInSource = useCallback((
    sourceWidgetId: string,
    taskId: string,
    priority: 'low' | 'medium' | 'high'
  ) => {
    updateTasksWidget(sourceWidgetId, (tasks) =>
      tasks.map((task) => (task.id === taskId ? { ...task, priority } : task))
    );
  }, [updateTasksWidget]);

  const addCalendarEventToSource = useCallback((
    destinationWidgetId: string,
    event: CalendarImportDraft
  ): { added: boolean; reason?: 'invalid-destination' | 'duplicate' } => {
    let result: { added: boolean; reason?: 'invalid-destination' | 'duplicate' } = {
      added: false,
      reason: 'invalid-destination',
    };

    setWidgets((current) => {
      const currentWidgets = current || [];
      const destinationWidget = currentWidgets.find(
        (widget): widget is Extract<Widget, { type: 'calendar' }> =>
          widget.id === destinationWidgetId && widget.type === 'calendar'
      );
      if (!destinationWidget) {
        result = { added: false, reason: 'invalid-destination' };
        return currentWidgets;
      }

      const importResult = appendImportedCalendarEvent(destinationWidget.events, event);
      if (!importResult.added) {
        result = { added: false, reason: 'duplicate' };
        return currentWidgets;
      }

      result = { added: true };
      return currentWidgets.map((widget) =>
        widget.id === destinationWidgetId && widget.type === 'calendar'
          ? ({ ...widget, events: importResult.events } as Widget)
          : widget
      );
    });

    return result;
  }, [setWidgets]);

  const updateDailyFocusSourceWidget = useCallback((widgetId: string, sourceWidgetId: string | null) => {
    updateWidget(widgetId, { sourceWidgetId });
  }, [updateWidget]);

  const updateWidgetAIState = useCallback((widgetId: string, state: WidgetAIState) => {
    setWidgetAIState((current) => ({
      ...(current || {}),
      [widgetId]: state,
    }));
  }, [setWidgetAIState]);

  const toggleSnapToGrid = () => {
    setSnapToGrid((current) => !current);
    toast.success(snapToGrid ? 'Grid snapping disabled' : 'Grid snapping enabled');
  };

  const toggleGlobalLock = () => {
    const newLockState = !globalLock;
    setGlobalLock(newLockState);
    
    if (newLockState) {
      setWidgets((current) =>
        (current || []).map((w) => ({
          ...w,
          size: {
            ...w.size,
            width: w.size?.width || 350,
            height: w.size?.height || 400,
            locked: true
          }
        }))
      );
      toast.success('All widgets locked');
    } else {
      setWidgets((current) =>
        (current || []).map((w) => ({
          ...w,
          size: {
            ...w.size,
            width: w.size?.width || 350,
            height: w.size?.height || 400,
            locked: false
          }
        }))
      );
      toast.success('All widgets unlocked');
    }
  };

  const handleReorder = useCallback((newOrder: Widget[]) => {
    setWidgets(newOrder.map((w, index) => ({ ...w, position: index })));
  }, [setWidgets]);

  const handleDragStart = useCallback(() => {
    dragStartTimeRef.current = Date.now();
    setIsDragging(true);
  }, []);

  const handleDragEnd = useCallback(() => {
    const dragDuration = Date.now() - dragStartTimeRef.current;
    setIsDragging(false);
    if (dragDuration > 200) {
      toast.success('Widget repositioned');
    }
  }, []);

  const currentWidgets = useMemo(() => widgets || [], [widgets]);

  const stableTaskSourceCacheRef = useRef<{
    widgets: Extract<Widget, { type: 'tasks' }>[];
    sources: TaskSourceView[];
  }>({ widgets: [], sources: [] });
  const stableCalendarSourceCacheRef = useRef<{
    widgets: Extract<Widget, { type: 'calendar' }>[];
    sources: CalendarSourceView[];
  }>({ widgets: [], sources: [] });
  const stableAvailableWidgetsRef = useRef<AvailableWidgetView[]>([]);

  const taskWidgets = currentWidgets.filter(
    (widget): widget is Extract<Widget, { type: 'tasks' }> => widget.type === 'tasks'
  );
  const taskSources =
    stableTaskSourceCacheRef.current.widgets.length === taskWidgets.length &&
    stableTaskSourceCacheRef.current.widgets.every((widget, index) => widget === taskWidgets[index])
      ? stableTaskSourceCacheRef.current.sources
      : taskWidgets.map((widget) => ({ id: widget.id, tasks: widget.tasks }));
  if (taskSources !== stableTaskSourceCacheRef.current.sources) {
    stableTaskSourceCacheRef.current = { widgets: taskWidgets, sources: taskSources };
  }

  const calendarWidgets = currentWidgets.filter(
    (widget): widget is Extract<Widget, { type: 'calendar' }> => widget.type === 'calendar'
  );
  const calendarSources =
    stableCalendarSourceCacheRef.current.widgets.length === calendarWidgets.length &&
    stableCalendarSourceCacheRef.current.widgets.every((widget, index) => widget === calendarWidgets[index])
      ? stableCalendarSourceCacheRef.current.sources
      : calendarWidgets.map((widget) => ({ id: widget.id }));
  if (calendarSources !== stableCalendarSourceCacheRef.current.sources) {
    stableCalendarSourceCacheRef.current = { widgets: calendarWidgets, sources: calendarSources };
  }

  const nextAvailableWidgets = currentWidgets.map((widget) => ({ id: widget.id, type: widget.type }));
  const availableWidgets =
    stableAvailableWidgetsRef.current.length === nextAvailableWidgets.length &&
    stableAvailableWidgetsRef.current.every(
      (widget, index) =>
        widget.id === nextAvailableWidgets[index].id && widget.type === nextAvailableWidgets[index].type
    )
      ? stableAvailableWidgetsRef.current
      : nextAvailableWidgets;
  if (availableWidgets !== stableAvailableWidgetsRef.current) {
    stableAvailableWidgetsRef.current = availableWidgets;
  }

  const agentHandlers: AgentHandlers = useMemo(() => ({
    onAddTask: (widgetId, taskData) => {
      setWidgets((current) =>
        (current || []).map((widget) =>
          widget.id === widgetId && widget.type === 'tasks'
            ? ({
                ...widget,
                tasks: [
                  ...widget.tasks,
                  {
                    id: Date.now().toString(),
                    text: taskData.text,
                    completed: false,
                    priority: taskData.priority ?? 'medium',
                    dueDate: taskData.dueDate ?? null,
                    category: taskData.category ?? null,
                    createdAt: Date.now(),
                  },
                ],
              } as Widget)
            : widget
        )
      );
      toast.success(`Added task: ${taskData.text}`);
    },
    onAddNote: (widgetId, noteData) => {
      setWidgets((current) =>
        (current || []).map((w) =>
          w.id === widgetId && w.type === 'notes'
            ? ({
                ...w,
                notes: [
                  ...w.notes,
                  {
                    id: Date.now().toString(),
                    title: noteData.title,
                    content: noteData.content,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                  },
                ],
              } as Widget)
            : w
        )
      );
      toast.success(`Note created: ${noteData.title}`);
    },
    onAddGoal: (widgetId, goalData) => {
      setWidgets((current) =>
        (current || []).map((w) =>
          w.id === widgetId && w.type === 'goals'
            ? ({
                ...w,
                goals: [
                  ...w.goals,
                  {
                    id: Date.now().toString(),
                    title: goalData.title,
                    description: goalData.description,
                    targetDate: goalData.targetDate,
                    completed: false,
                    createdAt: Date.now(),
                  },
                ],
              } as Widget)
            : w
        )
      );
      toast.success(`Goal added: ${goalData.title}`);
    },
    onAddHabit: (widgetId, habitData) => {
      setWidgets((current) =>
        (current || []).map((w) =>
          w.id === widgetId && w.type === 'habits'
            ? ({
                ...w,
                habits: [
                  ...w.habits,
                  {
                    id: Date.now().toString(),
                    name: habitData.name,
                    completions: {},
                    createdAt: Date.now(),
                  },
                ],
              } as Widget)
            : w
        )
      );
      toast.success(`Habit added: ${habitData.name}`);
    },
    onAddShoppingItem: (widgetId, itemData) => {
      setWidgets((current) =>
        (current || []).map((w) =>
          w.id === widgetId && w.type === 'shopping'
            ? ({
                ...w,
                items: [
                  ...w.items,
                  {
                    id: Date.now().toString(),
                    name: itemData.name,
                    quantity: itemData.quantity,
                    category: itemData.category ?? 'other',
                    store: undefined,
                    estimatedPrice: undefined,
                    actualPrice: undefined,
                    purchased: false,
                    priority: itemData.priority ?? 'medium',
                    notes: undefined,
                    barcode: undefined,
                    receiptId: undefined,
                    createdAt: Date.now(),
                  },
                ],
              } as Widget)
            : w
        )
      );
      toast.success(`Added to shopping: ${itemData.name}`);
    },
    onAddCalendarEvent: (widgetId, eventData) => {
      setWidgets((current) =>
        (current || []).map((w) =>
          w.id === widgetId && w.type === 'calendar'
            ? ({
                ...w,
                events: [
                  ...w.events,
                  {
                    id: Date.now().toString(),
                    title: eventData.title,
                    type: eventData.type,
                    description: eventData.description,
                    date: eventData.date,
                    startTime: eventData.startTime,
                    endTime: eventData.endTime,
                    allDay: eventData.allDay ?? false,
                    location: eventData.location,
                    createdAt: Date.now(),
                  },
                ],
              } as Widget)
            : w
        )
      );
      toast.success(`Event added: ${eventData.title}`);
    },
  }), [setWidgets]);

  const agentContext: AgentContext = useMemo(() => ({
    widgets: currentWidgets,
    handlers: agentHandlers,
    currentDate: new Date(),
  }), [currentWidgets, agentHandlers]);

  useEffect(() => {
    if (currentWidgets.length > 0 && currentWidgets.length <= 2 && !localStorage.getItem('drag-hint-shown')) {
      setShowDragHint(true);
      const timer = setTimeout(() => {
        setShowDragHint(false);
        localStorage.setItem('drag-hint-shown', 'true');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [currentWidgets.length]);

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-gradient-to-br from-primary/5 via-accent/5 to-background">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground tracking-tight">
                My Organizer
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground mt-1">
                Your personalized productivity dashboard
              </p>
            </div>
            <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
              <Button 
                onClick={toggleSnapToGrid} 
                size="lg" 
                variant={snapToGrid ? "default" : "outline"}
                className="gap-2 flex-shrink-0"
              >
                <GridFour size={20} weight={snapToGrid ? "fill" : "regular"} />
                <span className="hidden lg:inline">{snapToGrid ? 'Grid: On' : 'Grid: Off'}</span>
              </Button>
              <Button 
                onClick={toggleGlobalLock} 
                size="lg" 
                variant={globalLock ? "default" : "outline"}
                className="gap-2 flex-shrink-0"
                title={globalLock ? "Unlock all widgets" : "Lock all widgets"}
              >
                {globalLock ? (
                  <Lock size={20} weight="fill" />
                ) : (
                  <LockOpen size={20} />
                )}
                <span className="hidden lg:inline">{globalLock ? 'Locked' : 'Unlocked'}</span>
              </Button>
              <AIConfigButton />
              <OrganizerAgentButton context={agentContext} />
              <ThemeCustomizationButton />
              <Button onClick={() => setShowAddDialog(true)} size="lg" className="gap-2 flex-1 sm:flex-initial">
                <Plus size={20} />
                <span className="hidden sm:inline">Add Widget</span>
                <span className="sm:hidden">Add</span>
              </Button>
            </div>
          </div>

          <AnimatePresence>
            {showDragHint && currentWidgets.length > 1 && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mb-6 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border border-primary/30 rounded-lg p-4 flex items-center gap-3"
              >
                <motion.div
                  animate={{ 
                    rotate: [0, 10, -10, 0],
                    scale: [1, 1.1, 1]
                  }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  <ArrowsOutCardinal size={24} className="text-primary" weight="bold" />
                </motion.div>
                <p className="text-sm text-foreground font-medium">
                  Drag widgets by the <span className="font-bold">::::</span> handle to rearrange your dashboard
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {currentWidgets.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-20"
            >
              <motion.div 
                animate={{ 
                  scale: [1, 1.05, 1],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{ 
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6"
              >
                <Plus size={40} className="text-primary" />
              </motion.div>
              <h2 className="text-2xl font-semibold text-foreground mb-3">
                Welcome to Your Organizer
              </h2>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                Get started by adding your first widget. Choose from tasks, notes, habits, or
                goals to create your perfect organizational system.
              </p>
              <Button onClick={() => setShowAddDialog(true)} size="lg" className="gap-2">
                <Plus size={20} />
                Add Your First Widget
              </Button>
            </motion.div>
          ) : (
            <Reorder.Group
              axis="y"
              values={currentWidgets}
              onReorder={handleReorder}
              className={`flex flex-wrap gap-3 sm:gap-4 relative ${snapToGrid ? 'grid-snap-container' : ''}`}
            >
              {snapToGrid && (
                <div className="absolute inset-0 pointer-events-none z-0 grid-background" />
              )}
              {isDragging && !globalLock && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 pointer-events-none z-0 bg-primary/5 rounded-xl backdrop-blur-[1px]"
                />
              )}
              {currentWidgets.map((widget) => (
                <WidgetRenderer
                  key={widget.id}
                  widget={widget}
                  snapToGrid={snapToGrid}
                  globalLock={globalLock}
                  taskSources={taskSources}
                  calendarSources={calendarSources}
                  availableWidgets={availableWidgets}
                  aiState={widgetAIState?.[widget.id]}
                  onRemoveWidget={removeWidget}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onSizeChange={updateWidgetSize}
                  onUpdateWidget={updateWidget}
                  onUpdateWidgetAIState={updateWidgetAIState}
                  onAddCalendarEvent={addCalendarEventToSource}
                  onDailyFocusSourceChange={updateDailyFocusSourceWidget}
                  onAddTaskToSource={addTaskToSource}
                  onToggleTaskInSource={toggleTaskInSource}
                  onUpdateTaskPriorityInSource={updateTaskPriorityInSource}
                />
              ))}
            </Reorder.Group>
          )}
        </div>
      </div>

      <AddWidgetDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onAddWidget={addWidget}
      />

      <WorkOrganizationQuestionnaire
        open={showWorkQuestionnaire}
        onOpenChange={setShowWorkQuestionnaire}
        onComplete={handleWorkOrganizationComplete}
      />
      
      <Toaster position="bottom-right" toastOptions={{
        className: 'sm:mb-0 mb-16'
      }} />
    </div>
  );
}

export default App;