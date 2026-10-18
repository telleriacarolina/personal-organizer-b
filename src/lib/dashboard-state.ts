import type { Widget } from '@/types';

export const toggleGlobalLockValue = (current: boolean) => !current;

export const applyGlobalLockState = (widgets: Widget[], locked: boolean) => {
  const requiresUpdate = widgets.some((widget) => {
    const width = widget.size?.width ?? 350;
    const height = widget.size?.height ?? 400;
    return widget.size?.locked !== locked || widget.size?.width !== width || widget.size?.height !== height;
  });

  if (!requiresUpdate) {
    return widgets;
  }

  return widgets.map((widget) => {
    const width = widget.size?.width ?? 350;
    const height = widget.size?.height ?? 400;
    const isInSync = widget.size?.locked === locked && widget.size?.width === width && widget.size?.height === height;

    if (isInSync) {
      return widget;
    }

    return {
      ...widget,
      size: {
        ...widget.size,
        width,
        height,
        locked,
      },
    };
  });
};
