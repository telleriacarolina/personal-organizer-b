import { ReactNode, useState, useRef, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, DotsSixVertical, CornersOut, Lock, LockOpen } from '@phosphor-icons/react';
import { Reorder, useDragControls } from 'framer-motion';
import { Widget, WidgetSize, WidgetType } from '@/types';
import { toast } from 'sonner';

type WidgetContainerValue = Pick<Widget, 'id' | 'type'> & Record<string, unknown>;

interface WidgetContainerProps {
  title: string;
  icon: ReactNode;
  onRemove: () => void;
  children: ReactNode;
  value: WidgetContainerValue;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  size?: WidgetSize;
  onSizeChange?: (size: WidgetSize) => void;
  snapToGrid?: boolean;
  widgetType?: WidgetType;
  globalLock?: boolean;
}

export function WidgetContainer({ 
  title, 
  icon, 
  onRemove, 
  children,
  value,
  onDragStart,
  onDragEnd,
  size,
  onSizeChange,
  snapToGrid = false,
  widgetType,
  globalLock = false
}: WidgetContainerProps) {
  const dragControls = useDragControls();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [isPinching, setIsPinching] = useState(false);
  const [pinchStart, setPinchStart] = useState({ distance: 0, width: 0, height: 0 });
  const [draftSize, setDraftSize] = useState<{ width: number; height: number } | null>(null);

  const GRID_SIZE = 50;
  
  const getMinimumSize = () => {
    switch (widgetType) {
      case 'tasks':
        return { minWidth: 320, minHeight: 400 };
      case 'notes':
        return { minWidth: 320, minHeight: 450 };
      case 'habits':
        return { minWidth: 320, minHeight: 400 };
      case 'goals':
        return { minWidth: 320, minHeight: 450 };
      case 'calendar':
        return { minWidth: 400, minHeight: 550 };
      case 'work':
        return { minWidth: 450, minHeight: 600 };
      case 'daily-focus':
        return { minWidth: 380, minHeight: 480 };
      case 'ai-chat':
        return { minWidth: 360, minHeight: 500 };
      case 'record-note':
        return { minWidth: 320, minHeight: 480 };
      default:
        return { minWidth: 280, minHeight: 350 };
    }
  };

  const { minWidth, minHeight } = getMinimumSize();
  const defaultWidth = Math.max(350, minWidth);
  const defaultHeight = Math.max(400, minHeight);
  const persistedWidth = size?.width || defaultWidth;
  const persistedHeight = size?.height || defaultHeight;
  const currentWidth = draftSize?.width || persistedWidth;
  const currentHeight = draftSize?.height || persistedHeight;
  const isLocked = globalLock || size?.locked || false;

  const snapToGridValue = useCallback((value: number) => {
    if (!snapToGrid) return value;
    return Math.round(value / GRID_SIZE) * GRID_SIZE;
  }, [snapToGrid]);

  const toggleLock = () => {
    if (onSizeChange) {
      onSizeChange({
        width: persistedWidth,
        height: persistedHeight,
        locked: !isLocked
      });
      toast.success(isLocked ? 'Widget size unlocked' : 'Widget size locked');
    }
  };

  const handleResizeStart = (e: React.PointerEvent) => {
    if (isLocked) return;
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      setResizeStart({
        x: e.clientX,
        y: e.clientY,
        width: rect.width,
        height: rect.height
      });
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isLocked) return;
    if (e.touches.length === 2) {
      e.preventDefault();
      e.stopPropagation();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        setIsPinching(true);
        setPinchStart({
          distance,
          width: rect.width,
          height: rect.height
        });
      }
    }
  };

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (isResizing) {
        const deltaX = e.clientX - resizeStart.x;
        const deltaY = e.clientY - resizeStart.y;
        let newWidth = Math.max(minWidth, Math.min(800, resizeStart.width + deltaX));
        let newHeight = Math.max(minHeight, Math.min(1000, resizeStart.height + deltaY));
        
        newWidth = snapToGridValue(newWidth);
        newHeight = snapToGridValue(newHeight);

        setDraftSize({ width: newWidth, height: newHeight });
      }
    };

    const handlePointerUp = () => {
      if (isResizing && draftSize && onSizeChange) {
        onSizeChange({ width: draftSize.width, height: draftSize.height });
      }
      setIsResizing(false);
      setDraftSize(null);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isPinching && e.touches.length === 2) {
        e.preventDefault();
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const distance = Math.hypot(
          touch2.clientX - touch1.clientX,
          touch2.clientY - touch1.clientY
        );
        const scale = distance / pinchStart.distance;
        let newWidth = Math.max(minWidth, Math.min(800, pinchStart.width * scale));
        let newHeight = Math.max(minHeight, Math.min(1000, pinchStart.height * scale));
        
        newWidth = snapToGridValue(newWidth);
        newHeight = snapToGridValue(newHeight);
        
        setDraftSize({ width: newWidth, height: newHeight });
      }
    };

    const handleTouchEnd = () => {
      if (isPinching && draftSize && onSizeChange) {
        onSizeChange({ width: draftSize.width, height: draftSize.height });
      }
      setIsPinching(false);
      setDraftSize(null);
    };

    if (isResizing) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    }

    if (isPinching) {
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [draftSize, isResizing, resizeStart, isPinching, pinchStart, onSizeChange, snapToGridValue, minWidth, minHeight]);

  useEffect(() => {
    if (isResizing || isPinching) {
      return;
    }
    if (draftSize && (draftSize.width !== persistedWidth || draftSize.height !== persistedHeight)) {
      setDraftSize(null);
    }
  }, [draftSize, isPinching, isResizing, persistedHeight, persistedWidth]);
  }, [isResizing, resizeStart, isPinching, pinchStart, onSizeChange, snapToGridValue, minWidth, minHeight]);

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
      style={{
        width: `${currentWidth}px`,
        height: `${currentHeight}px`,
        maxWidth: '100%',
        flexShrink: 0
      }}
    >
      <Card 
        ref={containerRef}
        className="relative p-4 sm:p-6 shadow-sm transition-all duration-200 overflow-hidden hover:shadow-lg hover:border-primary/30 bg-card touch-none h-full"
        onTouchStart={handleTouchStart}
      >
        <div className="flex items-center justify-between mb-3 sm:mb-4 relative z-10">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
            {!globalLock && (
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
            )}
            <div className="text-primary flex-shrink-0">
              {icon}
            </div>
            <h2 className="font-['Space_Grotesk'] font-medium text-lg sm:text-xl text-foreground truncate">
              {title}
            </h2>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0 ml-2">
            {!globalLock && (
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleLock}
                className={`h-8 w-8 sm:h-9 sm:w-9 transition-all ${
                  isLocked 
                    ? 'text-primary hover:text-primary/80 hover:bg-primary/10' 
                    : 'text-muted-foreground hover:text-primary hover:bg-primary/10'
                }`}
                title={isLocked ? 'Unlock widget size' : 'Lock widget size'}
              >
                {isLocked ? (
                  <Lock size={16} className="sm:w-[18px] sm:h-[18px]" weight="fill" />
                ) : (
                  <LockOpen size={16} className="sm:w-[18px] sm:h-[18px]" />
                )}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onRemove}
              className="h-8 w-8 sm:h-9 sm:w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
            >
              <X size={16} className="sm:w-[18px] sm:h-[18px]" />
            </Button>
          </div>
        </div>
        <div className="space-y-2 sm:space-y-3 relative z-10 overflow-auto" style={{ maxHeight: size ? `${currentHeight - 80}px` : 'auto' }}>{children}</div>
        
        {!isLocked && (
          <button
            onPointerDown={handleResizeStart}
            className={`absolute bottom-0 right-0 w-8 h-8 sm:w-10 sm:h-10 cursor-nwse-resize hover:bg-primary/10 transition-all flex items-center justify-center group ${isResizing ? 'bg-primary/20' : ''}`}
            style={{ touchAction: 'none' }}
            title="Drag to resize widget"
          >
            <CornersOut 
              size={16} 
              className={`text-muted-foreground group-hover:text-primary transition-colors sm:w-5 sm:h-5 ${isResizing ? 'text-primary' : ''}`}
              weight="bold"
            />
          </button>
        )}
      </Card>
    </Reorder.Item>
  );
}
