import { toast } from 'sonner';
import type { Widget, WidgetType } from '@/types';
import { appendImportedCalendarEvent, type CalendarImportDraft } from '@/lib/calendar-imports';
import { normalizeWidget, validateWidget, widgetDefinitions } from './widget-registry';
import type { ValidationIssue } from './widget-definition';

export type WidgetCommandType = 'create' | 'update' | 'delete' | 'import' | 'sync';

interface CommandBase {
  type: WidgetCommandType;
}

export interface CreateWidgetCommand extends CommandBase {
  type: 'create';
  widgetType: WidgetType;
  id?: string;
  position?: number;
  patch?: Partial<Widget>;
}

export interface UpdateWidgetCommand extends CommandBase {
  type: 'update';
  widgetId: string;
  patch: Partial<Widget>;
}

export interface DeleteWidgetCommand extends CommandBase {
  type: 'delete';
  widgetId: string;
}

export interface ImportWidgetCommand extends CommandBase {
  type: 'import';
  destinationWidgetId: string;
  payload: CalendarImportDraft;
}

export interface SyncWidgetCommand extends CommandBase {
  type: 'sync';
}

export type WidgetCommand =
  | CreateWidgetCommand
  | UpdateWidgetCommand
  | DeleteWidgetCommand
  | ImportWidgetCommand
  | SyncWidgetCommand;

export interface WidgetCommandResult {
  widgets: Widget[];
  changed: boolean;
  issues: ValidationIssue[];
  meta?: { added?: boolean; reason?: 'invalid-destination' | 'duplicate' };
}

const nextId = () => Date.now().toString();

const validateNormalizedWidget = (widget: Widget): { normalized: Widget; issues: ValidationIssue[] } => {
  const normalized = normalizeWidget(widget);
  const issues = validateWidget(normalized);
  return { normalized, issues };
};

const notifyValidationIssues = (issues: ValidationIssue[]): void => {
  if (issues.length === 0) return;
  const first = issues[0];
  toast.error(`Validation failed: ${first.field} ${first.message}`);
};

export function executeWidgetCommand(current: Widget[], command: WidgetCommand): WidgetCommandResult {
  if (command.type === 'sync') {
    const normalized: Widget[] = [];
    const issues: ValidationIssue[] = [];

    current.forEach((widget, index) => {
      const migrated = widgetDefinitions[widget.type].migrate(widget, { version: 1 });
      const { normalized: normalizedWidget, issues: widgetIssues } = validateNormalizedWidget({
        ...migrated,
        position: index,
      });
      normalized.push(normalizedWidget);
      issues.push(...widgetIssues);
    });

    return {
      widgets: normalized,
      changed: JSON.stringify(normalized) !== JSON.stringify(current),
      issues,
    };
  }

  if (command.type === 'create') {
    const position = command.position ?? current.length;
    const id = command.id ?? nextId();
    const baseWidget = widgetDefinitions[command.widgetType].defaultState({ id, position }) as Widget;
    const candidateWidget = { ...baseWidget, ...(command.patch ?? {}) } as Widget;
    const { normalized, issues } = validateNormalizedWidget(candidateWidget);
    if (issues.length > 0) {
      notifyValidationIssues(issues);
      return { widgets: current, changed: false, issues };
    }
    return {
      widgets: [...current, normalized],
      changed: true,
      issues,
      meta: { added: true },
    };
  }

  if (command.type === 'update') {
    const index = current.findIndex((widget) => widget.id === command.widgetId);
    if (index < 0) {
      return {
        widgets: current,
        changed: false,
        issues: [{ field: 'widgetId', message: 'Widget not found', severity: 'error' }],
      };
    }

    const candidate = { ...current[index], ...command.patch } as Widget;
    const { normalized, issues } = validateNormalizedWidget(candidate);
    if (issues.length > 0) {
      notifyValidationIssues(issues);
      return { widgets: current, changed: false, issues };
    }

    const next = [...current];
    next[index] = normalized;

    return {
      widgets: next,
      changed: JSON.stringify(next[index]) !== JSON.stringify(current[index]),
      issues,
    };
  }

  if (command.type === 'delete') {
    const next = current.filter((widget) => widget.id !== command.widgetId);
    return {
      widgets: next.map((widget, index) => ({ ...widget, position: index })),
      changed: next.length !== current.length,
      issues: [],
    };
  }

  const destination = current.find(
    (widget): widget is Extract<Widget, { type: 'calendar' }> =>
      widget.id === command.destinationWidgetId && widget.type === 'calendar',
  );

  if (!destination) {
    return {
      widgets: current,
      changed: false,
      issues: [{ field: 'destinationWidgetId', message: 'Invalid calendar destination', severity: 'error' }],
      meta: { added: false, reason: 'invalid-destination' },
    };
  }

  const importResult = appendImportedCalendarEvent(destination.events, command.payload);
  if (!importResult.added) {
    return {
      widgets: current,
      changed: false,
      issues: [],
      meta: { added: false, reason: 'duplicate' },
    };
  }

  const next = current.map((widget) => {
    if (widget.id !== destination.id || widget.type !== 'calendar') return widget;
    const candidate = { ...widget, events: importResult.events } as Widget;
    return normalizeWidget(candidate);
  });

  return {
    widgets: next,
    changed: true,
    issues: [],
    meta: { added: true },
  };
}
