import { ReactNode, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, DotsSixVertical } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';

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
    
    const dragImage = document.createElement('div');
    dragImage.style.position = 'absolute';
    dragImage.style.top = '-9999px';
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 0, 0);
    setTimeout(() => document.body.removeChild(dragImage), 0);
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
    <motion.div
      layout
      transition={{
        layout: { duration: 0.3, ease: [0.4, 0, 0.2, 1] }
      }}
    >
      <Card 
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative p-6 shadow-sm transition-all duration-300 overflow-hidden ${
          isDragging 
            ? 'opacity-40 scale-[0.98] rotate-2 cursor-grabbing shadow-2xl' 
            : 'hover:shadow-lg cursor-grab hover:border-primary/30'
        } ${
          isDragOver 
            ? 'ring-2 ring-primary ring-offset-4 scale-[1.02] border-primary' 
            : ''
        }`}
      >
        <AnimatePresence>
          {isDragOver && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent pointer-events-none"
            />
          )}
        </AnimatePresence>

        <div className="flex items-center justify-between mb-4 relative z-10">
          <div className="flex items-center gap-2">
            <motion.div 
              className="text-muted-foreground cursor-grab active:cursor-grabbing hover:text-primary transition-colors p-1 -ml-1 rounded hover:bg-primary/10"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <DotsSixVertical size={20} weight="bold" />
            </motion.div>
            <motion.div 
              className="text-primary"
              animate={isDragging ? { scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] } : {}}
              transition={{ duration: 0.5, repeat: isDragging ? Infinity : 0 }}
            >
              {icon}
            </motion.div>
            <h2 className="font-['Space_Grotesk'] font-medium text-xl text-foreground">
              {title}
            </h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onRemove}
            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
          >
            <X size={18} />
          </Button>
        </div>
        <div className="space-y-3 relative z-10">{children}</div>
      </Card>
    </motion.div>
  );
}
