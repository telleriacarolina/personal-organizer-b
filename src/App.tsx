import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { usePersistentState } from '@/hooks/usePersistentState';
import { Button } from '@/components/ui/button';
import { Plus, ArrowsOutCardinal, GridFour, Lock, LockOpen } from '@phosphor-icons/react';
import { Toaster, toast } from 'sonner';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
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
import { Widget, WidgetAIState, WidgetType } from '@/types';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import type { AgentContext } from '@/types/agent';
import {
  formatPersistenceIssue,
  hasLegacyWidgetMediaPayload,
  migrateWidgetsMedia,
  preferencesRepository,
  stateRepositories,
  subscribeToPersistenceIssues,
} from '@/lib/persistence';
import {
  addCalendarImport as addCalendarImportCommand,
  addTaskToSource as addTaskToSourceCommand,
  clearWidgetAIState,
  createWidget,
  createWorkWidget,
  removeWidget as removeWidgetCommand,
  reorderWidgets,
  saveWidgetAIState,
  toggleTaskInSource as toggleTaskInSourceCommand,
  updateDailyFocusSourceWidget as updateDailyFocusSourceWidgetCommand,
  updateTaskPriorityInSource as updateTaskPriorityInSourceCommand,
  updateWidget as updateWidgetCommand,
  updateWidgetSize as updateWidgetSizeCommand,
} from '@/lib/organizer-commands';
import type { AgentPermission } from '@/types/agent';

function App() {
  const [widgets, setWidgets] = usePersistentState(stateRepositories.widgets, []);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDragHint, setShowDragHint] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showWorkQuestionnaire, setShowWorkQuestionnaire] = useState(false);
  const [snapToGrid, setSnapToGrid] = usePersistentState(stateRepositories.snapToGrid, false);
  const [globalLock, setGlobalLock] = usePersistentState(stateRepositories.globalLock, false);
  const [widgetAIState, setWidgetAIState] = usePersistentState(stateRepositories.widgetAIState, {});
  const dragStartTimeRef = useRef<number>(0);

  const addWidget = (type: WidgetType) => {
    if (type === 'work') {
      setShowAddDialog(false);
      setShowWorkQuestionnaire(true);
      return;
    }

    const newWidget = createWidget(type, widgets.length, widgets);
    setWidgets((current) => [...current, newWidget]);
    toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} widget added!`);
  };

  const handleWorkOrganizationComplete = (preference: WorkOrganizationPreference) => {
    const newWidget = createWorkWidget(preference, widgets.length);
    setWidgets((current) => [...current, newWidget]);
    toast.success(`Work widget added with ${preference.type} organization!`);
  };

  const removeWidget = (id: string) => {
    setWidgets((current) => removeWidgetCommand(current, id));
    setWidgetAIState((current) => clearWidgetAIState(current, id));
    toast.success('Widget removed');
  };

  const updateWidget = (id: string, data: Partial<Widget> | ((widget: Widget) => Widget)) => {
    if (typeof data === 'function') {
      setWidgets((current) =>
        (current || []).map((w) => {
          if (w.id !== id) return w;
          return data(w);
        })
      );
    } else {
      setWidgets((current) => updateWidgetCommand(current, id, data));
    }
  };

  const updateWidgetSize = (id: string, size: { width: number; height: number }) => {
    setWidgets((current) => updateWidgetSizeCommand(current, id, size));
  };

  const addTaskToSource = (
    sourceWidgetId: string,
    task: Parameters<typeof addTaskToSourceCommand>[2]
  ) => {
    setWidgets((current) => addTaskToSourceCommand(current, sourceWidgetId, task));
  };

  const toggleTaskInSource = (sourceWidgetId: string, taskId: string) => {
    setWidgets((current) => toggleTaskInSourceCommand(current, sourceWidgetId, taskId));
  };

  const updateTaskPriorityInSource = (
    sourceWidgetId: string,
    taskId: string,
    priority: 'low' | 'medium' | 'high'
  ) => {
    setWidgets((current) => updateTaskPriorityInSourceCommand(current, sourceWidgetId, taskId, priority));
  };

  const addCalendarEventToSource = (
    destinationWidgetId: string,
    event: Parameters<typeof addCalendarImportCommand>[2]
  ): { added: boolean; reason?: 'invalid-destination' | 'duplicate' } => {
    let result: { added: boolean; reason?: 'invalid-destination' | 'duplicate' } = {
      added: false,
      reason: 'invalid-destination',
    };

    setWidgets((current) => {
      const next = addCalendarImportCommand(current, destinationWidgetId, event);
      result = next.result;
      return next.result.added ? next.widgets : current;
    });

    return result;
  };

  const updateDailyFocusSourceWidget = (widgetId: string, sourceWidgetId: string | null) => {
    setWidgets((current) => updateDailyFocusSourceWidgetCommand(current, widgetId, sourceWidgetId));
  };

  const updateWidgetAIState = (widgetId: string, state: WidgetAIState) => {
    if (widgetId !== state.widgetId) {
      console.warn(`Ignoring AI state update for "${state.widgetId}" on widget "${widgetId}"`);
      return;
    }
    setWidgetAIState((current) => saveWidgetAIState(current, state));
  };

  const toggleSnapToGrid = () => {
    setSnapToGrid((current) => !current);
    toast.success(snapToGrid ? 'Grid snapping disabled' : 'Grid snapping enabled');
  };

  const toggleGlobalLock = () => {
    const newLockState = !globalLock;
    setGlobalLock(newLockState);
    
    if (newLockState) {
      setWidgets((current) =>
        current.map((w) => ({
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
        current.map((w) => ({
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

  const handleReorder = (newOrder: Widget[]) => {
    setWidgets(reorderWidgets(newOrder));
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

  const currentWidgets = useMemo(() => widgets ?? [], [widgets]);
  const taskSources = useMemo(
    () =>
      currentWidgets
        .filter((widget): widget is Extract<Widget, { type: 'tasks' }> => widget.type === 'tasks')
        .map((widget) => ({ id: widget.id, tasks: widget.tasks })),
    [currentWidgets]
  );
  const calendarSources = useMemo(
    () =>
      currentWidgets
        .filter((widget): widget is Extract<Widget, { type: 'calendar' }> => widget.type === 'calendar')
        .map((widget) => ({ id: widget.id })),
    [currentWidgets]
  );

  const updateWidgetsForAgent = useCallback((updater: (widgets: Widget[]) => Widget[]) => {
    setWidgets((current) => updater(current || []));
  }, [setWidgets]);

  const agentPermissions: AgentPermission[] = useMemo(() => [
    'read:tasks',
    'write:tasks',
    'read:notes',
    'write:notes',
    'read:habits',
    'write:habits',
    'read:goals',
    'write:goals',
    'read:calendar',
    'write:calendar',
    'read:work',
    'publish:work_to_calendar',
    'read:shopping',
    'write:shopping',
    'read:record-notes',
    'write:record-notes',
  ], []);

  const agentContext: AgentContext = useMemo(() => ({
    widgets: currentWidgets,
    updateWidgets: updateWidgetsForAgent,
    currentDate: new Date(),
    actorContext: {
      userId: 'personal-organizer-user',
      workspaceId: 'local-organizer-workspace',
      permissions: agentPermissions,
    },
  }), [agentPermissions, currentWidgets, updateWidgetsForAgent]);

  useEffect(() => {
    return subscribeToPersistenceIssues((issue) => {
      toast.error(formatPersistenceIssue(issue));
    });
  }, []);

  const migrationFailureKeysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!hasLegacyWidgetMediaPayload(currentWidgets)) {
      return;
    }

    let cancelled = false;

    void (async () => {
      const migration = await migrateWidgetsMedia(currentWidgets);
      if (cancelled) return;

      if (migration.migrated) {
        setWidgets(migration.value);
      }

      if (migration.issue) {
        const failureKey = `${migration.issue.key ?? 'widgets'}:${migration.issue.code}`;
        if (!migrationFailureKeysRef.current.has(failureKey)) {
          migrationFailureKeysRef.current.add(failureKey);
          toast.error(`${formatPersistenceIssue(migration.issue)} Original data was kept.`);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentWidgets, setWidgets]);

  useEffect(() => {
    if (currentWidgets.length > 0 && currentWidgets.length <= 2 && !preferencesRepository.isDragHintShown()) {
      setShowDragHint(true);
      const timer = setTimeout(() => {
        setShowDragHint(false);
        preferencesRepository.setDragHintShown(true);
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
                  snapToGrid: snapToGrid,
                  globalLock: globalLock,
                };

                switch (widget.type) {
                  case 'tasks':
                    return (
                      <TasksWidget
                        {...widgetProps}
                        tasks={widget.tasks}
                        onUpdate={(tasks) => updateWidget(widget.id, { tasks })}
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
                        onUpdate={(notes) => updateWidget(widget.id, { notes })}
                      />
                    );
                  case 'habits':
                    return (
                      <HabitsWidget
                        {...widgetProps}
                        habits={widget.habits}
                        onUpdate={(habits) => updateWidget(widget.id, { habits })}
                      />
                    );
                  case 'goals':
                    return (
                      <GoalsWidget
                        {...widgetProps}
                        goals={widget.goals}
                        onUpdate={(goals) => updateWidget(widget.id, { goals })}
                      />
                    );
                  case 'calendar':
                    return (
                      <CalendarWidget
                        {...widgetProps}
                        events={widget.events}
                        aiState={widgetAIState?.[widget.id]}
                        onAIStateChange={(state) => updateWidgetAIState(widget.id, state)}
                        onUpdate={(events) => updateWidget(widget.id, { events })}
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
                        onUpdate={(update) =>
                          updateWidget(widget.id, (currentWidget) => {
                            if (currentWidget.type !== 'shopping') {
                              return currentWidget;
                            }

                            const currentData = {
                              items: currentWidget.items,
                              budget: currentWidget.budget,
                              receipts: currentWidget.receipts,
                              trips: currentWidget.trips,
                              reminders: currentWidget.reminders,
                            };

                            const nextData = typeof update === 'function' ? update(currentData) : update;
                            return { ...currentWidget, ...nextData } as Widget;
                          })
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
                        organizationPreference={widget.organizationPreference}
                        calendarSources={calendarSources}
                        aiState={widgetAIState?.[widget.id]}
                        onAIStateChange={(state) => updateWidgetAIState(widget.id, state)}
                        onAddCalendarEvent={addCalendarEventToSource}
                        onUpdate={(data) => updateWidget(widget.id, data)}
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
                        onUpdate={(messages) => updateWidget(widget.id, { messages })}
                        onApplySuggestion={(id) =>
                          updateWidget(widget.id, {
                            appliedSuggestionIds: [...(widget.appliedSuggestionIds ?? []), id],
                          })
                        }
                        availableWidgets={currentWidgets.map((w) => ({ id: w.id, type: w.type }))}
                      />
                    );
                  case 'record-note':
                    return (
                      <RecordNoteWidget
                        {...widgetProps}
                        records={widget.records}
                        onUpdate={(update) =>
                          updateWidget(widget.id, (currentWidget) => {
                            if (currentWidget.type !== 'record-note') {
                              return currentWidget;
                            }

                            const records = typeof update === 'function'
                              ? (update as (value: typeof currentWidget.records) => typeof currentWidget.records)(currentWidget.records)
                              : update;

                            return { ...currentWidget, records } as Widget;
                          })
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
        onAddWidget={(type) => addWidget(type)}
      />

      <WorkOrganizationQuestionnaire
        open={showWorkQuestionnaire}
        onOpenChange={setShowWorkQuestionnaire}
        onComplete={handleWorkOrganizationComplete}
      />
      
      <Toaster position="bottom-right" toastOptions={{
        className: 'sm:mb-0 mb-16'
      }} />
      <Analytics />
      <SpeedInsights />
    </div>
  );
}

export default App;
