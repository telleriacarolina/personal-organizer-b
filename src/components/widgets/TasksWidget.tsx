import { useState } from 'react';
import { WidgetContainer } from '@/components/WidgetContainer';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ListChecks, Plus, Trash } from '@phosphor-icons/react';
import { Task, WidgetSize } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { addTaskToTasks, deleteTask as deleteTaskCommand, toggleTask as toggleTaskCommand } from '@/lib/organizer-commands';

interface TasksWidgetProps {
  tasks: Task[];
  onUpdate: (tasks: Task[]) => void;
  onRemove: () => void;
  widgetId: string;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  size?: WidgetSize;
  onSizeChange?: (size: WidgetSize) => void;
}

export function TasksWidget({ tasks, onUpdate, onRemove, widgetId, onDragStart, onDragEnd, size, onSizeChange }: TasksWidgetProps) {
  const [newTask, setNewTask] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');

  const addTask = () => {
    if (newTask.trim()) {
      onUpdate(addTaskToTasks(tasks, newTask, priority));
      setNewTask('');
      setPriority('medium');
    }
  };

  const toggleTask = (id: string) => {
    onUpdate(toggleTaskCommand(tasks, id));
  };

  const deleteTask = (id: string) => {
    onUpdate(deleteTaskCommand(tasks, id));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addTask();
    }
  };

  const priorityColors = {
    low: 'bg-muted text-muted-foreground',
    medium: 'bg-accent/20 text-accent-foreground',
    high: 'bg-destructive/20 text-destructive',
  };

  return (
    <WidgetContainer 
      title="Tasks" 
      icon={<ListChecks size={24} />} 
      onRemove={onRemove}
      value={{ id: widgetId, type: 'tasks', tasks }}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      size={size}
      onSizeChange={onSizeChange}
      widgetType="tasks"
    >
      <div className="flex gap-2">
        <Input
          id="new-task"
          placeholder="Add a new task..."
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          onKeyPress={handleKeyPress}
          className="flex-1"
        />
        <div className="flex gap-1">
          <Button
            variant={priority === 'low' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setPriority('low')}
            className="h-10 px-2 text-xs"
          >
            Low
          </Button>
          <Button
            variant={priority === 'medium' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setPriority('medium')}
            className="h-10 px-2 text-xs"
          >
            Med
          </Button>
          <Button
            variant={priority === 'high' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setPriority('high')}
            className="h-10 px-2 text-xs"
          >
            High
          </Button>
        </div>
        <Button onClick={addTask} size="icon" className="h-10 w-10">
          <Plus size={20} />
        </Button>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        <AnimatePresence>
          {tasks.map((task) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-3 p-3 rounded-lg bg-background border border-border hover:border-primary/30 transition-colors group"
            >
              <Checkbox
                id={`task-${task.id}`}
                checked={task.completed}
                onCheckedChange={() => toggleTask(task.id)}
                className="data-[state=checked]:bg-success data-[state=checked]:border-success"
              />
              <label
                htmlFor={`task-${task.id}`}
                className={`flex-1 cursor-pointer text-sm ${
                  task.completed ? 'line-through text-muted-foreground' : 'text-foreground'
                }`}
              >
                {task.text}
              </label>
              {task.priority && (
                <Badge variant="secondary" className={`${priorityColors[task.priority]} text-xs`}>
                  {task.priority}
                </Badge>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => deleteTask(task.id)}
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
              >
                <Trash size={16} />
              </Button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {tasks.length === 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          No tasks yet. Add one above to get started!
        </div>
      )}
    </WidgetContainer>
  );
}
