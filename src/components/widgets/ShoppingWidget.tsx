import { useState, useRef, useEffect } from 'react';
import { WidgetContainer } from '@/components/WidgetContainer';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ShoppingCart, Plus, Trash, Storefront, CurrencyDollar, SortAscending, FunnelSimple, Barcode, Receipt as ReceiptIcon, ChartLine, Camera, Scan, MagnifyingGlass, TrendUp, TrendDown, CalendarBlank, ClockCounterClockwise, ArrowClockwise, Bell, BellSlash, Sparkle, Lightning } from '@phosphor-icons/react';
import { PersonalShoppingItem, Receipt, ShoppingTrip, ShoppingReminder, WidgetSize, ShoppingCategory } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { format, startOfDay, startOfMonth, startOfYear, subDays, subMonths, subYears, addDays, addWeeks, addMonths, differenceInDays } from 'date-fns';

interface ShoppingWidgetProps {
  items: PersonalShoppingItem[];
  budget?: number;
  receipts?: Receipt[];
  trips?: ShoppingTrip[];
  reminders?: ShoppingReminder[];
  onUpdate: (data: { items?: PersonalShoppingItem[]; budget?: number; receipts?: Receipt[]; trips?: ShoppingTrip[]; reminders?: ShoppingReminder[] }) => void;
  onRemove: () => void;
  widgetId: string;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  size?: WidgetSize;
  onSizeChange?: (size: WidgetSize) => void;
  snapToGrid?: boolean;
  globalLock?: boolean;
}

const categoryLabels: Record<ShoppingCategory, string> = {
  'food': 'Food Shopping',
  'clothes': 'Clothes Shopping',
  'personal-items': 'Personal Items',
  'work': 'Work Shopping',
  'gifts': 'Gift Shopping',
  'home-supplies': 'Home Supplies',
  'health': 'Health & Wellness',
  'electronics': 'Electronics',
  'other': 'Other'
};

const categoryColors: Record<ShoppingCategory, string> = {
  'food': 'bg-success/20 text-success-foreground border-success/30',
  'clothes': 'bg-chart-2/20 text-foreground border-chart-2/30',
  'personal-items': 'bg-accent/20 text-accent-foreground border-accent/30',
  'work': 'bg-primary/20 text-primary-foreground border-primary/30',
  'gifts': 'bg-chart-5/20 text-foreground border-chart-5/30',
  'home-supplies': 'bg-chart-1/20 text-foreground border-chart-1/30',
  'health': 'bg-chart-3/20 text-foreground border-chart-3/30',
  'electronics': 'bg-chart-4/20 text-foreground border-chart-4/30',
  'other': 'bg-muted text-muted-foreground border-border'
};

const priorityColors = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-accent/20 text-accent-foreground',
  high: 'bg-destructive/20 text-destructive',
};

export function ShoppingWidget({
  items,
  budget,
  receipts = [],
  trips = [],
  reminders = [],
  onUpdate,
  onRemove,
  widgetId,
  onDragStart,
  onDragEnd,
  size,
  onSizeChange,
  snapToGrid,
  globalLock
}: ShoppingWidgetProps) {
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ShoppingCategory>('food');
  const [selectedStore, setSelectedStore] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [viewMode, setViewMode] = useState<'all' | 'category' | 'store'>('all');
  const [filterCategory, setFilterCategory] = useState<ShoppingCategory | 'all'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'priority' | 'category' | 'price'>('name');
  const [budgetInput, setBudgetInput] = useState(budget?.toString() || '');
  
  const [showBarcodeDialog, setShowBarcodeDialog] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [receiptStoreName, setReceiptStoreName] = useState('');
  const [receiptDate, setReceiptDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [receiptItems, setReceiptItems] = useState('');
  const [receiptTotal, setReceiptTotal] = useState('');
  const [receiptNotes, setReceiptNotes] = useState('');
  const [receiptImageInput, setReceiptImageInput] = useState<File | null>(null);
  const [isProcessingReceipt, setIsProcessingReceipt] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showAnalyticsDialog, setShowAnalyticsDialog] = useState(false);
  const [comparisonPeriod, setComparisonPeriod] = useState<'day' | 'week' | 'month' | 'year'>('month');
  const [showTripRevisitsDialog, setShowTripRevisitsDialog] = useState(false);
  const [selectedTripForRevisit, setSelectedTripForRevisit] = useState<ShoppingTrip | null>(null);
  
  const [showRemindersDialog, setShowRemindersDialog] = useState(false);
  const [activeReminders, setActiveReminders] = useState<ShoppingReminder[]>([]);

  const addItem = () => {
    if (newItemName.trim()) {
      const item: PersonalShoppingItem = {
        id: Date.now().toString(),
        name: newItemName,
        quantity: newItemQuantity || undefined,
        category: selectedCategory,
        store: selectedStore || undefined,
        estimatedPrice: newItemPrice ? parseFloat(newItemPrice) : undefined,
        purchased: false,
        priority: selectedPriority,
        createdAt: Date.now(),
      };
      onUpdate({ items: [...items, item] });
      setNewItemName('');
      setNewItemQuantity('');
      setNewItemPrice('');
      setSelectedStore('');
      toast.success('Item added to shopping list');
    }
  };

  const handleBarcodeSubmit = async () => {
    if (!barcodeInput.trim()) return;
    
    setIsScanning(true);
    try {
      const prompt = window.spark.llmPrompt`You are a product information assistant. Given this barcode number: ${barcodeInput}, provide the most likely product name and category.

Return a JSON object with:
- name: the product name (string)
- category: one of: food, clothes, personal-items, work, gifts, home-supplies, health, electronics, other
- estimatedPrice: a reasonable estimated price in USD (number)

Be realistic and use common knowledge about products.`;

      const result = await window.spark.llm(prompt, 'gpt-4o-mini', true);
      const productInfo = JSON.parse(result);
      
      const item: PersonalShoppingItem = {
        id: Date.now().toString(),
        name: productInfo.name,
        category: productInfo.category,
        estimatedPrice: productInfo.estimatedPrice,
        purchased: false,
        priority: 'medium',
        barcode: barcodeInput,
        createdAt: Date.now(),
      };
      
      onUpdate({ items: [...items, item] });
      toast.success(`Added ${productInfo.name} from barcode`);
      setBarcodeInput('');
      setShowBarcodeDialog(false);
    } catch (error) {
      toast.error('Failed to identify product from barcode');
    } finally {
      setIsScanning(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setReceiptImageInput(file);
    setIsProcessingReceipt(true);
    
    try {
      const reader = new FileReader();
      const imageData = await new Promise<string>((resolve) => {
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      });
      
      const prompt = window.spark.llmPrompt`You are an expert receipt OCR system. Analyze this receipt image and extract:
1. Store name
2. Date (if visible)
3. All items with their names, quantities (if shown), and prices
4. Total amount
5. Tax and subtotal (if shown)

Return a JSON object with these exact properties:
{
  "storeName": "store name as string",
  "date": "YYYY-MM-DD format if found, otherwise today's date",
  "items": [{"name": "item name", "quantity": "qty if shown", "price": price_as_number, "category": "best_guess_category"}],
  "total": total_as_number,
  "tax": tax_as_number_or_null,
  "subtotal": subtotal_as_number_or_null
}

Categories must be one of: food, clothes, personal-items, work, gifts, home-supplies, health, electronics, other

If the image doesn't contain a receipt, return null for all fields except items (empty array).`;

      const result = await window.spark.llm(prompt, 'gpt-4o', true);
      const extracted = JSON.parse(result);
      
      if (extracted.storeName) {
        setReceiptStoreName(extracted.storeName);
      }
      
      if (extracted.date) {
        setReceiptDate(extracted.date);
      }
      
      if (extracted.items && extracted.items.length > 0) {
        const itemsText = extracted.items.map((item: any) => 
          `${item.name}${item.quantity ? ` (${item.quantity})` : ''} ${item.price}`
        ).join('\n');
        setReceiptItems(itemsText);
      }
      
      if (extracted.total) {
        setReceiptTotal(extracted.total.toString());
      }
      
      toast.success('Receipt scanned! Review and confirm the details.');
    } catch (error) {
      console.error('Image processing error:', error);
      toast.error('Failed to process receipt image. You can manually enter the details.');
    } finally {
      setIsProcessingReceipt(false);
    }
  };

  const handleReceiptScan = async () => {
    if ((!receiptItems.trim() && !receiptImageInput) || !receiptStoreName.trim()) {
      toast.error('Please fill in store name and items, or upload a receipt image');
      return;
    }

    setIsProcessingReceipt(true);
    try {
      const prompt = window.spark.llmPrompt`You are a receipt parser. Parse this receipt information:
Store: ${receiptStoreName}
Items text: ${receiptItems}
Total: ${receiptTotal || 'unknown'}

Return a JSON object with a single property "items" that contains an array of objects with:
- name: item name (string)
- quantity: quantity if mentioned (string or undefined)
- price: price per item in USD (number)
- category: best guess from: food, clothes, personal-items, work, gifts, home-supplies, health, electronics, other

Be smart about parsing prices and quantities from the text.`;

      const result = await window.spark.llm(prompt, 'gpt-4o', true);
      const parsed = JSON.parse(result);
      
      const receiptId = Date.now().toString();
      const receiptDate_ts = new Date(receiptDate).getTime();
      
      let imageData: string | undefined;
      if (receiptImageInput) {
        const reader = new FileReader();
        imageData = await new Promise((resolve) => {
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(receiptImageInput);
        });
      }
      
      const calculatedTotal = parsed.items.reduce((sum: number, item: any) => sum + (item.price || 0), 0);
      const total = receiptTotal ? parseFloat(receiptTotal) : calculatedTotal;
      
      const newReceipt: Receipt = {
        id: receiptId,
        storeName: receiptStoreName,
        date: receiptDate_ts,
        items: parsed.items,
        total: total,
        subtotal: calculatedTotal,
        tax: total - calculatedTotal,
        notes: receiptNotes || undefined,
        imageData,
        createdAt: Date.now(),
      };

      const newItems = parsed.items.map((item: any) => ({
        id: `${receiptId}-${Date.now()}-${Math.random()}`,
        name: item.name,
        quantity: item.quantity,
        category: item.category,
        store: receiptStoreName,
        actualPrice: item.price,
        purchased: true,
        priority: 'medium' as const,
        receiptId: receiptId,
        createdAt: Date.now(),
        purchasedAt: receiptDate_ts,
      }));

      const existingTrip = trips.find(t => 
        t.storeName === receiptStoreName && 
        startOfDay(t.date).getTime() === startOfDay(receiptDate_ts).getTime()
      );

      let newTrips = [...trips];
      if (existingTrip) {
        newTrips = trips.map(t => 
          t.id === existingTrip.id 
            ? { ...t, total: t.total + total, itemCount: t.itemCount + parsed.items.length, receiptIds: [...t.receiptIds, receiptId] }
            : t
        );
      } else {
        newTrips.push({
          id: `trip-${Date.now()}`,
          date: receiptDate_ts,
          storeName: receiptStoreName,
          total: total,
          itemCount: parsed.items.length,
          receiptIds: [receiptId],
        });
      }

      onUpdate({ 
        items: [...items, ...newItems],
        receipts: [...receipts, newReceipt],
        trips: newTrips
      });
      
      toast.success(`Receipt added: ${parsed.items.length} items from ${receiptStoreName}`);
      setShowReceiptDialog(false);
      setReceiptStoreName('');
      setReceiptDate(format(new Date(), 'yyyy-MM-dd'));
      setReceiptItems('');
      setReceiptTotal('');
      setReceiptNotes('');
      setReceiptImageInput(null);
    } catch (error) {
      console.error('Receipt scan error:', error);
      toast.error('Failed to parse receipt');
    }
  };

  const togglePurchased = (id: string) => {
    onUpdate({
      items: items.map((item) =>
        item.id === id ? { ...item, purchased: !item.purchased, purchasedAt: !item.purchased ? Date.now() : undefined } : item
      )
    });
  };

  const deleteItem = (id: string) => {
    onUpdate({ items: items.filter((item) => item.id !== id) });
    toast.success('Item removed');
  };

  const updateBudget = () => {
    const newBudget = budgetInput ? parseFloat(budgetInput) : undefined;
    onUpdate({ budget: newBudget });
    toast.success(newBudget ? `Budget set to $${newBudget.toFixed(2)}` : 'Budget cleared');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addItem();
    }
  };

  const totalEstimated = items.reduce((sum, item) => 
    !item.purchased && item.estimatedPrice ? sum + item.estimatedPrice : sum, 0
  );

  const totalSpent = items.reduce((sum, item) => 
    item.purchased && (item.actualPrice || item.estimatedPrice) 
      ? sum + (item.actualPrice || item.estimatedPrice || 0) 
      : sum, 
    0
  );

  const sortedItems = [...items].sort((a, b) => {
    switch (sortBy) {
      case 'priority':
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      case 'category':
        return a.category.localeCompare(b.category);
      case 'price':
        return (b.estimatedPrice || 0) - (a.estimatedPrice || 0);
      default:
        return a.name.localeCompare(b.name);
    }
  });

  const filteredItems = filterCategory === 'all' 
    ? sortedItems 
    : sortedItems.filter(item => item.category === filterCategory);

  const groupedByCategory = filteredItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<ShoppingCategory, PersonalShoppingItem[]>);

  const groupedByStore = filteredItems.reduce((acc, item) => {
    const store = item.store || 'Unassigned';
    if (!acc[store]) acc[store] = [];
    acc[store].push(item);
    return acc;
  }, {} as Record<string, PersonalShoppingItem[]>);

  const unpurchasedItems = filteredItems.filter(item => !item.purchased);
  const purchasedItems = filteredItems.filter(item => item.purchased);

  const getComparisonData = () => {
    const now = Date.now();
    let currentPeriodStart: number;
    let previousPeriodStart: number;
    let previousPeriodEnd: number;
    
    switch (comparisonPeriod) {
      case 'day':
        currentPeriodStart = startOfDay(now).getTime();
        previousPeriodStart = startOfDay(subDays(now, 1)).getTime();
        previousPeriodEnd = currentPeriodStart;
        break;
      case 'week':
        currentPeriodStart = subDays(now, 7).getTime();
        previousPeriodStart = subDays(now, 14).getTime();
        previousPeriodEnd = currentPeriodStart;
        break;
      case 'month':
        currentPeriodStart = startOfMonth(now).getTime();
        previousPeriodStart = startOfMonth(subMonths(now, 1)).getTime();
        previousPeriodEnd = currentPeriodStart;
        break;
      case 'year':
        currentPeriodStart = startOfYear(now).getTime();
        previousPeriodStart = startOfYear(subYears(now, 1)).getTime();
        previousPeriodEnd = currentPeriodStart;
        break;
    }

    const currentTrips = trips.filter(t => t.date >= currentPeriodStart);
    const previousTrips = trips.filter(t => t.date >= previousPeriodStart && t.date < previousPeriodEnd);
    
    const currentTotal = currentTrips.reduce((sum, t) => sum + t.total, 0);
    const previousTotal = previousTrips.reduce((sum, t) => sum + t.total, 0);
    
    const currentReceipts = receipts.filter(r => r.date >= currentPeriodStart);
    const previousReceipts = receipts.filter(r => r.date >= previousPeriodStart && r.date < previousPeriodEnd);

    const categorySpending: Record<string, { current: number; previous: number }> = {};
    
    currentReceipts.forEach(receipt => {
      receipt.items.forEach(item => {
        const cat = item.category || 'other';
        if (!categorySpending[cat]) categorySpending[cat] = { current: 0, previous: 0 };
        categorySpending[cat].current += item.price;
      });
    });
    
    previousReceipts.forEach(receipt => {
      receipt.items.forEach(item => {
        const cat = item.category || 'other';
        if (!categorySpending[cat]) categorySpending[cat] = { current: 0, previous: 0 };
        categorySpending[cat].previous += item.price;
      });
    });

    return {
      currentTotal,
      previousTotal,
      currentTrips: currentTrips.length,
      previousTrips: previousTrips.length,
      categorySpending,
      percentageChange: previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : 0,
    };
  };

  const comparisonData = getComparisonData();

  const getSimilarTrips = (trip: ShoppingTrip) => {
    const tripDate = new Date(trip.date);
    const tripMonth = tripDate.getMonth();
    const tripDayOfMonth = tripDate.getDate();
    const tripDayOfWeek = tripDate.getDay();
    
    const similarTrips = trips.filter(t => {
      if (t.id === trip.id) return false;
      
      const tDate = new Date(t.date);
      const isSameStore = t.storeName.toLowerCase() === trip.storeName.toLowerCase();
      const isSameMonth = tDate.getMonth() === tripMonth;
      const isSimilarDayOfMonth = Math.abs(tDate.getDate() - tripDayOfMonth) <= 3;
      const isSameDayOfWeek = tDate.getDay() === tripDayOfWeek;
      
      return isSameStore && (isSameMonth || isSimilarDayOfMonth || isSameDayOfWeek);
    }).sort((a, b) => b.date - a.date);
    
    return similarTrips;
  };

  const getItemsFromTrip = (trip: ShoppingTrip): PersonalShoppingItem[] => {
    const tripReceipts = receipts.filter(r => trip.receiptIds.includes(r.id));
    const itemsSet = new Set<string>();
    const itemsList: PersonalShoppingItem[] = [];
    
    tripReceipts.forEach(receipt => {
      receipt.items.forEach(receiptItem => {
        if (!itemsSet.has(receiptItem.name)) {
          itemsSet.add(receiptItem.name);
          itemsList.push({
            id: `revisit-${Date.now()}-${Math.random()}`,
            name: receiptItem.name,
            quantity: receiptItem.quantity,
            category: receiptItem.category || 'other',
            store: receipt.storeName,
            estimatedPrice: receiptItem.price,
            purchased: false,
            priority: 'medium',
            createdAt: Date.now(),
          });
        }
      });
    });
    
    return itemsList;
  };

  const handleRevisitTrip = (trip: ShoppingTrip) => {
    setSelectedTripForRevisit(trip);
    setShowTripRevisitsDialog(true);
  };

  const handleAddRevisitItems = (tripItems: PersonalShoppingItem[]) => {
    const newItems = tripItems.map(item => ({
      ...item,
      id: `revisit-${Date.now()}-${Math.random()}`,
      purchased: false,
      createdAt: Date.now(),
    }));
    
    onUpdate({ items: [...items, ...newItems] });
    toast.success(`Added ${newItems.length} items from similar trip`);
    setShowTripRevisitsDialog(false);
    setSelectedTripForRevisit(null);
  };

  const getTripCategories = (trip: ShoppingTrip): Record<ShoppingCategory, number> => {
    const tripReceipts = receipts.filter(r => trip.receiptIds.includes(r.id));
    const categoryCounts: Record<string, number> = {};
    
    tripReceipts.forEach(receipt => {
      receipt.items.forEach(item => {
        const cat = item.category || 'other';
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      });
    });
    
    return categoryCounts as Record<ShoppingCategory, number>;
  };

  const generateSmartReminders = async () => {
    if (trips.length < 3) {
      toast.error('Need at least 3 shopping trips to generate smart reminders');
      return;
    }

    const storeTrips: Record<string, ShoppingTrip[]> = {};
    trips.forEach(trip => {
      if (!storeTrips[trip.storeName]) {
        storeTrips[trip.storeName] = [];
      }
      storeTrips[trip.storeName].push(trip);
    });

    const newReminders: ShoppingReminder[] = [];

    for (const [storeName, storeTripsArray] of Object.entries(storeTrips)) {
      if (storeTripsArray.length < 2) continue;

      const sortedTrips = [...storeTripsArray].sort((a, b) => a.date - b.date);
      const intervals: number[] = [];
      
      for (let i = 1; i < sortedTrips.length; i++) {
        const daysBetween = differenceInDays(sortedTrips[i].date, sortedTrips[i-1].date);
        intervals.push(daysBetween);
      }

      const avgInterval = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
      let frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
      let nextDate: number;

      if (avgInterval <= 2) {
        frequency = 'daily';
        nextDate = addDays(sortedTrips[sortedTrips.length - 1].date, 1).getTime();
      } else if (avgInterval <= 9) {
        frequency = 'weekly';
        nextDate = addWeeks(sortedTrips[sortedTrips.length - 1].date, 1).getTime();
      } else if (avgInterval <= 18) {
        frequency = 'biweekly';
        nextDate = addWeeks(sortedTrips[sortedTrips.length - 1].date, 2).getTime();
      } else {
        frequency = 'monthly';
        nextDate = addMonths(sortedTrips[sortedTrips.length - 1].date, 1).getTime();
      }

      const avgSpend = sortedTrips.reduce((sum, t) => sum + t.total, 0) / sortedTrips.length;
      
      const storeReceipts = receipts.filter(r => 
        sortedTrips.some(t => t.receiptIds.includes(r.id))
      );
      
      const itemFrequency: Record<string, number> = {};
      storeReceipts.forEach(receipt => {
        receipt.items.forEach(item => {
          itemFrequency[item.name] = (itemFrequency[item.name] || 0) + 1;
        });
      });

      const commonItems = Object.entries(itemFrequency)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 8)
        .map(([name]) => name);

      const categoryFrequency: Record<ShoppingCategory, number> = {} as Record<ShoppingCategory, number>;
      storeReceipts.forEach(receipt => {
        receipt.items.forEach(item => {
          const cat = item.category || 'other';
          categoryFrequency[cat as ShoppingCategory] = (categoryFrequency[cat as ShoppingCategory] || 0) + 1;
        });
      });

      const primaryCategory = (Object.entries(categoryFrequency).sort(([,a], [,b]) => b - a)[0]?.[0] || 'food') as ShoppingCategory;

      newReminders.push({
        id: `reminder-${Date.now()}-${storeName}`,
        storeName,
        category: primaryCategory,
        frequency,
        nextReminderDate: nextDate,
        averageSpend: avgSpend,
        commonItems,
        enabled: true,
        createdAt: Date.now(),
      });
    }

    onUpdate({ reminders: [...reminders, ...newReminders] });
    toast.success(`Created ${newReminders.length} smart shopping reminders!`);
    setShowRemindersDialog(true);
  };

  const toggleReminder = (id: string) => {
    onUpdate({
      reminders: reminders.map(r => 
        r.id === id ? { ...r, enabled: !r.enabled } : r
      )
    });
  };

  const deleteReminder = (id: string) => {
    onUpdate({
      reminders: reminders.filter(r => r.id !== id)
    });
    toast.success('Reminder deleted');
  };

  const snoozeReminder = (id: string, days: number) => {
    const reminder = reminders.find(r => r.id === id);
    if (!reminder) return;

    const newDate = addDays(new Date(), days).getTime();
    onUpdate({
      reminders: reminders.map(r => 
        r.id === id ? { ...r, nextReminderDate: newDate, lastTriggered: Date.now() } : r
      )
    });
    toast.success(`Reminder snoozed for ${days} days`);
  };

  useEffect(() => {
    const now = Date.now();
    const triggered = reminders.filter(r => 
      r.enabled && 
      r.nextReminderDate <= now &&
      (!r.lastTriggered || (now - r.lastTriggered) > 24 * 60 * 60 * 1000)
    );

    if (triggered.length > 0) {
      setActiveReminders(triggered);
    }
  }, [reminders]);

  useEffect(() => {
    if (activeReminders.length > 0) {
      activeReminders.forEach(reminder => {
        toast(
          <div className="flex flex-col gap-1">
            <div className="font-semibold flex items-center gap-2">
              <Bell size={18} className="text-primary" />
              Time to shop at {reminder.storeName}!
            </div>
            <div className="text-sm text-muted-foreground">
              Based on your {reminder.frequency} shopping pattern
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Avg spend: ${reminder.averageSpend.toFixed(2)}
            </div>
          </div>,
          {
            duration: 10000,
            action: {
              label: 'View',
              onClick: () => setShowRemindersDialog(true)
            }
          }
        );
      });

      onUpdate({
        reminders: reminders.map(r => 
          activeReminders.find(ar => ar.id === r.id)
            ? { ...r, lastTriggered: Date.now() }
            : r
        )
      });
    }
  }, [activeReminders]);

  return (
    <WidgetContainer
      title="Shopping List"
      icon={<ShoppingCart size={24} />}
      onRemove={onRemove}
      value={{ id: widgetId, type: 'shopping', items }}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      size={size}
      onSizeChange={onSizeChange}
      widgetType="shopping"
      snapToGrid={snapToGrid}
      globalLock={globalLock}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Dialog open={showBarcodeDialog} onOpenChange={setShowBarcodeDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Barcode size={16} />
                <span className="hidden sm:inline">Scan Barcode</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Barcode size={20} />
                  Barcode Scanner
                </DialogTitle>
                <DialogDescription>
                  Enter a barcode number to automatically add the product
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Barcode Number</label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter barcode..."
                      value={barcodeInput}
                      onChange={(e) => setBarcodeInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleBarcodeSubmit()}
                    />
                    <Button size="icon" variant="outline" title="Scan with camera">
                      <Scan size={18} />
                    </Button>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowBarcodeDialog(false)}>Cancel</Button>
                <Button onClick={handleBarcodeSubmit} disabled={isScanning}>
                  {isScanning ? <><MagnifyingGlass size={16} className="animate-spin" /> Processing...</> : 'Add Product'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={showReceiptDialog} onOpenChange={setShowReceiptDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <ReceiptIcon size={16} />
                <span className="hidden sm:inline">Scan Receipt</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ReceiptIcon size={20} />
                  Receipt Scanner
                </DialogTitle>
                <DialogDescription>
                  Add a receipt to track expenses and compare shopping trips
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {isProcessingReceipt && (
                  <div className="flex items-center justify-center gap-2 p-4 bg-primary/10 rounded-lg border border-primary/20">
                    <MagnifyingGlass size={20} className="animate-spin text-primary" />
                    <span className="text-sm font-medium">Processing receipt...</span>
                  </div>
                )}
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Quick Scan (Recommended)</label>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full gap-2 h-12 border-2 border-dashed hover:border-primary hover:bg-primary/5"
                      disabled={isProcessingReceipt}
                    >
                      <Camera size={20} />
                      {receiptImageInput ? `Selected: ${receiptImageInput.name}` : 'Upload Receipt Photo'}
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">AI will automatically extract items, prices, and store details</p>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-popover px-2 text-muted-foreground">Or enter manually</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Store Name</label>
                    <Input
                      placeholder="e.g., Walmart"
                      value={receiptStoreName}
                      onChange={(e) => setReceiptStoreName(e.target.value)}
                      disabled={isProcessingReceipt}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Date</label>
                    <Input
                      type="date"
                      value={receiptDate}
                      onChange={(e) => setReceiptDate(e.target.value)}
                      disabled={isProcessingReceipt}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Receipt Items</label>
                  <Textarea
                    placeholder="Paste receipt text or list items (e.g., 'Milk 2.99, Bread 1.50, Eggs 3.99')"
                    value={receiptItems}
                    onChange={(e) => setReceiptItems(e.target.value)}
                    rows={6}
                    disabled={isProcessingReceipt}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Total Amount</label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={receiptTotal}
                      onChange={(e) => setReceiptTotal(e.target.value)}
                      disabled={isProcessingReceipt}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Receipt Photo</label>
                    <div className="text-xs text-muted-foreground">
                      {receiptImageInput ? `✓ ${receiptImageInput.name}` : 'No image selected'}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Notes (Optional)</label>
                  <Textarea
                    placeholder="Any additional notes..."
                    value={receiptNotes}
                    onChange={(e) => setReceiptNotes(e.target.value)}
                    rows={2}
                    disabled={isProcessingReceipt}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowReceiptDialog(false)} disabled={isProcessingReceipt}>Cancel</Button>
                <Button onClick={handleReceiptScan} disabled={isProcessingReceipt}>
                  {isProcessingReceipt ? (
                    <>
                      <MagnifyingGlass size={16} className="animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Add Receipt'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={showRemindersDialog} onOpenChange={setShowRemindersDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 relative">
                <Bell size={16} />
                <span className="hidden sm:inline">Reminders</span>
                {reminders.filter(r => r.enabled && r.nextReminderDate <= Date.now()).length > 0 && (
                  <span className="absolute -top-1 -right-1 h-3 w-3 bg-destructive rounded-full animate-pulse" />
                )}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Bell size={20} />
                  Shopping Reminders
                </DialogTitle>
                <DialogDescription>
                  Automatically remind you when it's time to shop based on your patterns
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-4">
                {reminders.length === 0 ? (
                  <Card className="p-8 text-center bg-muted/20">
                    <Sparkle size={32} className="mx-auto mb-3 text-muted-foreground" />
                    <h4 className="font-medium mb-2">No Reminders Yet</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Create smart reminders based on your shopping history
                    </p>
                    {trips.length >= 3 ? (
                      <Button onClick={generateSmartReminders} className="gap-2">
                        <Lightning size={18} />
                        Generate Smart Reminders
                      </Button>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Add at least 3 shopping trips to generate smart reminders
                      </p>
                    )}
                  </Card>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        {reminders.filter(r => r.enabled).length} active reminders
                      </div>
                      <Button onClick={generateSmartReminders} size="sm" variant="outline" className="gap-1.5">
                        <Lightning size={14} />
                        Update Reminders
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {reminders.map((reminder) => {
                        const isDue = reminder.nextReminderDate <= Date.now();
                        const daysUntil = differenceInDays(reminder.nextReminderDate, Date.now());
                        
                        return (
                          <Card key={reminder.id} className={`p-4 ${isDue ? 'border-primary bg-primary/5' : ''}`}>
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Storefront size={18} className="text-primary" />
                                  <span className="font-semibold">{reminder.storeName}</span>
                                  <Badge className={categoryColors[reminder.category]}>
                                    {categoryLabels[reminder.category]}
                                  </Badge>
                                  {isDue && (
                                    <Badge className="bg-primary text-primary-foreground gap-1">
                                      <Bell size={12} />
                                      Due Now
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {reminder.frequency.charAt(0).toUpperCase() + reminder.frequency.slice(1)} shopping • 
                                  Avg: ${reminder.averageSpend.toFixed(2)}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {isDue ? (
                                    'Reminder is due!'
                                  ) : daysUntil > 0 ? (
                                    `Next reminder in ${daysUntil} day${daysUntil === 1 ? '' : 's'}`
                                  ) : (
                                    `Next reminder: ${format(reminder.nextReminderDate, 'MMM d, yyyy')}`
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={reminder.enabled}
                                  onCheckedChange={() => toggleReminder(reminder.id)}
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteReminder(reminder.id)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Trash size={14} className="text-destructive" />
                                </Button>
                              </div>
                            </div>

                            {reminder.commonItems.length > 0 && (
                              <div className="mt-3 pt-3 border-t">
                                <div className="text-xs font-medium text-muted-foreground mb-2">Common Items:</div>
                                <div className="flex flex-wrap gap-1.5">
                                  {reminder.commonItems.slice(0, 6).map((item, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs">
                                      {item}
                                    </Badge>
                                  ))}
                                  {reminder.commonItems.length > 6 && (
                                    <Badge variant="outline" className="text-xs">
                                      +{reminder.commonItems.length - 6} more
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            )}

                            {isDue && (
                              <div className="mt-3 pt-3 border-t flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => snoozeReminder(reminder.id, 1)}
                                  className="flex-1"
                                >
                                  Snooze 1 day
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => snoozeReminder(reminder.id, 3)}
                                  className="flex-1"
                                >
                                  Snooze 3 days
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => snoozeReminder(reminder.id, 7)}
                                  className="flex-1"
                                >
                                  Snooze 1 week
                                </Button>
                              </div>
                            )}
                          </Card>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showAnalyticsDialog} onOpenChange={setShowAnalyticsDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <ChartLine size={16} />
                <span className="hidden sm:inline">Analytics</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ChartLine size={20} />
                  Shopping Analytics & Comparisons
                </DialogTitle>
                <DialogDescription>
                  Compare your shopping habits across time periods
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Comparison Period</label>
                  <Select value={comparisonPeriod} onValueChange={(v) => setComparisonPeriod(v as typeof comparisonPeriod)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="day">Day-to-Day</SelectItem>
                      <SelectItem value="week">Week-to-Week</SelectItem>
                      <SelectItem value="month">Month-to-Month</SelectItem>
                      <SelectItem value="year">Year-to-Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Card className="p-4 bg-primary/5 border-primary/20">
                    <div className="text-sm text-muted-foreground mb-1">Current Period</div>
                    <div className="text-2xl font-bold text-primary">${comparisonData.currentTotal.toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground mt-1">{comparisonData.currentTrips} trips</div>
                  </Card>
                  
                  <Card className="p-4 bg-muted/30">
                    <div className="text-sm text-muted-foreground mb-1">Previous Period</div>
                    <div className="text-2xl font-bold">${comparisonData.previousTotal.toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground mt-1">{comparisonData.previousTrips} trips</div>
                  </Card>
                </div>

                <Card className={`p-4 ${comparisonData.percentageChange > 0 ? 'bg-destructive/5 border-destructive/20' : 'bg-success/5 border-success/20'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-muted-foreground">Change</div>
                      <div className="text-xl font-bold flex items-center gap-2 mt-1">
                        {comparisonData.percentageChange > 0 ? (
                          <><TrendUp size={20} className="text-destructive" /> +{comparisonData.percentageChange.toFixed(1)}%</>
                        ) : comparisonData.percentageChange < 0 ? (
                          <><TrendDown size={20} className="text-success" /> {comparisonData.percentageChange.toFixed(1)}%</>
                        ) : (
                          <>0%</>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">Difference</div>
                      <div className={`text-xl font-bold mt-1 ${comparisonData.percentageChange > 0 ? 'text-destructive' : comparisonData.percentageChange < 0 ? 'text-success' : ''}`}>
                        ${Math.abs(comparisonData.currentTotal - comparisonData.previousTotal).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </Card>

                <div>
                  <h4 className="font-medium mb-3">Spending by Category</h4>
                  <div className="space-y-2">
                    {Object.entries(comparisonData.categorySpending).map(([cat, data]) => (
                      <Card key={cat} className="p-3">
                        <div className="flex items-center justify-between mb-2">
                          <Badge className={categoryColors[cat as ShoppingCategory]}>
                            {categoryLabels[cat as ShoppingCategory]}
                          </Badge>
                          <div className="text-sm font-semibold">
                            ${data.current.toFixed(2)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>Previous: ${data.previous.toFixed(2)}</span>
                          {data.previous > 0 && (
                            <span className={data.current > data.previous ? 'text-destructive' : 'text-success'}>
                              ({data.current > data.previous ? '+' : ''}
                              {(((data.current - data.previous) / data.previous) * 100).toFixed(1)}%)
                            </span>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>

                {trips.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <ClockCounterClockwise size={18} />
                      Shopping Trip History
                    </h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {[...trips].sort((a, b) => b.date - a.date).slice(0, 8).map((trip) => {
                        const categories = getTripCategories(trip);
                        const topCategory = Object.entries(categories).sort(([,a], [,b]) => (b as number) - (a as number))[0];
                        
                        return (
                          <Card key={trip.id} className="p-3 hover:border-primary/50 transition-colors cursor-pointer group" onClick={() => handleRevisitTrip(trip)}>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="font-medium flex items-center gap-2">
                                  <Storefront size={16} />
                                  {trip.storeName}
                                  {topCategory && (
                                    <Badge className={`text-xs ${categoryColors[topCategory[0] as ShoppingCategory]}`}>
                                      {categoryLabels[topCategory[0] as ShoppingCategory]}
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {format(trip.date, 'MMM d, yyyy')} • {trip.itemCount} items
                                </div>
                              </div>
                              <div className="text-right flex items-center gap-2">
                                <div>
                                  <div className="font-bold text-primary">${trip.total.toFixed(2)}</div>
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRevisitTrip(trip);
                                  }}
                                >
                                  <ArrowClockwise size={16} />
                                </Button>
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showTripRevisitsDialog} onOpenChange={setShowTripRevisitsDialog}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ClockCounterClockwise size={20} />
                  Similar Shopping Trips
                </DialogTitle>
                <DialogDescription>
                  {selectedTripForRevisit && (
                    <>Reviewing {selectedTripForRevisit.storeName} trip from {format(selectedTripForRevisit.date, 'MMM d, yyyy')}</>
                  )}
                </DialogDescription>
              </DialogHeader>
              {selectedTripForRevisit && (
                <div className="space-y-6 py-4">
                  <Card className="p-4 bg-primary/5 border-primary/20">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-bold text-lg flex items-center gap-2">
                          <Storefront size={20} />
                          {selectedTripForRevisit.storeName}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {format(selectedTripForRevisit.date, 'EEEE, MMMM d, yyyy')}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">${selectedTripForRevisit.total.toFixed(2)}</div>
                        <div className="text-xs text-muted-foreground">{selectedTripForRevisit.itemCount} items</div>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(getTripCategories(selectedTripForRevisit)).map(([cat, count]) => (
                        <Badge key={cat} className={categoryColors[cat as ShoppingCategory]}>
                          {categoryLabels[cat as ShoppingCategory]}: {count}
                        </Badge>
                      ))}
                    </div>
                  </Card>

                  {(() => {
                    const similarTrips = getSimilarTrips(selectedTripForRevisit);
                    return similarTrips.length > 0 ? (
                      <div>
                        <h4 className="font-medium mb-3 flex items-center gap-2">
                          <CalendarBlank size={18} />
                          Similar Trips from the Same Period
                        </h4>
                        <div className="text-sm text-muted-foreground mb-3">
                          Found {similarTrips.length} similar {similarTrips.length === 1 ? 'trip' : 'trips'} to {selectedTripForRevisit.storeName} during comparable time periods
                        </div>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {similarTrips.map((trip) => {
                            const categories = getTripCategories(trip);
                            const topCategory = Object.entries(categories).sort(([,a], [,b]) => (b as number) - (a as number))[0];
                            
                            return (
                              <Card key={trip.id} className="p-3 hover:border-accent/50 transition-colors cursor-pointer" onClick={() => {
                                setSelectedTripForRevisit(trip);
                              }}>
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="font-medium flex items-center gap-2">
                                      {format(trip.date, 'MMM d, yyyy')}
                                      {topCategory && (
                                        <Badge className={`text-xs ${categoryColors[topCategory[0] as ShoppingCategory]}`}>
                                          {categoryLabels[topCategory[0] as ShoppingCategory]}
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                      {trip.itemCount} items • {trip.storeName}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="font-bold">${trip.total.toFixed(2)}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {Math.abs(new Date(trip.date).getTime() - selectedTripForRevisit.date) / (1000 * 60 * 60 * 24) > 365 
                                        ? 'Year ago' 
                                        : Math.abs(new Date(trip.date).getTime() - selectedTripForRevisit.date) / (1000 * 60 * 60 * 24) > 30
                                        ? 'Months ago'
                                        : 'Weeks ago'}
                                    </div>
                                  </div>
                                </div>
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <Card className="p-6 text-center bg-muted/20">
                        <CalendarBlank size={32} className="mx-auto mb-2 text-muted-foreground" />
                        <div className="text-sm text-muted-foreground">
                          No similar trips found for this store during comparable periods
                        </div>
                      </Card>
                    );
                  })()}

                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <ShoppingCart size={18} />
                      Items from This Trip
                    </h4>
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {(() => {
                        const tripItems = getItemsFromTrip(selectedTripForRevisit);
                        return tripItems.length > 0 ? (
                          <>
                            {tripItems.map((item, index) => (
                              <Card key={index} className="p-3 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="flex-1">
                                    <div className="font-medium">{item.name}</div>
                                    {item.quantity && (
                                      <div className="text-xs text-muted-foreground">Qty: {item.quantity}</div>
                                    )}
                                  </div>
                                  <Badge className={`text-xs ${categoryColors[item.category]}`}>
                                    {categoryLabels[item.category]}
                                  </Badge>
                                </div>
                                <div className="text-sm font-semibold">
                                  ${item.estimatedPrice?.toFixed(2)}
                                </div>
                              </Card>
                            ))}
                            <Button 
                              onClick={() => handleAddRevisitItems(tripItems)} 
                              className="w-full gap-2 mt-4"
                              size="lg"
                            >
                              <Plus size={18} />
                              Add All {tripItems.length} Items to Shopping List
                            </Button>
                          </>
                        ) : (
                          <div className="text-center py-6 text-muted-foreground text-sm">
                            No items found for this trip
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex flex-wrap gap-2 items-end">
          <div className="flex-1 min-w-[120px]">
            <Input
              id="new-shopping-item"
              placeholder="Item name..."
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyPress={handleKeyPress}
              className="h-9"
            />
          </div>
          <div className="w-24">
            <Input
              placeholder="Qty"
              value={newItemQuantity}
              onChange={(e) => setNewItemQuantity(e.target.value)}
              onKeyPress={handleKeyPress}
              className="h-9"
            />
          </div>
          <div className="w-24">
            <Input
              placeholder="$0.00"
              type="number"
              step="0.01"
              value={newItemPrice}
              onChange={(e) => setNewItemPrice(e.target.value)}
              onKeyPress={handleKeyPress}
              className="h-9"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Select value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as ShoppingCategory)}>
            <SelectTrigger className="w-36 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(categoryLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            placeholder="Store (optional)"
            value={selectedStore}
            onChange={(e) => setSelectedStore(e.target.value)}
            onKeyPress={handleKeyPress}
            className="w-36 h-9"
          />

          <Select value={selectedPriority} onValueChange={(v) => setSelectedPriority(v as 'low' | 'medium' | 'high')}>
            <SelectTrigger className="w-28 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={addItem} size="sm" className="gap-1.5 h-9">
            <Plus size={16} />
            Add
          </Button>
        </div>

        <Card className="p-3 bg-muted/30 border-muted">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <CurrencyDollar size={18} className="text-primary" weight="bold" />
              <Input
                placeholder="Budget"
                type="number"
                step="0.01"
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                onBlur={updateBudget}
                className="w-28 h-8"
              />
            </div>
            <div className="text-sm space-x-3">
              <span className="text-muted-foreground">
                Estimated: <span className="font-semibold text-foreground">${totalEstimated.toFixed(2)}</span>
              </span>
              <span className="text-muted-foreground">
                Spent: <span className="font-semibold text-foreground">${totalSpent.toFixed(2)}</span>
              </span>
              {budget && (
                <span className={totalEstimated > budget ? 'text-destructive font-semibold' : 'text-success font-semibold'}>
                  Budget: ${budget.toFixed(2)}
                </span>
              )}
            </div>
          </div>
        </Card>

        <div className="flex gap-2 flex-wrap">
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
            <SelectTrigger className="w-36 h-8">
              <div className="flex items-center gap-1.5">
                <SortAscending size={14} />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="priority">Priority</SelectItem>
              <SelectItem value="category">Category</SelectItem>
              <SelectItem value="price">Price</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterCategory} onValueChange={(v) => setFilterCategory(v as typeof filterCategory)}>
            <SelectTrigger className="w-40 h-8">
              <div className="flex items-center gap-1.5">
                <FunnelSimple size={14} />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {Object.entries(categoryLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as typeof viewMode)}>
          <TabsList className="grid w-full grid-cols-3 h-9">
            <TabsTrigger value="all" className="text-xs">All Items</TabsTrigger>
            <TabsTrigger value="category" className="text-xs">By Category</TabsTrigger>
            <TabsTrigger value="store" className="text-xs">By Store</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-3 space-y-2 max-h-[400px] overflow-y-auto">
            {unpurchasedItems.length === 0 && purchasedItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No items in your shopping list
              </div>
            ) : (
              <>
                <AnimatePresence>
                  {unpurchasedItems.map((item) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="flex items-start gap-2 p-2.5 bg-card rounded-lg border hover:border-primary/50 transition-colors group"
                    >
                      <Checkbox
                        checked={item.purchased}
                        onCheckedChange={() => togglePurchased(item.id)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="font-medium text-sm flex items-center gap-1.5">
                              {item.name}
                              {item.barcode && (
                                <span title={`Barcode: ${item.barcode}`}>
                                  <Barcode size={14} className="text-muted-foreground" />
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              <Badge className={`text-xs px-1.5 py-0 ${categoryColors[item.category]}`}>
                                {categoryLabels[item.category]}
                              </Badge>
                              <Badge className={`text-xs px-1.5 py-0 ${priorityColors[item.priority]}`}>
                                {item.priority}
                              </Badge>
                              {item.store && (
                                <Badge variant="outline" className="text-xs px-1.5 py-0 gap-1">
                                  <Storefront size={12} />
                                  {item.store}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {item.quantity && (
                              <span className="text-xs text-muted-foreground">{item.quantity}</span>
                            )}
                            {item.estimatedPrice && (
                              <span className="text-sm font-semibold text-primary">
                                ${item.estimatedPrice.toFixed(2)}
                              </span>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteItem(item.id)}
                              className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash size={14} className="text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {purchasedItems.length > 0 && (
                  <div className="pt-2 mt-2 border-t">
                    <div className="text-xs font-medium text-muted-foreground mb-2">Purchased</div>
                    <AnimatePresence>
                      {purchasedItems.map((item) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 0.6 }}
                          exit={{ opacity: 0 }}
                          className="flex items-start gap-2 p-2 bg-muted/30 rounded-lg mb-1.5 group"
                        >
                          <Checkbox
                            checked={item.purchased}
                            onCheckedChange={() => togglePurchased(item.id)}
                            className="mt-0.5"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm line-through text-muted-foreground flex items-center gap-1.5">
                                {item.name}
                                {item.receiptId && (
                                  <span title="From receipt">
                                    <ReceiptIcon size={12} className="text-muted-foreground" />
                                  </span>
                                )}
                              </span>
                              <div className="flex items-center gap-2">
                                {(item.actualPrice || item.estimatedPrice) && (
                                  <span className="text-xs text-muted-foreground">
                                    ${(item.actualPrice || item.estimatedPrice)?.toFixed(2)}
                                  </span>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteItem(item.id)}
                                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <Trash size={12} className="text-destructive" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="category" className="mt-3 space-y-3 max-h-[400px] overflow-y-auto">
            {Object.entries(groupedByCategory).map(([category, categoryItems]) => (
              <Card key={category} className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className={categoryColors[category as ShoppingCategory]}>
                    {categoryLabels[category as ShoppingCategory]}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {categoryItems.filter(i => !i.purchased).length} items
                  </span>
                </div>
                <div className="space-y-1.5">
                  {categoryItems.filter(i => !i.purchased).map((item) => (
                    <div key={item.id} className="flex items-center gap-2 p-2 bg-muted/20 rounded">
                      <Checkbox
                        checked={item.purchased}
                        onCheckedChange={() => togglePurchased(item.id)}
                      />
                      <span className="flex-1 text-sm">{item.name}</span>
                      {item.estimatedPrice && (
                        <span className="text-sm font-semibold">${item.estimatedPrice.toFixed(2)}</span>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteItem(item.id)}
                        className="h-6 w-6 p-0"
                      >
                        <Trash size={12} />
                      </Button>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="store" className="mt-3 space-y-3 max-h-[400px] overflow-y-auto">
            {Object.entries(groupedByStore).map(([store, storeItems]) => (
              <Card key={store} className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Storefront size={16} className="text-primary" />
                  <span className="font-medium text-sm">{store}</span>
                  <span className="text-xs text-muted-foreground">
                    {storeItems.filter(i => !i.purchased).length} items
                  </span>
                </div>
                <div className="space-y-1.5">
                  {storeItems.filter(i => !i.purchased).map((item) => (
                    <div key={item.id} className="flex items-center gap-2 p-2 bg-muted/20 rounded">
                      <Checkbox
                        checked={item.purchased}
                        onCheckedChange={() => togglePurchased(item.id)}
                      />
                      <span className="flex-1 text-sm">{item.name}</span>
                      <Badge className={`text-xs ${categoryColors[item.category]}`}>
                        {categoryLabels[item.category]}
                      </Badge>
                      {item.estimatedPrice && (
                        <span className="text-sm font-semibold">${item.estimatedPrice.toFixed(2)}</span>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteItem(item.id)}
                        className="h-6 w-6 p-0"
                      >
                        <Trash size={12} />
                      </Button>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </WidgetContainer>
  );
}
