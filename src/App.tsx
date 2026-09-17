import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, ArrowsOutCardinal, GridFour, Lock, LockOpen } from '@phosphor-icons/react';
import { Toaster } from 'sonner';
import { AddWidgetDialog } from '@/components/AddWidgetDialog';
import { ThemeCustomizationButton } from '@/components/ThemeCustomization';
import { AIConfigButton } from '@/components/ai/AIConfigButton';
import { OrganizerAgentButton } from '@/components/ai/OrganizerAgentButton';
import { AIChatWidget } from '@/components/widgets/AIChatWidget';
import { WorkOrganizationQuestionnaire } from '@/components/WorkOrganizationQuestionnaire';
import { TasksWidget } from '@/components/widgets/TasksWidget';
import { NotesWidget } from '@/components/widgets/NotesWidget';
import { HabitsWidget } from '@/components/widgets/HabitsWidget';
import { GoalsWidget } from '@/components/widgets/GoalsWidget';
import { CalendarWidget } from '@/components/widgets/CalendarWidget';
import { WorkWidget } from '@/components/widgets/WorkWidget';
import { ShoppingWidget } from '@/components/widgets/ShoppingWidget';
import { DailyFocusWidget } from '@/components/widgets/DailyFocusWidget';
import { RecordNoteWidget } from '@/components/widgets/RecordNoteWidget';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import type { AgentContext } from '@/types/agent';
import { useWidgetDashboardState } from '@/hooks/useWidgetDashboardState';

function App() {
  const {
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
    toggleSnapToGrid,
    toggleGlobalLock,
    handleReorder,
    handleDragStart,
    handleDragEnd,
    taskSources,
    calendarSources,
    agentHandlers,
  } = useWidgetDashboardState();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showWorkQuestionnaire, setShowWorkQuestionnaire] = useState(false);

  const agentContext: AgentContext = useMemo(
    () => ({
      widgets: currentWidgets,
      handlers: agentHandlers,
      currentDate: new Date(),
    }),
    [currentWidgets, agentHandlers],
  );

  useEffect(() => {
    if (currentWidgets.length > 0 && currentWidgets.length <= 2 && !localStorage.getItem('drag-hint-shown')) {
      setShowDragHint(true);
      const timer = setTimeout(() => {
        setShowDragHint(false);
        localStorage.setItem('drag-hint-shown', 'true');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [currentWidgets.length, setShowDragHint]);

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-gradient-to-br from-primary/5 via-accent/5 to-background">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground tracking-tight">My Organizer</h1>
              <p className="text-sm sm:text-base text-muted-foreground mt-1">Your personalized productivity dashboard</p>
            </div>
            <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
              <Button onClick={toggleSnapToGrid} size="lg" variant={snapToGrid ? 'default' : 'outline'} className="gap-2 flex-shrink-0">
                <GridFour size={20} weight={snapToGrid ? 'fill' : 'regular'} />
                <span className="hidden lg:inline">{snapToGrid ? 'Grid: On' : 'Grid: Off'}</span>
              </Button>
              <Button
                onClick={toggleGlobalLock}
                size="lg"
                variant={globalLock ? 'default' : 'outline'}
                className="gap-2 flex-shrink-0"
                title={globalLock ? 'Unlock all widgets' : 'Lock all widgets'}
              >
                {globalLock ? <Lock size={20} weight="fill" /> : <LockOpen size={20} />}
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
                  animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
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
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-20">
              <motion.div
                animate={{ scale: [1, 1.05, 1], rotate: [0, 5, -5, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6"
              >
                <Plus size={40} className="text-primary" />
              </motion.div>
              <h2 className="text-2xl font-semibold text-foreground mb-3">Welcome to Your Organizer</h2>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                Get started by adding your first widget. Choose from tasks, notes, habits, or goals to create your perfect organizational system.
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
              {snapToGrid && <div className="absolute inset-0 pointer-events-none z-0 grid-background" />}
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
                  onSizeChange: (size: { width: number; height: number; locked?: boolean }) => updateWidgetSize(widget.id, size),
                  snapToGrid,
                  globalLock,
                };

                switch (widget.type) {
                  case 'tasks':
                    return <TasksWidget {...widgetProps} tasks={widget.tasks} onUpdate={(tasks) => updateWidget(widget.id, { tasks })} />;
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
                    return <HabitsWidget {...widgetProps} habits={widget.habits} onUpdate={(habits) => updateWidget(widget.id, { habits })} />;
                  case 'goals':
                    return <GoalsWidget {...widgetProps} goals={widget.goals} onUpdate={(goals) => updateWidget(widget.id, { goals })} />;
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
                        onUpdate={(data) => updateWidget(widget.id, data)}
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
                        onSourceWidgetChange={(sourceWidgetId) => updateDailyFocusSourceWidget(widget.id, sourceWidgetId)}
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
                    return <RecordNoteWidget {...widgetProps} records={widget.records} onUpdate={(records) => updateWidget(widget.id, { records })} />;
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
        onAddWidget={(type) => {
          if (type === 'work') {
            setShowAddDialog(false);
            setShowWorkQuestionnaire(true);
            return;
          }
          addWidget(type);
        }}
      />

      <WorkOrganizationQuestionnaire
        open={showWorkQuestionnaire}
        onOpenChange={setShowWorkQuestionnaire}
        onComplete={handleWorkOrganizationComplete}
      />

      <Toaster
        position="bottom-right"
        toastOptions={{
          className: 'sm:mb-0 mb-16',
        }}
      />
    </div>
  );
}

export default App;
