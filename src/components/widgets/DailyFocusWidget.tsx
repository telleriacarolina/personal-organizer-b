import { useMemo, useState } from 'react';
import { WidgetContainer } from '@/components/WidgetContainer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alarm, Plus } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { AIInsightAction, DailyFocusItem, Task, WidgetAIState, WidgetSize } from '@/types';
import { AISuggestionsPanel } from '@/components/AISuggestionsPanel';
import { buildAIInputHash, generateWidgetAIState, updateAIInsightStatus } from '@/lib/ai-organizer';

interface TaskSource {
  id: string;
  tasks: Task[];
}

interface DailyFocusWidgetProps {
  widgetId: string;
  taskSources: TaskSource[];
  sourceWidgetId?: string | null;
  onSourceWidgetChange: (sourceWidgetId: string | null) => void;
  onAddTask: (
    sourceWidgetId: string,
    task: Pick<Task, 'text' | 'priority' | 'dueDate' | 'category'>
  ) => void;
  onToggleTask: (sourceWidgetId: string, taskId: string) => void;
  onPriorityChange: (sourceWidgetId: string, taskId: string, priority: 'low' | 'medium' | 'high') => void;
  aiState?: WidgetAIState;
  onAIStateChange: (state: WidgetAIState) => void;
  onRemove: () => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  size?: WidgetSize;
  onSizeChange?: (size: WidgetSize) => void;
}

const priorityWeight: Record<'low' | 'medium' | 'high', number> = {
  high: 0,
  medium: 1,
  low: 2,
};

const dateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export function DailyFocusWidget({
  widgetId,
  taskSources,
  sourceWidgetId,
  onSourceWidgetChange,
  onAddTask,
  onToggleTask,
  onPriorityChange,
  aiState,
  onAIStateChange,
  onRemove,
  onDragStart,
  onDragEnd,
  size,
  onSizeChange,
}: DailyFocusWidgetProps) {
  const today = dateKey(new Date());
  const [quickTaskTitle, setQuickTaskTitle] = useState('');
  const [quickTaskPriority, setQuickTaskPriority] = useState<'low' | 'medium' | 'high'>('high');
  const [quickTaskDueDate, setQuickTaskDueDate] = useState(today);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);

  const selectedSourceId =
    sourceWidgetId && taskSources.some((source) => source.id === sourceWidgetId)
      ? sourceWidgetId
      : taskSources[0]?.id ?? null;

  const selectedSource = taskSources.find((source) => source.id === selectedSourceId);

  const normalizedTasks = useMemo<DailyFocusItem[]>(
    () =>
      (selectedSource?.tasks ?? []).map((task) => ({
        id: task.id,
        title: task.text,
        completed: task.completed,
        priority: task.priority ?? 'medium',
        dueDate: task.dueDate ?? null,
        category: task.category ?? null,
      })),
    [selectedSource]
  );

  const isOverdue = (task: DailyFocusItem) => !!task.dueDate && task.dueDate < today;

  const sortByPriorityThenDate = (a: DailyFocusItem, b: DailyFocusItem) => {
    const priorityDelta = priorityWeight[a.priority] - priorityWeight[b.priority];
    if (priorityDelta !== 0) return priorityDelta;
    if (!a.dueDate && !b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return a.dueDate.localeCompare(b.dueDate);
  };

  const incompleteTasks = normalizedTasks.filter((task) => !task.completed);
  const completedTaskCount = normalizedTasks.filter((task) => task.completed).length;
  const completedTasks = normalizedTasks.filter((task) => task.completed).sort(sortByPriorityThenDate).slice(0, 5);
  const overdueTasks = incompleteTasks.filter(isOverdue).sort(sortByPriorityThenDate);
  const todayTasks = incompleteTasks
    .filter((task) => task.dueDate === today && !isOverdue(task))
    .sort(sortByPriorityThenDate);
  const fallbackTasks = incompleteTasks
    .filter((task) => !isOverdue(task) && task.dueDate !== today)
    .sort(sortByPriorityThenDate);
  const focusTasks = (todayTasks.length > 0 ? todayTasks : fallbackTasks).slice(0, 8);
  const aiInput = { tasks: selectedSource?.tasks ?? [] };
  const isAIStale = aiState ? aiState.sourceHash !== buildAIInputHash(aiInput) : false;

  const handleQuickAdd = () => {
    if (!selectedSourceId) {
      toast.error('Add a Tasks widget first');
      return;
    }
    const title = quickTaskTitle.trim();
    if (!title) return;
    onAddTask(selectedSourceId, {
      text: title,
      priority: quickTaskPriority,
      dueDate: quickTaskDueDate || null,
      category: null,
    });
    setQuickTaskTitle('');
  };

  const updateInsightStatus = (insightId: string, status: 'applied' | 'dismissed') => {
    if (!aiState) return;
    onAIStateChange(updateAIInsightStatus(aiState, insightId, status));
  };

  const handleGenerateInsights = async () => {
    if (!selectedSource) {
      toast.error('Add a Tasks widget first');
      return;
    }
    setIsGeneratingInsights(true);
    try {
      const nextState = await generateWidgetAIState({
        widgetId,
        feature: 'tasks',
        input: { tasks: selectedSource.tasks },
        dataSummary: [
          'Feature: task prioritization review',
          `${selectedSource.tasks.length} total tasks from the selected Tasks widget`,
          `${selectedSource.tasks.filter((task) => !task.completed).length} incomplete tasks considered`,
          'Suggested changes must be confirmed before any task mutation',
        ],
      });
      onAIStateChange(nextState);
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  const handleApplyAction = (insightId: string, action: AIInsightAction) => {
    void action;
    toast.info('AI apply actions will be enabled in Phase 2');
    updateInsightStatus(insightId, 'active');
  };

  return (
    <WidgetContainer
      title="Daily Focus"
      icon={<Alarm size={24} />}
      onRemove={onRemove}
      value={{ id: widgetId, type: 'daily-focus', sourceWidgetId: selectedSourceId }}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      size={size}
      onSizeChange={onSizeChange}
      widgetType="daily-focus"
    >
      <div className="space-y-3">
        <AISuggestionsPanel
          title="AI Focus Suggestions"
          featureLabel="task"
          state={aiState}
          isGenerating={isGeneratingInsights}
          isStale={isAIStale}
          onGenerate={handleGenerateInsights}
          onApplyAction={handleApplyAction}
          onDismissInsight={(insightId) => updateInsightStatus(insightId, 'dismissed')}
        />

        <div className="space-y-2">
          <Label htmlFor={`daily-focus-source-${widgetId}`} className="text-xs text-muted-foreground">
            Task source
          </Label>
          <Select
            value={selectedSourceId ?? ''}
            onValueChange={(value) => onSourceWidgetChange(value || null)}
            disabled={taskSources.length === 0}
          >
            <SelectTrigger id={`daily-focus-source-${widgetId}`}>
              <SelectValue placeholder="Select Tasks widget" />
            </SelectTrigger>
            <SelectContent>
              {taskSources.map((source, index) => (
                <SelectItem key={source.id} value={source.id}>
                  Tasks Widget {index + 1}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2">
          <Input
            placeholder="Quick add task"
            value={quickTaskTitle}
            onChange={(event) => setQuickTaskTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') handleQuickAdd();
            }}
          />
          <Select
            value={quickTaskPriority}
            onValueChange={(value) => setQuickTaskPriority(value as 'low' | 'medium' | 'high')}
          >
            <SelectTrigger className="w-[95px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={quickTaskDueDate}
            onChange={(event) => setQuickTaskDueDate(event.target.value)}
            className="w-[150px]"
          />
          <Button onClick={handleQuickAdd} size="icon">
            <Plus size={16} />
          </Button>
        </div>

        {taskSources.length === 0 ? (
          <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            Add a Tasks widget to use Daily Focus.
          </div>
        ) : (
          <>
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Today&apos;s Focus</h3>
                <Badge variant="secondary">{focusTasks.length}</Badge>
              </div>
              {focusTasks.length === 0 ? (
                <p className="text-xs text-muted-foreground">No active focus tasks for today.</p>
              ) : (
                <div className="space-y-2">
                  {focusTasks.map((task) => (
                    <div key={task.id} className="rounded-md border p-2">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={task.completed}
                          onCheckedChange={() => selectedSourceId && onToggleTask(selectedSourceId, task.id)}
                        />
                        <p className="flex-1 text-sm">{task.title}</p>
                        <Select
                          value={task.priority}
                          onValueChange={(value) =>
                            selectedSourceId &&
                            onPriorityChange(selectedSourceId, task.id, value as 'low' | 'medium' | 'high')
                          }
                        >
                          <SelectTrigger className="h-8 w-[95px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="low">Low</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-destructive">Overdue</h3>
                <Badge variant="destructive">{overdueTasks.length}</Badge>
              </div>
              {overdueTasks.length === 0 ? (
                <p className="text-xs text-muted-foreground">No overdue tasks.</p>
              ) : (
                <div className="space-y-2">
                  {overdueTasks.map((task) => (
                    <div
                      key={task.id}
                      className="rounded-md border border-destructive/40 bg-destructive/5 p-2"
                    >
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={task.completed}
                          onCheckedChange={() => selectedSourceId && onToggleTask(selectedSourceId, task.id)}
                        />
                        <p className="flex-1 text-sm">{task.title}</p>
                        <Badge variant="destructive" className="capitalize">
                          {task.priority}
                        </Badge>
                        <Select
                          value={task.priority}
                          onValueChange={(value) =>
                            selectedSourceId &&
                            onPriorityChange(selectedSourceId, task.id, value as 'low' | 'medium' | 'high')
                          }
                        >
                          <SelectTrigger className="h-8 w-[95px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="low">Low</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {task.dueDate && (
                        <p className="mt-1 text-xs text-destructive">Due {task.dueDate}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Completed</h3>
                <Badge variant="secondary">{completedTaskCount}</Badge>
              </div>
              {completedTaskCount > completedTasks.length && (
                <p className="text-xs text-muted-foreground">
                  Showing {completedTasks.length} of {completedTaskCount} completed tasks
                </p>
              )}
              {completedTasks.length === 0 ? (
                <p className="text-xs text-muted-foreground">No completed tasks yet.</p>
              ) : (
                <div className="space-y-2">
                  {completedTasks.map((task) => (
                    <div key={task.id} className="rounded-md border p-2 opacity-80">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={task.completed}
                          onCheckedChange={() => selectedSourceId && onToggleTask(selectedSourceId, task.id)}
                        />
                        <p className="flex-1 text-sm line-through text-muted-foreground">{task.title}</p>
                        <Badge variant="outline" className="capitalize">
                          {task.priority}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </WidgetContainer>
  );
}
