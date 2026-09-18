import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
import { getOrganizerAgentToolSchemas } from '@/lib/organizer-agent-broker';
import { createId } from '@/lib/id';
import { applyGlobalLockState, toggleGlobalLockValue } from '@/lib/dashboard-state';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import type { AgentContext } from '@/types/agent';

type WidgetOfType<TType extends Widget['type']> = Extract<Widget, { type: TType }>;

function App() {
  const [widgets, setWidgets] = useLocalStorageState<Widget[]>('organizer-widgets', []);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDragHint, setShowDragHint] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showWorkQuestionnaire, setShowWorkQuestionnaire] = useState(false);
  const [snapToGrid, setSnapToGrid] = useLocalStorageState<boolean>('organizer-snap-to-grid', false);
  const [globalLock, setGlobalLock] = useLocalStorageState<boolean>('organizer-global-lock', false);
  const [widgetAIState, setWidgetAIState] = useLocalStorageState<Record<string, WidgetAIState>>('organizer-widget-ai', {});
  const dragStartTimeRef = useRef<number>(0);
  const pendingSnapToGridToastRef = useRef<string | null>(null);
  const pendingGlobalLockToastRef = useRef<string | null>(null);

  const addWidget = (type: WidgetType) => {
    if (type === 'work') {
      setShowAddDialog(false);
      setShowWorkQuestionnaire(true);
      return;
    }

    setWidgets((current) => {
      const currentWidgets = current || [];
      const newWidget: Widget = {
        id: createId(`${type}-widget`),
        type,
        position: currentWidgets.length,
        ...(type === 'tasks' && { tasks: [] }),
        ...(type === 'daily-focus' && {
          sourceWidgetId: currentWidgets.find((widget) => widget.type === 'tasks')?.id ?? null,
        }),
        ...(type === 'notes' && { notes: [] }),
        ...(type === 'habits' && { habits: [] }),
        ...(type === 'goals' && { goals: [] }),
        ...(type === 'calendar' && { events: [] }),
        ...(type === 'shopping' && { items: [], receipts: [], trips: [], reminders: [] }),
        ...(type === 'ai-chat' && { messages: [], appliedSuggestionIds: [] }),
        ...(type === 'record-note' && { records: [] }),
      } as Widget;

      return [...currentWidgets, newWidget];
    });
    toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} widget added!`);
  };

  const handleWorkOrganizationComplete = (preference: WorkOrganizationPreference) => {
    setWidgets((current) => {
      const currentWidgets = current || [];
      const newWidget: Widget = {
        id: createId('work-widget'),
        type: 'work',
        position: currentWidgets.length,
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
        organizationPreference: preference,
      } as Widget;

      return [...currentWidgets, newWidget];
    });
    toast.success(`Work widget added with ${preference.type} organization!`);
  };

  const mutateWidgets = useCallback((mutation: (current: Widget[]) => Widget[]) => {
    setWidgets((current) => mutation(current || []));
  }, [setWidgets]);

  const mutateTypedWidget = useCallback(
    <TType extends Widget['type']>(
      id: string,
      type: TType,
      mutation: (widget: WidgetOfType<TType>) => WidgetOfType<TType>,
    ) => {
      mutateWidgets((current) =>
        current.map((widget) =>
          widget.id === id && widget.type === type
            ? mutation(widget as WidgetOfType<TType>)
            : widget,
        ),
      );
    },
    [mutateWidgets],
  );

  const removeWidget = (id: string) => {
    mutateWidgets((current) => current.filter((widget) => widget.id !== id));
    setWidgetAIState((current) => {
      const nextState = { ...(current || {}) };
      delete nextState[id];
      return nextState;
    });
    toast.success('Widget removed');
  };

  const updateWidgetSize = (id: string, size: { width: number; height: number }) => {
    mutateWidgets((current) =>
      current.map((widget) => (widget.id === id ? { ...widget, size } : widget)),
    );
  };

  const updateTasksWidget = (sourceWidgetId: string, updater: (tasks: Task[]) => Task[]) => {
    mutateWidgets((current) =>
      current.map((widget) =>
        widget.id === sourceWidgetId && widget.type === 'tasks'
          ? ({ ...widget, tasks: updater(widget.tasks) } as Widget)
          : widget
      ),
    );
  };

  const addTaskToSource = (
    sourceWidgetId: string,
    task: Pick<Task, 'text' | 'priority' | 'dueDate' | 'category'>
  ) => {
    updateTasksWidget(sourceWidgetId, (tasks) => [
      ...tasks,
      {
        id: createId('task'),
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
    updateTasksWidget(sourceWidgetId, (tasks) =>
      tasks.map((task) => (task.id === taskId ? { ...task, completed: !task.completed } : task))
    );
  };

  const updateTaskPriorityInSource = (
    sourceWidgetId: string,
    taskId: string,
    priority: 'low' | 'medium' | 'high'
  ) => {
    updateTasksWidget(sourceWidgetId, (tasks) =>
      tasks.map((task) => (task.id === taskId ? { ...task, priority } : task))
    );
  };

  const addCalendarEventToSource = (
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
  };

  const updateDailyFocusSourceWidget = (widgetId: string, sourceWidgetId: string | null) => {
    mutateTypedWidget(widgetId, 'daily-focus', (widget) => ({ ...widget, sourceWidgetId }));
  };

  const updateWidgetAIState = (widgetId: string, state: WidgetAIState) => {
    setWidgetAIState((current) => ({
      ...(current || {}),
      [widgetId]: state,
    }));
  };

  const toggleSnapToGrid = () => {
    setSnapToGrid((current) => {
      const next = !current;
      pendingSnapToGridToastRef.current = next ? 'Grid snapping enabled' : 'Grid snapping disabled';
      return next;
    });
  };

  const toggleGlobalLock = () => {
    setGlobalLock((current) => {
      const next = toggleGlobalLockValue(current);
      pendingGlobalLockToastRef.current = next ? 'All widgets locked' : 'All widgets unlocked';
      return next;
    });
  };

  const handleReorder = (newOrder: Widget[]) => {
    mutateWidgets(() => newOrder.map((widget, index) => ({ ...widget, position: index })));
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

  const currentWidgets = useMemo(() => widgets || [], [widgets]);
  const taskSources = currentWidgets
    .filter((widget): widget is Extract<Widget, { type: 'tasks' }> => widget.type === 'tasks')
    .map((widget) => ({ id: widget.id, tasks: widget.tasks }));
  const calendarSources = currentWidgets
    .filter((widget): widget is Extract<Widget, { type: 'calendar' }> => widget.type === 'calendar')
    .map((widget) => ({ id: widget.id }));

  const agentPermissions = useMemo(
    () => Array.from(new Set(getOrganizerAgentToolSchemas().flatMap((schema) => schema.permissions))),
    [],
  );

  const agentContext: AgentContext = useMemo(() => ({
    widgets: currentWidgets,
    updateWidgets: (updater) => {
      setWidgets((current) => updater(current || []));
    },
    currentDate: new Date(),
    actorContext: {
      userId: 'local-user',
      workspaceId: 'personal-organizer',
      permissions: agentPermissions,
    },
  }), [agentPermissions, currentWidgets, setWidgets]);

  useEffect(() => {
    mutateWidgets((current) => applyGlobalLockState(current, globalLock));
    if (pendingGlobalLockToastRef.current) {
      toast.success(pendingGlobalLockToastRef.current);
      pendingGlobalLockToastRef.current = null;
    }
  }, [globalLock, mutateWidgets]);

  useEffect(() => {
    if (pendingSnapToGridToastRef.current) {
      toast.success(pendingSnapToGridToastRef.current);
      pendingSnapToGridToastRef.current = null;
    }
  }, [snapToGrid]);

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
              {currentWidgets.map((widget) => {
                const widgetProps = {
                  key: widget.id,
                  widgetId: widget.id,
                  onRemove: () => removeWidget(widget.id),
                  onDragStart: globalLock ? undefined : handleDragStart,
                  onDragEnd: globalLock ? undefined : handleDragEnd,
                  size: widget.size,
                  onSizeChange: (size: { width: number; height: number }) => updateWidgetSize(widget.id, size),
                };

                switch (widget.type) {
                  case 'tasks':
                    return (
                      <TasksWidget
                        {...widgetProps}
                        tasks={widget.tasks}
                        onUpdate={(mutation) =>
                          mutateTypedWidget(widget.id, 'tasks', (current) => ({
                            ...current,
                            tasks: mutation(current.tasks),
                          }))
                        }
                      />
                    );
                  case 'notes':
                    return (
                      <NotesWidget
                        {...widgetProps}
                        notes={widget.notes}
                        taskSources={taskSources}
                        aiState={widgetAIState?.[widget.id]}
                        onAIStateChange={(state) => updateWidgetAIState(widget.id, state)}
                        onUpdate={(mutation) =>
                          mutateTypedWidget(widget.id, 'notes', (current) => ({
                            ...current,
                            notes: mutation(current.notes),
                          }))
                        }
                      />
                    );
                  case 'habits':
                    return (
                      <HabitsWidget
                        {...widgetProps}
                        habits={widget.habits}
                        onUpdate={(mutation) =>
                          mutateTypedWidget(widget.id, 'habits', (current) => ({
                            ...current,
                            habits: mutation(current.habits),
                          }))
                        }
                      />
                    );
                  case 'goals':
                    return (
                      <GoalsWidget
                        {...widgetProps}
                        goals={widget.goals}
                        onUpdate={(mutation) =>
                          mutateTypedWidget(widget.id, 'goals', (current) => ({
                            ...current,
                            goals: mutation(current.goals),
                          }))
                        }
                      />
                    );
                  case 'calendar':
                    return (
                      <CalendarWidget
                        {...widgetProps}
                        events={widget.events}
                        aiState={widgetAIState?.[widget.id]}
                        onAIStateChange={(state) => updateWidgetAIState(widget.id, state)}
                        onUpdate={(mutation) =>
                          mutateTypedWidget(widget.id, 'calendar', (current) => ({
                            ...current,
                            events: mutation(current.events),
                          }))
                        }
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
                        aiState={widgetAIState?.[widget.id]}
                        onAIStateChange={(state) => updateWidgetAIState(widget.id, state)}
                        onUpdate={(updater) =>
                          mutateTypedWidget(widget.id, 'shopping', (current) => ({
                            ...current,
                            ...updater({
                              items: current.items,
                              budget: current.budget,
                              receipts: current.receipts,
                              trips: current.trips,
                              reminders: current.reminders,
                            }),
                          }))
                        }
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
                        activeTimerEntryId={widget.activeTimerEntryId}
                        calendarSourceWidgetId={widget.calendarSourceWidgetId}
                        organizationPreference={widget.organizationPreference}
                        calendarSources={calendarSources}
                        aiState={widgetAIState?.[widget.id]}
                        onAIStateChange={(state) => updateWidgetAIState(widget.id, state)}
                        onAddCalendarEvent={addCalendarEventToSource}
                        onUpdate={(updater) =>
                          mutateTypedWidget(widget.id, 'work', (current) => ({
                            ...current,
                            ...updater({
                              clientSlots: current.clientSlots,
                              meals: current.meals,
                              timeEntries: current.timeEntries,
                              jobs: current.jobs,
                              shoppingList: current.shoppingList,
                              errands: current.errands,
                              routines: current.routines,
                              activeRoutineId: current.activeRoutineId,
                              activeTimerEntryId: current.activeTimerEntryId,
                              calendarSourceWidgetId: current.calendarSourceWidgetId,
                              organizationPreference: current.organizationPreference,
                            }),
                          }))
                        }
                      />
                    );
                  case 'daily-focus':
                    return (
                      <DailyFocusWidget
                        {...widgetProps}
                        taskSources={taskSources}
                        sourceWidgetId={widget.sourceWidgetId}
                        onSourceWidgetChange={(sourceWidgetId) =>
                          updateDailyFocusSourceWidget(widget.id, sourceWidgetId)
                        }
                        aiState={widgetAIState?.[widget.id]}
                        onAIStateChange={(state) => updateWidgetAIState(widget.id, state)}
                        onAddTask={addTaskToSource}
                        onToggleTask={toggleTaskInSource}
                        onPriorityChange={updateTaskPriorityInSource}
                      />
                    );
                  case 'ai-chat':
                    return (
                      <AIChatWidget
                        {...widgetProps}
                        messages={widget.messages}
                        appliedSuggestionIds={widget.appliedSuggestionIds ?? []}
                        onUpdate={(mutation) =>
                          mutateTypedWidget(widget.id, 'ai-chat', (current) => ({
                            ...current,
                            messages: mutation(current.messages),
                          }))
                        }
                        onApplySuggestion={(id) =>
                          mutateTypedWidget(widget.id, 'ai-chat', (current) => ({
                            ...current,
                            appliedSuggestionIds: current.appliedSuggestionIds?.includes(id)
                              ? current.appliedSuggestionIds
                              : [...(current.appliedSuggestionIds ?? []), id],
                          }))
                        }
                        availableWidgets={currentWidgets.map((w) => ({ id: w.id, type: w.type }))}
                      />
                    );
                  case 'record-note':
                    return (
                      <RecordNoteWidget
                        {...widgetProps}
                        records={widget.records}
                        onUpdate={(mutation) =>
                          mutateTypedWidget(widget.id, 'record-note', (current) => ({
                            ...current,
                            records: mutation(current.records),
                          }))
                        }
                      />
                    );
                  default:
                    return null;
                }
              })}
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