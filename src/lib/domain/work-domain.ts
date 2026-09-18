import type { ClientSlot, Job, ShoppingItem, TimeEntry, WorkErrand, WorkMeal, WorkRoutine, WorkWidget } from '@/types';

export type WorkDomainAction =
  | { type: 'set-client-slots'; payload: ClientSlot[] }
  | { type: 'set-meals'; payload: WorkMeal[] }
  | { type: 'set-time-entries'; payload: TimeEntry[] }
  | { type: 'set-jobs'; payload: Job[] }
  | { type: 'set-shopping-list'; payload: ShoppingItem[] }
  | { type: 'set-errands'; payload: WorkErrand[] }
  | { type: 'set-routines'; payload: WorkRoutine[] }
  | { type: 'set-active-routine'; payload?: string }
  | { type: 'set-organization-preference'; payload?: WorkWidget['organizationPreference'] };

export function reduceWorkWidget(widget: WorkWidget, action: WorkDomainAction): WorkWidget {
  switch (action.type) {
    case 'set-client-slots':
      return { ...widget, clientSlots: action.payload };
    case 'set-meals':
      return { ...widget, meals: action.payload };
    case 'set-time-entries':
      return { ...widget, timeEntries: action.payload };
    case 'set-jobs':
      return { ...widget, jobs: action.payload };
    case 'set-shopping-list':
      return { ...widget, shoppingList: action.payload };
    case 'set-errands':
      return { ...widget, errands: action.payload };
    case 'set-routines':
      return { ...widget, routines: action.payload };
    case 'set-active-routine':
      return { ...widget, activeRoutineId: action.payload };
    case 'set-organization-preference':
      return { ...widget, organizationPreference: action.payload };
    default:
      return widget;
  }
}
