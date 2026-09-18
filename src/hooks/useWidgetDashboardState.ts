import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useLocalStorageState } from '@/hooks/useLocalStorageState';
import type { Task, Widget, WidgetAIState, WidgetType } from '@/types';
import type { WorkOrganizationPreference } from '@/components/WorkOrganizationQuestionnaire';
import type { AgentHandlers } from '@/types/agent';
import type { CalendarImportDraft } from '@/lib/calendar-imports';
import { executeWidgetCommand } from '@/lib/widgets/widget-commands';

const withNormalizedPositions = (widgets: Widget[]) =>
  widgets.map((widget, position) => ({ ...widget, position }));

export function useWidgetDashboardState() {
  const [widgets, setWidgets] = useLocalStorageState<Widget[]>('organizer-widgets', []);
  const [snapToGrid, setSnapToGrid] = useLocalStorageState<boolean>('organizer-snap-to-grid', false);
  const [globalLock, setGlobalLock] = useLocalStorageState<boolean>('organizer-global-lock', false);
  const [widgetAIState, setWidgetAIState] = useLocalStorageState<Record<string, WidgetAIState>>('organizer-widget-ai', {});
  const [showDragHint, setShowDragHint] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartTimeRef = useRef<number>(0);

  const currentWidgets = useMemo(() => widgets || [], [widgets]);

  useEffect(() => {
    setWidgets((current) => {
      const normalizedCurrent = current || [];
      const result = executeWidgetCommand(normalizedCurrent, { type: 'sync' });
      return result.changed ? result.widgets : normalizedCurrent;
    });
  }, [setWidgets]);

  const addWidget = (type: WidgetType) => {
    const result = executeWidgetCommand(currentWidgets, {
      type: 'create',
      widgetType: type,
      patch:
        type === 'daily-focus'
          ? ({ sourceWidgetId: currentWidgets.find((widget) => widget.type === 'tasks')?.id ?? null } as Partial<Widget>)
          : undefined,
    });

    if (!result.changed) {
      return;
    }

    setWidgets(result.widgets);
    toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} widget added!`);
  };

  const handleWorkOrganizationComplete = (preference: WorkOrganizationPreference) => {
    const result = executeWidgetCommand(currentWidgets, {
      type: 'create',
      widgetType: 'work',
      patch: {
        organizationPreference: preference,
        routines: [],
        activeRoutineId: undefined,
      } as Partial<Widget>,
    });

    if (!result.changed) return;
    setWidgets(result.widgets);
    toast.success(`Work widget added with ${preference.type} organization!`);
  };

  const removeWidget = (widgetId: string) => {
    const result = executeWidgetCommand(currentWidgets, { type: 'delete', widgetId });
    if (!result.changed) return;

    setWidgets(result.widgets);
    setWidgetAIState((current) => {
      const nextState = { ...(current || {}) };
      delete nextState[widgetId];
      return nextState;
    });
    toast.success('Widget removed');
  };

  const updateWidget = (widgetId: string, patch: Partial<Widget>) => {
    const result = executeWidgetCommand(currentWidgets, { type: 'update', widgetId, patch });
    if (!result.changed) return;
    setWidgets(result.widgets);
  };

  const updateWidgetSize = (widgetId: string, size: { width: number; height: number; locked?: boolean }) => {
    updateWidget(widgetId, { size } as Partial<Widget>);
  };

  const updateTasksWidget = (sourceWidgetId: string, updater: (tasks: Task[]) => Task[]) => {
    const sourceWidget = currentWidgets.find((widget) => widget.id === sourceWidgetId && widget.type === 'tasks');
    if (!sourceWidget || sourceWidget.type !== 'tasks') return;
    updateWidget(sourceWidgetId, { tasks: updater(sourceWidget.tasks) } as Partial<Widget>);
  };

  const addTaskToSource = (sourceWidgetId: string, task: Pick<Task, 'text' | 'priority' | 'dueDate' | 'category'>) => {
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
  };

  const toggleTaskInSource = (sourceWidgetId: string, taskId: string) => {
    updateTasksWidget(sourceWidgetId, (tasks) => tasks.map((task) => (task.id === taskId ? { ...task, completed: !task.completed } : task)));
  };

  const updateTaskPriorityInSource = (sourceWidgetId: string, taskId: string, priority: 'low' | 'medium' | 'high') => {
    updateTasksWidget(sourceWidgetId, (tasks) => tasks.map((task) => (task.id === taskId ? { ...task, priority } : task)));
  };

  const addCalendarEventToSource = (
    destinationWidgetId: string,
    event: CalendarImportDraft,
  ): { added: boolean; reason?: 'invalid-destination' | 'duplicate' } => {
    const result = executeWidgetCommand(currentWidgets, {
      type: 'import',
      destinationWidgetId,
      payload: event,
    });

    if (result.changed) {
      setWidgets(result.widgets);
    }

    return {
      added: result.meta?.added ?? false,
      reason: result.meta?.reason ?? 'invalid-destination',
    };
  };

  const updateDailyFocusSourceWidget = (widgetId: string, sourceWidgetId: string | null) => {
    updateWidget(widgetId, { sourceWidgetId } as Partial<Widget>);
  };

  const updateWidgetAIState = (widgetId: string, state: WidgetAIState) => {
    setWidgetAIState((current) => ({
      ...(current || {}),
      [widgetId]: state,
    }));
  };

  const updateWidgetsForAgent = (updater: (widgets: Widget[]) => Widget[]) => {
    setWidgets((current) => updater(current || []));
  };

  const toggleSnapToGrid = () => {
    setSnapToGrid((current) => !current);
    toast.success(snapToGrid ? 'Grid snapping disabled' : 'Grid snapping enabled');
  };

  const toggleGlobalLock = () => {
    const newLockState = !globalLock;
    setGlobalLock(newLockState);

    setWidgets((current) =>
      (current || []).map((widget) => ({
        ...widget,
        size: {
          ...widget.size,
          width: widget.size?.width || 350,
          height: widget.size?.height || 400,
          locked: newLockState,
        },
      })),
    );

    toast.success(newLockState ? 'All widgets locked' : 'All widgets unlocked');
  };

  const handleReorder = (newOrder: Widget[]) => {
    setWidgets(withNormalizedPositions(newOrder));
  };

  const handleDragStart = () => {
    dragStartTimeRef.current = Date.now();
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    const dragDuration = Date.now() - dragStartTimeRef.current;
    setIsDragging(false);
    if (dragDuration > 200) {
      toast.success('Widget repositioned');
    }
  };

  const taskSources = useMemo(
    () =>
      currentWidgets
        .filter((widget): widget is Extract<Widget, { type: 'tasks' }> => widget.type === 'tasks')
        .map((widget) => ({ id: widget.id, tasks: widget.tasks })),
    [currentWidgets],
  );

  const calendarSources = useMemo(
    () =>
      currentWidgets
        .filter((widget): widget is Extract<Widget, { type: 'calendar' }> => widget.type === 'calendar')
        .map((widget) => ({ id: widget.id })),
    [currentWidgets],
  );

  const agentHandlers: AgentHandlers = useMemo(
    () => ({
      onAddTask: (widgetId, taskData) => addTaskToSource(widgetId, taskData),
      onAddNote: (widgetId, noteData) => {
        const widget = currentWidgets.find((w) => w.id === widgetId && w.type === 'notes');
        if (!widget || widget.type !== 'notes') return;
        updateWidget(widgetId, {
          notes: [
            ...widget.notes,
            {
              id: Date.now().toString(),
              title: noteData.title,
              content: noteData.content,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
          ],
        } as Partial<Widget>);
        toast.success(`Note created: ${noteData.title}`);
      },
      onAddGoal: (widgetId, goalData) => {
        const widget = currentWidgets.find((w) => w.id === widgetId && w.type === 'goals');
        if (!widget || widget.type !== 'goals') return;
        updateWidget(widgetId, {
          goals: [
            ...widget.goals,
            {
              id: Date.now().toString(),
              title: goalData.title,
              description: goalData.description,
              targetDate: goalData.targetDate,
              completed: false,
              createdAt: Date.now(),
            },
          ],
        } as Partial<Widget>);
        toast.success(`Goal added: ${goalData.title}`);
      },
      onAddHabit: (widgetId, habitData) => {
        const widget = currentWidgets.find((w) => w.id === widgetId && w.type === 'habits');
        if (!widget || widget.type !== 'habits') return;
        updateWidget(widgetId, {
          habits: [
            ...widget.habits,
            {
              id: Date.now().toString(),
              name: habitData.name,
              completions: {},
              createdAt: Date.now(),
            },
          ],
        } as Partial<Widget>);
        toast.success(`Habit added: ${habitData.name}`);
      },
      onAddShoppingItem: (widgetId, itemData) => {
        const widget = currentWidgets.find((w) => w.id === widgetId && w.type === 'shopping');
        if (!widget || widget.type !== 'shopping') return;
        updateWidget(widgetId, {
          items: [
            ...widget.items,
            {
              id: Date.now().toString(),
              name: itemData.name,
              quantity: itemData.quantity,
              category: itemData.category ?? 'other',
              purchased: false,
              priority: itemData.priority ?? 'medium',
              createdAt: Date.now(),
            },
          ],
        } as Partial<Widget>);
        toast.success(`Added to shopping: ${itemData.name}`);
      },
      onAddCalendarEvent: (widgetId, eventData) => {
        const widget = currentWidgets.find((w) => w.id === widgetId && w.type === 'calendar');
        if (!widget || widget.type !== 'calendar') return;
        updateWidget(widgetId, {
          events: [
            ...widget.events,
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
        } as Partial<Widget>);
        toast.success(`Event added: ${eventData.title}`);
      },
    }),
    [addTaskToSource, currentWidgets, updateWidget],
  );

  return {
    currentWidgets,
    snapToGrid,
    globalLock,
    widgetAIState,
    showDragHint,
    setShowDragHint,
    isDragging,
    addWidget,
    handleWorkOrganizationComplete,
    removeWidget,
    updateWidget,
    updateWidgetSize,
    addTaskToSource,
    toggleTaskInSource,
    updateTaskPriorityInSource,
    addCalendarEventToSource,
    updateDailyFocusSourceWidget,
    updateWidgetAIState,
    updateWidgetsForAgent,
    toggleSnapToGrid,
    toggleGlobalLock,
    handleReorder,
    handleDragStart,
    handleDragEnd,
    taskSources,
    calendarSources,
    agentHandlers,
  };
}
