import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CheckSquareOffset, Note, Fire, Target, Calendar, Briefcase, ShoppingCart, Robot } from '@phosphor-icons/react';
import { WidgetType } from '@/types';

interface AddWidgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddWidget: (type: WidgetType) => void;
}

export function AddWidgetDialog({ open, onOpenChange, onAddWidget }: AddWidgetDialogProps) {
  const widgets = [
    {
      type: 'tasks' as WidgetType,
      title: 'Tasks',
      description: 'Manage your to-do list with priorities',
      icon: <CheckSquareOffset size={32} />,
    },
    {
      type: 'daily-focus' as WidgetType,
      title: 'Daily Focus',
      description: 'Today and overdue high-priority tasks',
      icon: <Target size={32} />,
    },
    {
      type: 'notes' as WidgetType,
      title: 'Notes',
      description: 'Quick capture for thoughts and ideas',
      icon: <Note size={32} />,
    },
    {
      type: 'habits' as WidgetType,
      title: 'Habits',
      description: 'Track daily habits and build streaks',
      icon: <Fire size={32} />,
    },
    {
      type: 'goals' as WidgetType,
      title: 'Goals',
      description: 'Set and achieve your long-term goals',
      icon: <Target size={32} />,
    },
    {
      type: 'calendar' as WidgetType,
      title: 'Calendar',
      description: 'Save appointments, events, and occasions',
      icon: <Calendar size={32} />,
    },
    {
      type: 'shopping' as WidgetType,
      title: 'Shopping List',
      description: 'Personal shopping with budgets & categories',
      icon: <ShoppingCart size={32} />,
    },
    {
      type: 'work' as WidgetType,
      title: 'Work Dashboard',
      description: 'Clients, jobs, time tracking, meals, shopping & errands',
      icon: <Briefcase size={32} />,
    },
    {
      type: 'ai-chat' as WidgetType,
      title: 'AI Assistant',
      description: 'Chat with AI to get suggestions and apply them to your widgets',
      icon: <Robot size={32} />,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Add Widget</DialogTitle>
          <DialogDescription className="text-sm">
            Choose a widget to add to your organizer
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2 sm:gap-3 mt-3 sm:mt-4">
          {widgets.map((widget) => (
            <Button
              key={widget.type}
              variant="outline"
              className={`h-auto flex-col gap-2 sm:gap-3 p-4 sm:p-6 hover:border-primary hover:bg-primary/5 ${
                widget.type === 'work' || widget.type === 'ai-chat' ? 'col-span-2' : ''
              }`}
              onClick={() => {
                onAddWidget(widget.type);
                onOpenChange(false);
              }}
            >
              <div className="text-primary scale-90 sm:scale-100">{widget.icon}</div>
              <div className="text-center">
                <div className="font-medium text-foreground mb-1 text-sm sm:text-base">{widget.title}</div>
                <div className="text-xs text-muted-foreground line-clamp-2 sm:line-clamp-none">{widget.description}</div>
              </div>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
