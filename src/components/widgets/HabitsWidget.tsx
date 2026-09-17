import { useState } from 'react';
import { WidgetContainer } from '@/components/WidgetContainer';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Fire, Plus, Trash } from '@phosphor-icons/react';
import { Habit, WidgetSize } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';

interface HabitsWidgetProps {
  habits: Habit[];
  onUpdate: (habits: Habit[]) => void;
  onRemove: () => void;
  widgetId: string;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  size?: WidgetSize;
  onSizeChange?: (size: WidgetSize) => void;
  snapToGrid?: boolean;
  globalLock?: boolean;
}

export function HabitsWidget({ habits, onUpdate, onRemove, widgetId, onDragStart, onDragEnd, size, onSizeChange, snapToGrid, globalLock }: HabitsWidgetProps) {
  const [newHabit, setNewHabit] = useState('');

  const addHabit = () => {
    if (newHabit.trim()) {
      const habit: Habit = {
        id: Date.now().toString(),
        name: newHabit,
        completions: {},
        createdAt: Date.now(),
      };
      onUpdate([...habits, habit]);
      setNewHabit('');
    }
  };

  const toggleHabitToday = (id: string) => {
    const today = new Date().toISOString().split('T')[0];
    onUpdate(
      habits.map((habit) => {
        if (habit.id === id) {
          const completions = { ...habit.completions };
          completions[today] = !completions[today];
          return { ...habit, completions };
        }
        return habit;
      })
    );
  };

  const deleteHabit = (id: string) => {
    onUpdate(habits.filter((habit) => habit.id !== id));
  };

  const getStreak = (habit: Habit): number => {
    let streak = 0;
    const today = new Date();
    
    for (let i = 0; i < 365; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      if (habit.completions[dateStr]) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }
    
    return streak;
  };

  const isCompletedToday = (habit: Habit): boolean => {
    const today = new Date().toISOString().split('T')[0];
    return habit.completions[today] || false;
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addHabit();
    }
  };

  return (
    <WidgetContainer 
      title="Habits" 
      icon={<Fire size={24} />} 
      onRemove={onRemove}
      value={{ id: widgetId, type: 'habits', habits }}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      size={size}
      onSizeChange={onSizeChange}
      snapToGrid={snapToGrid}
      globalLock={globalLock}
      widgetType="habits"
    >
      <div className="flex gap-2">
        <Input
          id="new-habit"
          placeholder="Add a new habit..."
          value={newHabit}
          onChange={(e) => setNewHabit(e.target.value)}
          onKeyDown={handleKeyPress}
          className="flex-1"
        />
        <Button onClick={addHabit} size="icon" className="h-10 w-10">
          <Plus size={20} />
        </Button>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        <AnimatePresence>
          {habits.map((habit) => {
            const streak = getStreak(habit);
            const completed = isCompletedToday(habit);

            return (
              <motion.div
                key={habit.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-3 p-3 rounded-lg bg-background border border-border hover:border-primary/30 transition-colors group"
              >
                <Checkbox
                  id={`habit-${habit.id}`}
                  checked={completed}
                  onCheckedChange={() => toggleHabitToday(habit.id)}
                  className="data-[state=checked]:bg-success data-[state=checked]:border-success"
                />
                <label
                  htmlFor={`habit-${habit.id}`}
                  className="flex-1 cursor-pointer text-sm text-foreground"
                >
                  {habit.name}
                </label>
                {streak > 0 && (
                  <Badge
                    variant="secondary"
                    className="bg-accent/20 text-accent-foreground flex items-center gap-1"
                  >
                    <Fire size={14} weight="fill" />
                    {streak} {streak === 1 ? 'day' : 'days'}
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteHabit(habit.id)}
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                >
                  <Trash size={16} />
                </Button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {habits.length === 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          No habits yet. Add one to start building streaks!
        </div>
      )}
    </WidgetContainer>
  );
}
