import { useState, useRef } from 'react';
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
import { ShoppingCart, Plus, Trash, Storefront, CurrencyDollar, SortAscending, FunnelSimple, Barcode, Receipt as ReceiptIcon, ChartLine, Camera, Scan, MagnifyingGlass, TrendUp, TrendDown, CalendarBlank } from '@phosphor-icons/react';
import { PersonalShoppingItem, Receipt, ShoppingTrip, WidgetSize } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { format, startOfDay, startOfMonth, startOfYear, subDays, subMonths, subYears } from 'date-fns';

interface ShoppingWidgetProps {
  items: PersonalShoppingItem[];
  budget?: number;
  receipts?: Receipt[];
  trips?: ShoppingTrip[];
  onUpdate: (data: { items?: PersonalShoppingItem[]; budget?: number; receipts?: Receipt[]; trips?: ShoppingTrip[] }) => void;
  onRemove: () => void;
  widgetId: string;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  size?: WidgetSize;
  onSizeChange?: (size: WidgetSize) => void;
  snapToGrid?: boolean;
  globalLock?: boolean;
}

type CategoryType = PersonalShoppingItem['category'];

const categoryLabels: Record<CategoryType, string> = {
  'groceries': 'Groceries',
  'household': 'Household',
  'personal-care': 'Personal Care',
  'electronics': 'Electronics',
  'clothing': 'Clothing',
  'health': 'Health',
  'other': 'Other'
};

const categoryColors: Record<CategoryType, string> = {
  'groceries': 'bg-success/20 text-success-foreground border-success/30',
  'household': 'bg-primary/20 text-primary-foreground border-primary/30',
  'personal-care': 'bg-accent/20 text-accent-foreground border-accent/30',
  'electronics': 'bg-chart-1/20 text-foreground border-chart-1/30',
  'clothing': 'bg-chart-2/20 text-foreground border-chart-2/30',
  'health': 'bg-chart-3/20 text-foreground border-chart-3/30',
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
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>('groceries');
  const [selectedStore, setSelectedStore] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [viewMode, setViewMode] = useState<'all' | 'category' | 'store'>('all');
  const [filterCategory, setFilterCategory] = useState<CategoryType | 'all'>('all');
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showAnalyticsDialog, setShowAnalyticsDialog] = useState(false);
  const [comparisonPeriod, setComparisonPeriod] = useState<'day' | 'week' | 'month' | 'year'>('month');

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
      const prompt = window.spark.llmPrompt(['You are a product information assistant. Given this barcode number: ',', provide the most likely product name and category.\n\nReturn a JSON object with:\n- name: the product name (string)\n- category: one of: groceries, household, personal-care, electronics, clothing, health, other\n- estimatedPrice: a reasonable estimated price in USD (number)\n\nBe realistic and use common knowledge about products.'], barcodeInput);

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

  const handleReceiptScan = async () => {
    if (!receiptItems.trim() || !receiptStoreName.trim()) {
      toast.error('Please fill in store name and items');
      return;
    }

    try {
      const prompt = window.spark.llmPrompt(['You are a receipt parser. Parse this receipt information:\nStore: ', '\nItems text: ', '\nTotal: ', '\n\nReturn a JSON object with a single property "items" that contains an array of objects with:\n- name: item name (string)\n- quantity: quantity if mentioned (string or undefined)\n- price: price per item in USD (number)\n- category: best guess from: groceries, household, personal-care, electronics, clothing, health, other\n\nBe smart about parsing prices and quantities from the text.'], receiptStoreName, receiptItems, receiptTotal || 'unknown');

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
  }, {} as Record<CategoryType, PersonalShoppingItem[]>);

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
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Store Name</label>
                    <Input
                      placeholder="e.g., Walmart"
                      value={receiptStoreName}
                      onChange={(e) => setReceiptStoreName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Date</label>
                    <Input
                      type="date"
                      value={receiptDate}
                      onChange={(e) => setReceiptDate(e.target.value)}
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
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Receipt Image (Optional)</label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full gap-2"
                    >
                      <Camera size={16} />
                      {receiptImageInput ? 'Change Image' : 'Upload Image'}
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => setReceiptImageInput(e.target.files?.[0] || null)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Notes (Optional)</label>
                  <Textarea
                    placeholder="Any additional notes..."
                    value={receiptNotes}
                    onChange={(e) => setReceiptNotes(e.target.value)}
                    rows={2}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowReceiptDialog(false)}>Cancel</Button>
                <Button onClick={handleReceiptScan}>Add Receipt</Button>
              </DialogFooter>
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
                          <Badge className={categoryColors[cat as CategoryType]}>
                            {categoryLabels[cat as CategoryType]}
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

                {receipts.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <CalendarBlank size={18} />
                      Recent Receipts
                    </h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {[...receipts].sort((a, b) => b.date - a.date).slice(0, 10).map((receipt) => (
                        <Card key={receipt.id} className="p-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-medium flex items-center gap-2">
                                <Storefront size={16} />
                                {receipt.storeName}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {format(receipt.date, 'MMM d, yyyy')} • {receipt.items.length} items
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-primary">${receipt.total.toFixed(2)}</div>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
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
          <Select value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as CategoryType)}>
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
                  <Badge className={categoryColors[category as CategoryType]}>
                    {categoryLabels[category as CategoryType]}
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
