import { ReactNode, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, DotsSixVertical } from '@phosphor-icons/react';

interface WidgetContainerProps {
  title: string;
  icon: ReactNode;
  onRemove: () => void;
  children: ReactNode;
  widgetId: string;
  onDragStart: (id: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (id: string) => void;
}

export function WidgetContainer({ 
  title, 
  icon, 
  onRemove, 
  children, 
  widgetId,
  onDragStart,
  onDragOver,
  onDrop
}: WidgetContainerProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    onDragStart(widgetId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
    onDragOver(e);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    onDrop(widgetId);
  };

  return (
    <Card 
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`p-6 shadow-sm transition-all duration-200 ${
        isDragging 
          ? 'opacity-50 scale-95 cursor-grabbing' 
          : 'hover:shadow-md cursor-grab'
      } ${
        isDragOver 
          ? 'ring-2 ring-primary ring-offset-2' 
          : ''
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="text-muted-foreground cursor-grab active:cursor-grabbing">
            <DotsSixVertical size={20} weight="bold" />
          </div>
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
