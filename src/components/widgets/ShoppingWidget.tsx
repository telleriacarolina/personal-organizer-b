import { useState } from 'react';
import { WidgetContainer } from '@/components/WidgetContainer';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { ShoppingCart, Plus, Trash, Storefront, CurrencyDollar, SortAscending, FunnelSimple } from '@phosphor-icons/react';
import { PersonalShoppingItem, WidgetSize } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface ShoppingWidgetProps {
  items: PersonalShoppingItem[];
  budget?: number;
  onUpdate: (data: { items?: PersonalShoppingItem[]; budget?: number }) => void;
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

  const togglePurchased = (id: string) => {
    onUpdate({
      items: items.map((item) =>
        item.id === id ? { ...item, purchased: !item.purchased } : item
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
                            <div className="font-medium text-sm">{item.name}</div>
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
                              <span className="text-sm line-through text-muted-foreground">{item.name}</span>
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
