import type { z } from 'zod';
import type { Widget, WidgetType } from '@/types';

export type ValidationSeverity = 'error' | 'warning';

export interface ValidationIssue {
  field: string;
  message: string;
  severity: ValidationSeverity;
}

export interface WidgetCapabilities {
  canResize: boolean;
  canLockSize: boolean;
  supportsAI?: boolean;
  supportsImport?: boolean;
  supportsSync?: boolean;
}

export interface WidgetMigrationContext {
  version: number;
}

export interface WidgetDefinition<TWidget extends Widget> {
  type: TWidget['type'];
  schema: z.ZodType<TWidget>;
  defaultState: (input: { id: string; position: number }) => TWidget;
  normalize: (widget: TWidget) => TWidget;
  validate: (widget: TWidget) => ValidationIssue[];
  migrate: (widget: unknown, context: WidgetMigrationContext) => TWidget;
  capabilities: WidgetCapabilities;
}

export type WidgetDefinitions = {
  [K in WidgetType]: WidgetDefinition<Extract<Widget, { type: K }>>;
};
