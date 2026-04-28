import { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, DotsSixVertical } from '@phosphor-icons/react';
import { Reorder, useDragControls } from 'framer-motion';

interface WidgetContainerProps {
  title: string;
  icon: ReactNode;
  onRemove: () => void;
  children: ReactNode;
  value: any;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

export function WidgetContainer({ 
  title, 
  icon, 
  onRemove, 
  children,
  value,
  onDragStart,
  onDragEnd
}: WidgetContainerProps) {
  const dragControls = useDragControls();

  return (
    <Reorder.Item
      value={value}
      dragListener={false}
      dragControls={dragControls}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      transition={{
        layout: { duration: 0.2, ease: [0.4, 0, 0.2, 1] }
      }}
      whileDrag={{
        scale: 1.05,
        boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
        zIndex: 10,
        cursor: 'grabbing'
      }}
    >
      <Card 
        className="relative p-4 sm:p-6 shadow-sm transition-all duration-200 overflow-hidden hover:shadow-lg hover:border-primary/30 bg-card touch-none"
      >
        <div className="flex items-center justify-between mb-3 sm:mb-4 relative z-10">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                dragControls.start(e);
              }}
              className="text-muted-foreground cursor-grab active:cursor-grabbing hover:text-primary transition-colors p-1.5 sm:p-1 -ml-1 rounded hover:bg-primary/10 touch-none flex-shrink-0"
              style={{ touchAction: 'none' }}
            >
              <DotsSixVertical size={18} weight="bold" className="sm:w-5 sm:h-5" />
            </button>
            <div className="text-primary flex-shrink-0">
              {icon}
            </div>
            <h2 className="font-['Space_Grotesk'] font-medium text-lg sm:text-xl text-foreground truncate">
              {title}
            </h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onRemove}
            className="h-8 w-8 sm:h-9 sm:w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all flex-shrink-0 ml-2"
          >
            <X size={16} className="sm:w-[18px] sm:h-[18px]" />
          </Button>
        </div>
        <div className="space-y-2 sm:space-y-3 relative z-10">{children}</div>
      </Card>
    </Reorder.Item>
  );
}
