import type { Widget } from '@/types';

export const toggleGlobalLockValue = (current: boolean) => !current;

export const applyGlobalLockState = (widgets: Widget[], locked: boolean) => {
  const nextWidgets = widgets.map((widget) => {
    const width = widget.size?.width ?? 350;
    const height = widget.size?.height ?? 400;
    const isInSync =
      widget.size?.locked === locked &&
      widget.size?.width !== undefined &&
      widget.size?.height !== undefined;

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

  return widgets.every((widget, index) => nextWidgets[index] === widget) ? widgets : nextWidgets;
};
