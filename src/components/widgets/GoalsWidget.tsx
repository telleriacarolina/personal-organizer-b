import { useState } from 'react';
import { WidgetContainer } from '@/components/WidgetContainer';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Target, Plus, Trash } from '@phosphor-icons/react';
import { Goal } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';

interface GoalsWidgetProps {
  goals: Goal[];
  onUpdate: (goals: Goal[]) => void;
  onRemove: () => void;
  widgetId: string;
  onDragStart: (id: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (id: string) => void;
}

export function GoalsWidget({ goals, onUpdate, onRemove, widgetId, onDragStart, onDragOver, onDrop }: GoalsWidgetProps) {
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const addGoal = () => {
    if (newTitle.trim()) {
      const goal: Goal = {
        id: Date.now().toString(),
        title: newTitle,
        description: newDescription,
        completed: false,
        createdAt: Date.now(),
      };
      onUpdate([...goals, goal]);
      setNewTitle('');
      setNewDescription('');
      setShowNew(false);
    }
  };

  const toggleGoal = (id: string) => {
    onUpdate(
      goals.map((goal) =>
        goal.id === id ? { ...goal, completed: !goal.completed } : goal
      )
    );
  };

  const deleteGoal = (id: string) => {
    onUpdate(goals.filter((goal) => goal.id !== id));
  };

  return (
    <WidgetContainer 
      title="Goals" 
      icon={<Target size={24} />} 
      onRemove={onRemove}
      widgetId={widgetId}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {!showNew && (
        <Button
          onClick={() => setShowNew(true)}
          className="w-full"
          variant="outline"
        >
          <Plus size={18} className="mr-2" />
          New Goal
        </Button>
      )}

      <AnimatePresence>
        {showNew && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2 border border-border rounded-lg p-3 bg-background"
          >
            <Input
              id="goal-title"
              placeholder="Goal title..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
            <Textarea
              id="goal-description"
              placeholder="Describe your goal..."
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              rows={3}
            />
            <div className="flex gap-2">
              <Button onClick={addGoal} size="sm">
                Save
              </Button>
              <Button
                onClick={() => {
                  setShowNew(false);
                  setNewTitle('');
                  setNewDescription('');
                }}
                size="sm"
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        <AnimatePresence>
          {goals.map((goal) => (
            <motion.div
              key={goal.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.2 }}
              className="flex items-start gap-3 p-4 rounded-lg bg-background border border-border hover:border-primary/30 transition-colors group"
            >
              <Checkbox
                id={`goal-${goal.id}`}
                checked={goal.completed}
                onCheckedChange={() => toggleGoal(goal.id)}
                className="mt-1 data-[state=checked]:bg-success data-[state=checked]:border-success"
              />
              <div className="flex-1">
                <label
                  htmlFor={`goal-${goal.id}`}
                  className={`cursor-pointer font-medium text-foreground block mb-1 ${
                    goal.completed ? 'line-through text-muted-foreground' : ''
                  }`}
                >
                  {goal.title}
                </label>
                {goal.description && (
                  <p className="text-sm text-muted-foreground">
                    {goal.description}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => deleteGoal(goal.id)}
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
              >
                <Trash size={16} />
              </Button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {goals.length === 0 && !showNew && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          No goals yet. Set one to start achieving!
        </div>
      )}
    </WidgetContainer>
  );
}
