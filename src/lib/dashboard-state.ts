import type { Widget } from '@/types';

export const toggleGlobalLockValue = (current: boolean) => !current;

export const applyGlobalLockState = (widgets: Widget[], locked: boolean) =>
  widgets.map((widget) => ({
    ...widget,
    size: {
      ...widget.size,
      width: widget.size?.width || 350,
      height: widget.size?.height || 400,
      locked,
    },
  }));
