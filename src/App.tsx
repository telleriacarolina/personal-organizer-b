import { useState, useEffect } from 'react';
import { useKV } from '@github/spark/hooks';
import { Button } from '@/components/ui/button';
import { Plus, ArrowsOutCardinal } from '@phosphor-icons/react';
import { Toaster, toast } from 'sonner';
import { AddWidgetDialog } from '@/components/AddWidgetDialog';
import { ThemeCustomizationButton } from '@/components/ThemeCustomization';
import { TasksWidget } from '@/components/widgets/TasksWidget';
import { NotesWidget } from '@/components/widgets/NotesWidget';
import { HabitsWidget } from '@/components/widgets/HabitsWidget';
import { GoalsWidget } from '@/components/widgets/GoalsWidget';
import { CalendarWidget } from '@/components/widgets/CalendarWidget';
import { WorkWidget } from '@/components/widgets/WorkWidget';
import { Widget, WidgetType } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';

function App() {
  const [widgets, setWidgets] = useKV<Widget[]>('organizer-widgets', []);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [showDragHint, setShowDragHint] = useState(false);

  const addWidget = (type: WidgetType) => {
    const newWidget: Widget = {
      id: Date.now().toString(),
      type,
      position: (widgets || []).length,
      ...(type === 'tasks' && { tasks: [] }),
      ...(type === 'notes' && { notes: [] }),
      ...(type === 'habits' && { habits: [] }),
      ...(type === 'goals' && { goals: [] }),
      ...(type === 'calendar' && { events: [] }),
      ...(type === 'work' && { clientSlots: [], meals: [], timeEntries: [], jobs: [], shoppingList: [], errands: [] }),
    } as Widget;

    setWidgets((current) => [...(current || []), newWidget]);
    toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} widget added!`);
  };

  const removeWidget = (id: string) => {
    setWidgets((current) => (current || []).filter((w) => w.id !== id));
    toast.success('Widget removed');
  };

  const updateWidget = (id: string, data: Partial<Widget>) => {
    setWidgets((current) =>
      (current || []).map((w) => (w.id === id ? { ...w, ...data } as Widget : w))
    );
  };

  const handleDragStart = (id: string) => {
    setDraggedId(id);
    toast.info('Drop on another widget to swap positions');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetId: string) => {
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      return;
    }

    setWidgets((current) => {
      const currentWidgets = current || [];
      const draggedIndex = currentWidgets.findIndex((w) => w.id === draggedId);
      const targetIndex = currentWidgets.findIndex((w) => w.id === targetId);

      if (draggedIndex === -1 || targetIndex === -1) return currentWidgets;

      const newWidgets = [...currentWidgets];
      const [draggedWidget] = newWidgets.splice(draggedIndex, 1);
      newWidgets.splice(targetIndex, 0, draggedWidget);

      return newWidgets.map((w, index) => ({ ...w, position: index }));
    });

    setDraggedId(null);
    toast.success('Widget repositioned');
  };

  const currentWidgets = widgets || [];

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold text-foreground tracking-tight">
                My Organizer
              </h1>
              <p className="text-muted-foreground mt-1">
                Your personalized productivity dashboard
              </p>
            </div>
            <div className="flex gap-3">
              <ThemeCustomizationButton />
              <Button onClick={() => setShowAddDialog(true)} size="lg" className="gap-2">
                <Plus size={20} />
                Add Widget
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 relative">
              {draggedId && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 pointer-events-none z-0"
                >
                  <div className="absolute inset-0 bg-primary/5 rounded-xl backdrop-blur-[1px]" />
                </motion.div>
              )}
              {currentWidgets.map((widget) => {
                switch (widget.type) {
                  case 'tasks':
                    return (
                      <TasksWidget
                        key={widget.id}
                        widgetId={widget.id}
                        tasks={widget.tasks}
                        onUpdate={(tasks) => updateWidget(widget.id, { tasks })}
                        onRemove={() => removeWidget(widget.id)}
                        onDragStart={handleDragStart}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                      />
                    );
                  case 'notes':
                    return (
                      <NotesWidget
                        key={widget.id}
                        widgetId={widget.id}
                        notes={widget.notes}
                        onUpdate={(notes) => updateWidget(widget.id, { notes })}
                        onRemove={() => removeWidget(widget.id)}
                        onDragStart={handleDragStart}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                      />
                    );
                  case 'habits':
                    return (
                      <HabitsWidget
                        key={widget.id}
                        widgetId={widget.id}
                        habits={widget.habits}
                        onUpdate={(habits) => updateWidget(widget.id, { habits })}
                        onRemove={() => removeWidget(widget.id)}
                        onDragStart={handleDragStart}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                      />
                    );
                  case 'goals':
                    return (
                      <GoalsWidget
                        key={widget.id}
                        widgetId={widget.id}
                        goals={widget.goals}
                        onUpdate={(goals) => updateWidget(widget.id, { goals })}
                        onRemove={() => removeWidget(widget.id)}
                        onDragStart={handleDragStart}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                      />
                    );
                  case 'calendar':
                    return (
                      <CalendarWidget
                        key={widget.id}
                        widgetId={widget.id}
                        events={widget.events}
                        onUpdate={(events) => updateWidget(widget.id, { events })}
                        onRemove={() => removeWidget(widget.id)}
                        onDragStart={handleDragStart}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                      />
                    );
                  case 'work':
                    return (
                      <WorkWidget
                        key={widget.id}
                        widgetId={widget.id}
                        clientSlots={widget.clientSlots}
                        meals={widget.meals}
                        timeEntries={widget.timeEntries}
                        jobs={widget.jobs}
                        shoppingList={widget.shoppingList}
                        errands={widget.errands}
                        onUpdate={(data) => updateWidget(widget.id, data)}
                        onRemove={() => removeWidget(widget.id)}
                        onDragStart={handleDragStart}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                      />
                    );
                  default:
                    return null;
                }
              })}
            </div>
          )}
        </div>
      </div>

      <AddWidgetDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onAddWidget={addWidget}
      />
      
      <Toaster position="bottom-right" />
    </div>
  );
}

export default App;