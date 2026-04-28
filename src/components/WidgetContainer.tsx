import { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X } from '@phosphor-icons/react';

interface WidgetContainerProps {
  title: string;
  icon: ReactNode;
  onRemove: () => void;
  children: ReactNode;
}

export function WidgetContainer({ title, icon, onRemove, children }: WidgetContainerProps) {
  return (
    <Card className="p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="text-primary">{icon}</div>
          <h2 className="font-['Space_Grotesk'] font-medium text-xl text-foreground">
            {title}
          </h2>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
        >
          <X size={18} />
        </Button>
      </div>
      <div className="space-y-3">{children}</div>
    </Card>
  );
}
