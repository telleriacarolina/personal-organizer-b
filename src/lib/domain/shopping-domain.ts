import type { PersonalShoppingItem, ShoppingWidget } from '@/types';

export type ShoppingDomainAction =
  | { type: 'set-items'; payload: PersonalShoppingItem[] }
  | { type: 'set-budget'; payload?: number }
  | { type: 'set-receipts'; payload: NonNullable<ShoppingWidget['receipts']> }
  | { type: 'set-trips'; payload: NonNullable<ShoppingWidget['trips']> }
  | { type: 'set-reminders'; payload: NonNullable<ShoppingWidget['reminders']> };

export function reduceShoppingWidget(widget: ShoppingWidget, action: ShoppingDomainAction): ShoppingWidget {
  switch (action.type) {
    case 'set-items':
      return { ...widget, items: action.payload };
    case 'set-budget':
      return { ...widget, budget: action.payload };
    case 'set-receipts':
      return { ...widget, receipts: action.payload };
    case 'set-trips':
      return { ...widget, trips: action.payload };
    case 'set-reminders':
      return { ...widget, reminders: action.payload };
    default:
      return widget;
  }
}
