import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ListChecks, Note, Fire, Target } from '@phosphor-icons/react';
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
      icon: <ListChecks size={32} />,
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
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Widget</DialogTitle>
          <DialogDescription>
            Choose a widget to add to your organizer
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 mt-4">
          {widgets.map((widget) => (
            <Button
              key={widget.type}
              variant="outline"
              className="h-auto flex-col gap-3 p-6 hover:border-primary hover:bg-primary/5"
              onClick={() => {
                onAddWidget(widget.type);
                onOpenChange(false);
              }}
            >
              <div className="text-primary">{widget.icon}</div>
              <div className="text-center">
                <div className="font-medium text-foreground mb-1">{widget.title}</div>
                <div className="text-xs text-muted-foreground">{widget.description}</div>
              </div>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
