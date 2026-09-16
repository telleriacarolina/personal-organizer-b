import { useState } from 'react';
import { WidgetContainer } from '@/components/WidgetContainer';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AISuggestionsPanel } from '@/components/AISuggestionsPanel';
import { 
  Plus, 
  X, 
  Calendar, 
  Clock, 
  User, 
  Briefcase,
  ShoppingCart,
  ClipboardText,
  Play,
  Stop,
  Trash,
  Check,
  ForkKnife,
  Target,
  FloppyDisk,
  CalendarBlank,
  Copy,
  Gear,
  ArrowRight
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import { AIInsightAction, ClientSlot, WorkMeal, TimeEntry, Job, ShoppingItem, WorkErrand, WorkRoutine, WorkOrganizationPreference, WorkOrganizationType, WidgetAIState, WidgetSize } from '@/types';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { buildAIInputHash, generateWidgetAIState, updateAIInsightStatus } from '@/lib/ai-organizer';

interface WorkWidgetProps {
  widgetId: string;
  clientSlots: ClientSlot[];
  meals: WorkMeal[];
  timeEntries: TimeEntry[];
  jobs: Job[];
  shoppingList: ShoppingItem[];
  errands: WorkErrand[];
  routines?: WorkRoutine[];
  activeRoutineId?: string;
  organizationPreference?: WorkOrganizationPreference;
  aiState?: WidgetAIState;
  onAIStateChange: (state: WidgetAIState) => void;
  onUpdate: (data: {
    clientSlots?: ClientSlot[];
    meals?: WorkMeal[];
    timeEntries?: TimeEntry[];
    jobs?: Job[];
    shoppingList?: ShoppingItem[];
    errands?: WorkErrand[];
    routines?: WorkRoutine[];
    activeRoutineId?: string;
    organizationPreference?: WorkOrganizationPreference;
  }) => void;
  onRemove: () => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  size?: WidgetSize;
  onSizeChange?: (size: WidgetSize) => void;
}

export function WorkWidget({
  widgetId,
  clientSlots,
  meals,
  timeEntries,
  jobs,
  shoppingList,
  errands,
  routines = [],
  activeRoutineId,
  organizationPreference,
  aiState,
  onAIStateChange,
  onUpdate,
  onRemove,
  onDragStart,
  onDragEnd,
  size,
  onSizeChange
}: WorkWidgetProps) {
  const [activeTimer, setActiveTimer] = useState<string | null>(null);
  const [showClientDialog, setShowClientDialog] = useState(false);
  const [showMealDialog, setShowMealDialog] = useState(false);
  const [showJobDialog, setShowJobDialog] = useState(false);
  const [showErrandDialog, setShowErrandDialog] = useState(false);
  const [showRoutineDialog, setShowRoutineDialog] = useState(false);
  const [showOrganizationDialog, setShowOrganizationDialog] = useState(false);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);

  const addClientSlot = (data: Omit<ClientSlot, 'id' | 'createdAt'>) => {
    const newSlot: ClientSlot = {
      ...data,
      id: Date.now().toString(),
      createdAt: Date.now()
    };
    onUpdate({ clientSlots: [...clientSlots, newSlot] });
    toast.success('Client slot scheduled');
    setShowClientDialog(false);
  };

  const updateClientStatus = (id: string, status: ClientSlot['status']) => {
    onUpdate({
      clientSlots: clientSlots.map(slot =>
        slot.id === id ? { ...slot, status } : slot
      )
    });
  };

  const deleteClientSlot = (id: string) => {
    onUpdate({ clientSlots: clientSlots.filter(s => s.id !== id) });
    toast.success('Client slot deleted');
  };

  const addMeal = (data: Omit<WorkMeal, 'id' | 'createdAt'>) => {
    const newMeal: WorkMeal = {
      ...data,
      id: Date.now().toString(),
      createdAt: Date.now()
    };
    onUpdate({ meals: [...meals, newMeal] });
    toast.success('Meal scheduled');
    setShowMealDialog(false);
  };

  const deleteMeal = (id: string) => {
    onUpdate({ meals: meals.filter(m => m.id !== id) });
    toast.success('Meal deleted');
  };

  const startTimer = (description: string, project?: string) => {
    const newEntry: TimeEntry = {
      id: Date.now().toString(),
      description,
      project,
      startTime: Date.now(),
      createdAt: Date.now()
    };
    onUpdate({ timeEntries: [...timeEntries, newEntry] });
    setActiveTimer(newEntry.id);
    toast.success('Timer started');
  };

  const stopTimer = (id: string) => {
    const entry = timeEntries.find(e => e.id === id);
    if (entry && !entry.endTime) {
      const endTime = Date.now();
      const duration = Math.floor((endTime - entry.startTime) / 1000 / 60);
      onUpdate({
        timeEntries: timeEntries.map(e =>
          e.id === id ? { ...e, endTime, duration } : e
        )
      });
      setActiveTimer(null);
      toast.success(`Timer stopped: ${duration} minutes`);
    }
  };

  const deleteTimeEntry = (id: string) => {
    onUpdate({ timeEntries: timeEntries.filter(e => e.id !== id) });
    if (activeTimer === id) setActiveTimer(null);
    toast.success('Time entry deleted');
  };

  const addJob = (data: Omit<Job, 'id' | 'createdAt'>) => {
    const newJob: Job = {
      ...data,
      id: Date.now().toString(),
      createdAt: Date.now()
    };
    onUpdate({ jobs: [...jobs, newJob] });
    toast.success('Job added');
    setShowJobDialog(false);
  };

  const updateJobStatus = (id: string, status: Job['status']) => {
    onUpdate({
      jobs: jobs.map(job =>
        job.id === id ? { ...job, status } : job
      )
    });
  };

  const deleteJob = (id: string) => {
    onUpdate({ jobs: jobs.filter(j => j.id !== id) });
    toast.success('Job deleted');
  };

  const addShoppingItem = (item: string, quantity?: string, category?: string) => {
    const newItem: ShoppingItem = {
      id: Date.now().toString(),
      item,
      quantity,
      category,
      purchased: false,
      createdAt: Date.now()
    };
    onUpdate({ shoppingList: [...shoppingList, newItem] });
  };

  const toggleShoppingItem = (id: string) => {
    onUpdate({
      shoppingList: shoppingList.map(item =>
        item.id === id ? { ...item, purchased: !item.purchased } : item
      )
    });
  };

  const deleteShoppingItem = (id: string) => {
    onUpdate({ shoppingList: shoppingList.filter(i => i.id !== id) });
  };

  const addErrand = (data: Omit<WorkErrand, 'id' | 'createdAt'>) => {
    const newErrand: WorkErrand = {
      ...data,
      id: Date.now().toString(),
      createdAt: Date.now()
    };
    onUpdate({ errands: [...errands, newErrand] });
    toast.success('Work errand added');
    setShowErrandDialog(false);
  };

  const toggleErrand = (id: string) => {
    onUpdate({
      errands: errands.map(errand =>
        errand.id === id ? { ...errand, completed: !errand.completed } : errand
      )
    });
  };

  const deleteErrand = (id: string) => {
    onUpdate({ errands: errands.filter(e => e.id !== id) });
    toast.success('Work errand deleted');
  };

  const saveAsRoutine = (name: string, description?: string) => {
    const newRoutine: WorkRoutine = {
      id: Date.now().toString(),
      name,
      description,
      clientSlots: [...clientSlots],
      meals: [...meals],
      timeEntries: [...timeEntries],
      jobs: [...jobs],
      shoppingList: [...shoppingList],
      errands: [...errands],
      createdAt: Date.now()
    };
    onUpdate({ routines: [...routines, newRoutine] });
    toast.success(`Routine "${name}" saved!`);
    setShowRoutineDialog(false);
  };

  const loadRoutine = (routineId: string) => {
    const routine = routines.find(r => r.id === routineId);
    if (!routine) return;
    
    onUpdate({
      clientSlots: [...routine.clientSlots],
      meals: [...routine.meals],
      timeEntries: [...routine.timeEntries],
      jobs: [...routine.jobs],
      shoppingList: [...routine.shoppingList],
      errands: [...routine.errands],
      activeRoutineId: routineId
    });
    toast.success(`Loaded routine "${routine.name}"`);
  };

  const duplicateRoutine = (routineId: string) => {
    const routine = routines.find(r => r.id === routineId);
    if (!routine) return;

    const duplicatedRoutine: WorkRoutine = {
      ...routine,
      id: Date.now().toString(),
      name: `${routine.name} (Copy)`,
      createdAt: Date.now()
    };
    onUpdate({ routines: [...routines, duplicatedRoutine] });
    toast.success(`Routine duplicated!`);
  };

  const deleteRoutine = (routineId: string) => {
    onUpdate({ 
      routines: routines.filter(r => r.id !== routineId),
      ...(activeRoutineId === routineId && { activeRoutineId: undefined })
    });
    toast.success('Routine deleted');
  };

  const clearCurrentWorkspace = () => {
    onUpdate({
      clientSlots: [],
      meals: [],
      timeEntries: [],
      jobs: [],
      shoppingList: [],
      errands: [],
      activeRoutineId: undefined
    });
    toast.success('Workspace cleared');
  };

  const updateOrganizationPreference = (newPreference: WorkOrganizationPreference) => {
    onUpdate({ organizationPreference: newPreference });
    toast.success(`Organization changed to ${getOrganizationLabel(newPreference.type)}`);
    setShowOrganizationDialog(false);
  };

  const getTotalHoursToday = () => {
    const today = new Date().setHours(0, 0, 0, 0);
    return timeEntries
      .filter(e => new Date(e.startTime).setHours(0, 0, 0, 0) === today && e.duration)
      .reduce((sum, e) => sum + (e.duration || 0), 0);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-destructive text-destructive-foreground';
      case 'high': return 'bg-accent text-accent-foreground';
      case 'medium': return 'bg-secondary text-secondary-foreground';
      case 'low': return 'bg-muted text-muted-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const getOrganizationLabel = (type?: string) => {
    switch (type) {
      case 'date': return 'By Date';
      case 'week': return 'By Week';
      case 'month': return 'By Month';
      case 'time-of-day': return 'By Time';
      case 'job-based': return 'By Job';
      default: return 'Custom';
    }
  };

  const aiInput = {
    clientSlots,
    meals,
    timeEntries,
    jobs,
    errands,
    routines,
    organizationPreference,
  };
  const isAIStale = aiState ? aiState.sourceHash !== buildAIInputHash(aiInput) : false;

  const updateInsightStatus = (insightId: string, status: 'applied' | 'dismissed') => {
    if (!aiState) return;
    onAIStateChange(updateAIInsightStatus(aiState, insightId, status));
  };

  const handleGenerateInsights = async () => {
    setIsGeneratingInsights(true);
    try {
      const nextState = await generateWidgetAIState({
        widgetId,
        feature: 'work',
        input: { clientSlots, meals, timeEntries, jobs, errands, routines, organizationPreference },
        dataSummary: [
          'Feature: work organization review',
          `${clientSlots.length} client slots`,
          `${jobs.length} jobs, ${errands.length} errands, ${timeEntries.length} time entries`,
          `${routines.length} saved routines available for future recommendations`,
        ],
      });
      onAIStateChange(nextState);
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  const handleApplyAction = (insightId: string, action: AIInsightAction) => {
    void insightId;
    void action;
    toast.info('AI apply actions will be enabled in Phase 2');
  };

  return (
    <WidgetContainer
      title="Work Dashboard"
      icon={<Briefcase size={24} weight="duotone" />}
      onRemove={onRemove}
      value={{ id: widgetId, type: 'work', clientSlots, meals, timeEntries, jobs, shoppingList, errands }}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      size={size}
      onSizeChange={onSizeChange}
      widgetType="work"
    >
      <AISuggestionsPanel
        title="AI Work Recommendations"
        featureLabel="work"
        state={aiState}
        isGenerating={isGeneratingInsights}
        isStale={isAIStale}
        onGenerate={handleGenerateInsights}
        onApplyAction={handleApplyAction}
        onDismissInsight={(insightId) => updateInsightStatus(insightId, 'dismissed')}
      />

      <Card className="col-span-1 md:col-span-2 lg:col-span-3 border-0 shadow-none">
      <CardHeader className="flex flex-row items-center justify-between pb-3 px-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="gap-1">
            <Clock size={14} />
            {getTotalHoursToday()}m today
          </Badge>
          {organizationPreference && (
            <Badge 
              variant="secondary" 
              className="gap-1 cursor-pointer hover:bg-secondary/80 transition-colors"
              onClick={() => setShowOrganizationDialog(true)}
            >
              📋 {getOrganizationLabel(organizationPreference.type)}
              {organizationPreference.startTime && ` (${organizationPreference.startTime})`}
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowOrganizationDialog(true)}
          className="gap-2"
        >
          <Gear size={18} />
          Change Organization
        </Button>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="clients" className="w-full">
          <TabsList className="grid w-full grid-cols-7 text-xs">
            <TabsTrigger value="clients" className="text-xs">Clients</TabsTrigger>
            <TabsTrigger value="meals" className="text-xs">Meals</TabsTrigger>
            <TabsTrigger value="time" className="text-xs">Time</TabsTrigger>
            <TabsTrigger value="jobs" className="text-xs">Jobs</TabsTrigger>
            <TabsTrigger value="shopping" className="text-xs">Shopping</TabsTrigger>
            <TabsTrigger value="errands" className="text-xs">Errands</TabsTrigger>
            <TabsTrigger value="routines" className="text-xs">Routines</TabsTrigger>
          </TabsList>

          <TabsContent value="clients" className="space-y-3 mt-4">
            <ClientSlotsTab
              clientSlots={clientSlots}
              onAdd={addClientSlot}
              onUpdateStatus={updateClientStatus}
              onDelete={deleteClientSlot}
              showDialog={showClientDialog}
              setShowDialog={setShowClientDialog}
            />
          </TabsContent>

          <TabsContent value="meals" className="space-y-3 mt-4">
            <MealsTab
              meals={meals}
              onAdd={addMeal}
              onDelete={deleteMeal}
              showDialog={showMealDialog}
              setShowDialog={setShowMealDialog}
            />
          </TabsContent>

          <TabsContent value="time" className="space-y-3 mt-4">
            <TimeTrackingTab
              timeEntries={timeEntries}
              activeTimer={activeTimer}
              onStart={startTimer}
              onStop={stopTimer}
              onDelete={deleteTimeEntry}
            />
          </TabsContent>

          <TabsContent value="jobs" className="space-y-3 mt-4">
            <JobsTab
              jobs={jobs}
              onAdd={addJob}
              onUpdateStatus={updateJobStatus}
              onDelete={deleteJob}
              showDialog={showJobDialog}
              setShowDialog={setShowJobDialog}
              getPriorityColor={getPriorityColor}
            />
          </TabsContent>

          <TabsContent value="shopping" className="space-y-3 mt-4">
            <ShoppingListTab
              shoppingList={shoppingList}
              onAdd={addShoppingItem}
              onToggle={toggleShoppingItem}
              onDelete={deleteShoppingItem}
            />
          </TabsContent>

          <TabsContent value="errands" className="space-y-3 mt-4">
            <ErrandsTab
              errands={errands}
              onAdd={addErrand}
              onToggle={toggleErrand}
              onDelete={deleteErrand}
              showDialog={showErrandDialog}
              setShowDialog={setShowErrandDialog}
              getPriorityColor={getPriorityColor}
            />
          </TabsContent>

          <TabsContent value="routines" className="space-y-3 mt-4">
            <RoutinesTab
              routines={routines}
              activeRoutineId={activeRoutineId}
              onSave={saveAsRoutine}
              onLoad={loadRoutine}
              onDuplicate={duplicateRoutine}
              onDelete={deleteRoutine}
              onClearWorkspace={clearCurrentWorkspace}
              showDialog={showRoutineDialog}
              setShowDialog={setShowRoutineDialog}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>

    <OrganizationPreferenceDialog
      open={showOrganizationDialog}
      onOpenChange={setShowOrganizationDialog}
      currentPreference={organizationPreference}
      onUpdate={updateOrganizationPreference}
    />
    </WidgetContainer>
  );
}

function ClientSlotsTab({
  clientSlots,
  onAdd,
  onUpdateStatus,
  onDelete,
  showDialog,
  setShowDialog
}: {
  clientSlots: ClientSlot[];
  onAdd: (data: Omit<ClientSlot, 'id' | 'createdAt'>) => void;
  onUpdateStatus: (id: string, status: ClientSlot['status']) => void;
  onDelete: (id: string) => void;
  showDialog: boolean;
  setShowDialog: (show: boolean) => void;
}) {
  const [formData, setFormData] = useState({
    clientName: '',
    date: '',
    startTime: '',
    endTime: '',
    service: '',
    notes: '',
    status: 'scheduled' as ClientSlot['status']
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientName || !formData.date || !formData.startTime) {
      toast.error('Please fill required fields');
      return;
    }
    onAdd({
      ...formData,
      date: new Date(formData.date).getTime()
    });
    setFormData({
      clientName: '',
      date: '',
      startTime: '',
      endTime: '',
      service: '',
      notes: '',
      status: 'scheduled'
    });
  };

  return (
    <>
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogTrigger asChild>
          <Button className="w-full gap-2">
            <Plus size={18} />
            Schedule Client
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Client Appointment</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="clientName">Client Name *</Label>
              <Input
                id="clientName"
                value={formData.clientName}
                onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                placeholder="John Doe"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="service">Service</Label>
                <Input
                  id="service"
                  value={formData.service}
                  onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                  placeholder="Consultation"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="startTime">Start Time *</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="endTime">End Time</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional details..."
                rows={3}
              />
            </div>
            <Button type="submit" className="w-full">Schedule</Button>
          </form>
        </DialogContent>
      </Dialog>

      <ScrollArea className="h-[400px]">
        <div className="space-y-2">
          {clientSlots.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No client slots scheduled
            </p>
          ) : (
            clientSlots.map((slot) => (
              <div
                key={slot.id}
                className="p-3 rounded-lg border bg-card space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <User size={16} className="text-primary" />
                      <span className="font-semibold">{slot.clientName}</span>
                    </div>
                    {slot.service && (
                      <p className="text-sm text-muted-foreground mt-1">{slot.service}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(slot.id)}
                  >
                    <Trash size={16} />
                  </Button>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar size={14} />
                    {format(slot.date, 'MMM d, yyyy')}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock size={14} />
                    {slot.startTime} {slot.endTime && `- ${slot.endTime}`}
                  </div>
                </div>
                {slot.notes && (
                  <p className="text-xs text-muted-foreground">{slot.notes}</p>
                )}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={slot.status === 'scheduled' ? 'default' : 'outline'}
                    onClick={() => onUpdateStatus(slot.id, 'scheduled')}
                    className="text-xs"
                  >
                    Scheduled
                  </Button>
                  <Button
                    size="sm"
                    variant={slot.status === 'completed' ? 'default' : 'outline'}
                    onClick={() => onUpdateStatus(slot.id, 'completed')}
                    className="text-xs"
                  >
                    Completed
                  </Button>
                  <Button
                    size="sm"
                    variant={slot.status === 'cancelled' ? 'default' : 'outline'}
                    onClick={() => onUpdateStatus(slot.id, 'cancelled')}
                    className="text-xs"
                  >
                    Cancelled
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </>
  );
}

function MealsTab({
  meals,
  onAdd,
  onDelete,
  showDialog,
  setShowDialog
}: {
  meals: WorkMeal[];
  onAdd: (data: Omit<WorkMeal, 'id' | 'createdAt'>) => void;
  onDelete: (id: string) => void;
  showDialog: boolean;
  setShowDialog: (show: boolean) => void;
}) {
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    time: '',
    items: '',
    notes: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.date || !formData.time) {
      toast.error('Please fill required fields');
      return;
    }
    onAdd({
      ...formData,
      date: new Date(formData.date).getTime(),
      items: formData.items ? formData.items.split(',').map(i => i.trim()) : undefined
    });
    setFormData({ name: '', date: '', time: '', items: '', notes: '' });
  };

  return (
    <>
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogTrigger asChild>
          <Button className="w-full gap-2">
            <Plus size={18} />
            Schedule Meal
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Work Meal</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="mealName">Meal Name *</Label>
              <Input
                id="mealName"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Lunch with team"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="mealDate">Date *</Label>
                <Input
                  id="mealDate"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="mealTime">Time *</Label>
                <Input
                  id="mealTime"
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="items">Items (comma-separated)</Label>
              <Input
                id="items"
                value={formData.items}
                onChange={(e) => setFormData({ ...formData, items: e.target.value })}
                placeholder="Sandwiches, Coffee, Salad"
              />
            </div>
            <div>
              <Label htmlFor="mealNotes">Notes</Label>
              <Textarea
                id="mealNotes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional details..."
                rows={3}
              />
            </div>
            <Button type="submit" className="w-full">Schedule Meal</Button>
          </form>
        </DialogContent>
      </Dialog>

      <ScrollArea className="h-[400px]">
        <div className="space-y-2">
          {meals.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No meals scheduled
            </p>
          ) : (
            meals.map((meal) => (
              <div
                key={meal.id}
                className="p-3 rounded-lg border bg-card space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <ForkKnife size={16} className="text-primary" />
                      <span className="font-semibold">{meal.name}</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(meal.id)}
                  >
                    <Trash size={16} />
                  </Button>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar size={14} />
                    {format(meal.date, 'MMM d, yyyy')}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock size={14} />
                    {meal.time}
                  </div>
                </div>
                {meal.items && meal.items.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {meal.items.map((item, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {item}
                      </Badge>
                    ))}
                  </div>
                )}
                {meal.notes && (
                  <p className="text-xs text-muted-foreground">{meal.notes}</p>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </>
  );
}

function TimeTrackingTab({
  timeEntries,
  activeTimer,
  onStart,
  onStop,
  onDelete
}: {
  timeEntries: TimeEntry[];
  activeTimer: string | null;
  onStart: (description: string, project?: string) => void;
  onStop: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [description, setDescription] = useState('');
  const [project, setProject] = useState('');

  const handleStart = () => {
    if (!description) {
      toast.error('Please enter a description');
      return;
    }
    onStart(description, project || undefined);
    setDescription('');
    setProject('');
  };

  return (
    <>
      <div className="space-y-3 p-4 rounded-lg border bg-card/50">
        <div>
          <Label htmlFor="timeDesc">What are you working on? *</Label>
          <Input
            id="timeDesc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Website redesign"
            disabled={!!activeTimer}
          />
        </div>
        <div>
          <Label htmlFor="timeProject">Project (optional)</Label>
          <Input
            id="timeProject"
            value={project}
            onChange={(e) => setProject(e.target.value)}
            placeholder="Client Name"
            disabled={!!activeTimer}
          />
        </div>
        {activeTimer ? (
          <Button
            onClick={() => onStop(activeTimer)}
            className="w-full gap-2"
            variant="destructive"
          >
            <Stop size={18} />
            Stop Timer
          </Button>
        ) : (
          <Button onClick={handleStart} className="w-full gap-2">
            <Play size={18} />
            Start Timer
          </Button>
        )}
      </div>

      <ScrollArea className="h-[300px]">
        <div className="space-y-2">
          {timeEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No time entries yet
            </p>
          ) : (
            [...timeEntries].reverse().map((entry) => (
              <div
                key={entry.id}
                className="p-3 rounded-lg border bg-card"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Clock size={16} className="text-primary" />
                      <span className="font-semibold">{entry.description}</span>
                    </div>
                    {entry.project && (
                      <p className="text-sm text-muted-foreground mt-1">{entry.project}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                      <span>{format(entry.startTime, 'MMM d, h:mm a')}</span>
                      {entry.duration ? (
                        <Badge variant="secondary">{entry.duration} min</Badge>
                      ) : (
                        <Badge variant="default" className="animate-pulse">Running</Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(entry.id)}
                  >
                    <Trash size={16} />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </>
  );
}

function JobsTab({
  jobs,
  onAdd,
  onUpdateStatus,
  onDelete,
  showDialog,
  setShowDialog,
  getPriorityColor,
}: {
  jobs: Job[];
  onAdd: (data: Omit<Job, 'id' | 'createdAt'>) => void;
  onUpdateStatus: (id: string, status: Job['status']) => void;
  onDelete: (id: string) => void;
  showDialog: boolean;
  setShowDialog: (show: boolean) => void;
  getPriorityColor: (priority: string) => string;
}) {
  const [formData, setFormData] = useState({
    title: '',
    client: '',
    description: '',
    status: 'pending' as Job['status'],
    priority: 'medium' as Job['priority'],
    deadline: '',
    estimatedHours: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.client) {
      toast.error('Please fill required fields');
      return;
    }
    onAdd({
      ...formData,
      deadline: formData.deadline ? new Date(formData.deadline).getTime() : undefined,
      estimatedHours: formData.estimatedHours ? parseFloat(formData.estimatedHours) : undefined
    });
    setFormData({
      title: '',
      client: '',
      description: '',
      status: 'pending',
      priority: 'medium',
      deadline: '',
      estimatedHours: ''
    });
  };

  return (
    <>
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogTrigger asChild>
          <Button className="w-full gap-2">
            <Plus size={18} />
            Add Job
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Job</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="jobTitle">Job Title *</Label>
              <Input
                id="jobTitle"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Website Development"
              />
            </div>
            <div>
              <Label htmlFor="jobClient">Client *</Label>
              <Input
                id="jobClient"
                value={formData.client}
                onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                placeholder="Acme Corp"
              />
            </div>
            <div>
              <Label htmlFor="jobDescription">Description</Label>
              <Textarea
                id="jobDescription"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Project details..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="jobPriority">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value as Job['priority'] })}
                >
                  <SelectTrigger id="jobPriority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="jobStatus">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value as Job['status'] })}
                >
                  <SelectTrigger id="jobStatus">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="on-hold">On Hold</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="jobDeadline">Deadline</Label>
                <Input
                  id="jobDeadline"
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="estimatedHours">Est. Hours</Label>
                <Input
                  id="estimatedHours"
                  type="number"
                  step="0.5"
                  value={formData.estimatedHours}
                  onChange={(e) => setFormData({ ...formData, estimatedHours: e.target.value })}
                  placeholder="40"
                />
              </div>
            </div>
            <Button type="submit" className="w-full">Add Job</Button>
          </form>
        </DialogContent>
      </Dialog>

      <ScrollArea className="h-[400px]">
        <div className="space-y-2">
          {jobs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No jobs added
            </p>
          ) : (
            jobs.map((job) => (
              <div
                key={job.id}
                className="p-3 rounded-lg border bg-card space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Target size={16} className="text-primary" />
                      <span className="font-semibold">{job.title}</span>
                      <Badge className={getPriorityColor(job.priority)} variant="secondary">
                        {job.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{job.client}</p>
                    {job.description && (
                      <p className="text-xs text-muted-foreground mt-1">{job.description}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(job.id)}
                  >
                    <Trash size={16} />
                  </Button>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                  {job.deadline && (
                    <div className="flex items-center gap-1">
                      <Calendar size={12} />
                      Due: {format(job.deadline, 'MMM d, yyyy')}
                    </div>
                  )}
                  {job.estimatedHours && (
                    <div className="flex items-center gap-1">
                      <Clock size={12} />
                      {job.estimatedHours}h
                    </div>
                  )}
                </div>
                <Select
                  value={job.status}
                  onValueChange={(value) => onUpdateStatus(job.id, value as Job['status'])}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="on-hold">On Hold</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </>
  );
}

function ShoppingListTab({
  shoppingList,
  onAdd,
  onToggle,
  onDelete
}: {
  shoppingList: ShoppingItem[];
  onAdd: (item: string, quantity?: string, category?: string) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [item, setItem] = useState('');
  const [quantity, setQuantity] = useState('');
  const [category, setCategory] = useState('');

  const handleAdd = () => {
    if (!item) {
      toast.error('Please enter an item');
      return;
    }
    onAdd(item, quantity || undefined, category || undefined);
    setItem('');
    setQuantity('');
    setCategory('');
    toast.success('Item added to shopping list');
  };

  return (
    <>
      <div className="space-y-3 p-4 rounded-lg border bg-card/50">
        <div>
          <Label htmlFor="shoppingItem">Item *</Label>
          <Input
            id="shoppingItem"
            value={item}
            onChange={(e) => setItem(e.target.value)}
            placeholder="Office supplies"
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="5 boxes"
            />
          </div>
          <div>
            <Label htmlFor="category">Category</Label>
            <Input
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Office"
            />
          </div>
        </div>
        <Button onClick={handleAdd} className="w-full gap-2">
          <Plus size={18} />
          Add to List
        </Button>
      </div>

      <ScrollArea className="h-[300px]">
        <div className="space-y-2">
          {shoppingList.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Shopping list is empty
            </p>
          ) : (
            shoppingList.map((shopItem) => (
              <div
                key={shopItem.id}
                className={`p-3 rounded-lg border bg-card flex items-center gap-3 ${
                  shopItem.purchased ? 'opacity-50' : ''
                }`}
              >
                <Checkbox
                  checked={shopItem.purchased}
                  onCheckedChange={() => onToggle(shopItem.id)}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <ShoppingCart size={14} className="text-primary" />
                    <span className={shopItem.purchased ? 'line-through' : ''}>
                      {shopItem.item}
                    </span>
                  </div>
                  <div className="flex gap-2 mt-1">
                    {shopItem.quantity && (
                      <Badge variant="outline" className="text-xs">
                        {shopItem.quantity}
                      </Badge>
                    )}
                    {shopItem.category && (
                      <Badge variant="secondary" className="text-xs">
                        {shopItem.category}
                      </Badge>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(shopItem.id)}
                >
                  <Trash size={16} />
                </Button>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </>
  );
}

function ErrandsTab({
  errands,
  onAdd,
  onToggle,
  onDelete,
  showDialog,
  setShowDialog,
  getPriorityColor
}: {
  errands: WorkErrand[];
  onAdd: (data: Omit<WorkErrand, 'id' | 'createdAt'>) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  showDialog: boolean;
  setShowDialog: (show: boolean) => void;
  getPriorityColor: (priority: string) => string;
}) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    dueDate: '',
    priority: 'medium' as WorkErrand['priority'],
    completed: false
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) {
      toast.error('Please enter a title');
      return;
    }
    onAdd({
      ...formData,
      dueDate: formData.dueDate ? new Date(formData.dueDate).getTime() : undefined
    });
    setFormData({
      title: '',
      description: '',
      location: '',
      dueDate: '',
      priority: 'medium',
      completed: false
    });
  };

  return (
    <>
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogTrigger asChild>
          <Button className="w-full gap-2">
            <Plus size={18} />
            Add Work Errand
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Work Errand</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="errandTitle">Title *</Label>
              <Input
                id="errandTitle"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Pick up supplies"
              />
            </div>
            <div>
              <Label htmlFor="errandDescription">Description</Label>
              <Textarea
                id="errandDescription"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Details about the errand..."
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Downtown office"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="errandDueDate">Due Date</Label>
                <Input
                  id="errandDueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="errandPriority">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value as WorkErrand['priority'] })}
                >
                  <SelectTrigger id="errandPriority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button type="submit" className="w-full">Add Errand</Button>
          </form>
        </DialogContent>
      </Dialog>

      <ScrollArea className="h-[400px]">
        <div className="space-y-2">
          {errands.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No work errands added
            </p>
          ) : (
            errands.map((errand) => (
              <div
                key={errand.id}
                className={`p-3 rounded-lg border bg-card ${
                  errand.completed ? 'opacity-50' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={errand.completed}
                    onCheckedChange={() => onToggle(errand.id)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <ClipboardText size={16} className="text-primary" />
                      <span className={`font-semibold ${errand.completed ? 'line-through' : ''}`}>
                        {errand.title}
                      </span>
                      <Badge className={getPriorityColor(errand.priority)} variant="secondary">
                        {errand.priority}
                      </Badge>
                    </div>
                    {errand.description && (
                      <p className="text-sm text-muted-foreground mt-1">{errand.description}</p>
                    )}
                    <div className="flex gap-2 mt-2 text-xs text-muted-foreground flex-wrap">
                      {errand.location && (
                        <span>📍 {errand.location}</span>
                      )}
                      {errand.dueDate && (
                        <span>📅 {format(errand.dueDate, 'MMM d, yyyy')}</span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(errand.id)}
                  >
                    <Trash size={16} />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </>
  );
}

function RoutinesTab({
  routines,
  activeRoutineId,
  onSave,
  onLoad,
  onDuplicate,
  onDelete,
  onClearWorkspace,
  showDialog,
  setShowDialog
}: {
  routines: WorkRoutine[];
  activeRoutineId?: string;
  onSave: (name: string, description?: string) => void;
  onLoad: (routineId: string) => void;
  onDuplicate: (routineId: string) => void;
  onDelete: (routineId: string) => void;
  onClearWorkspace: () => void;
  showDialog: boolean;
  setShowDialog: (show: boolean) => void;
}) {
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error('Please enter a routine name');
      return;
    }
    onSave(formData.name, formData.description || undefined);
    setFormData({ name: '', description: '' });
  };

  const activeRoutine = routines.find(r => r.id === activeRoutineId);

  return (
    <>
      <div className="space-y-3">
        <div className="flex gap-2">
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button className="flex-1 gap-2">
                <FloppyDisk size={18} />
                Save Current as Routine
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Save Work Routine</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="routineName">Routine Name *</Label>
                  <Input
                    id="routineName"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Monday Morning, Client Work, etc."
                  />
                </div>
                <div>
                  <Label htmlFor="routineDescription">Description</Label>
                  <Textarea
                    id="routineDescription"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="What is this routine for?"
                    rows={3}
                  />
                </div>
                <Button type="submit" className="w-full">Save Routine</Button>
              </form>
            </DialogContent>
          </Dialog>
          
          <Button 
            variant="outline" 
            onClick={onClearWorkspace}
            className="gap-2"
          >
            <X size={18} />
            Clear
          </Button>
        </div>

        {activeRoutine && (
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
            <div className="flex items-center gap-2">
              <CalendarBlank size={18} className="text-primary" weight="duotone" />
              <div className="flex-1">
                <p className="font-semibold text-sm">Active Routine</p>
                <p className="text-xs text-muted-foreground">{activeRoutine.name}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <ScrollArea className="h-[400px]">
        <div className="space-y-2">
          {routines.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-muted-foreground mb-4">
                No routines saved yet
              </p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Save your current work dashboard state as a routine to quickly switch between different jobs or work schedules
              </p>
            </div>
          ) : (
            routines.map((routine) => (
              <div
                key={routine.id}
                className={`p-3 rounded-lg border bg-card ${
                  routine.id === activeRoutineId ? 'ring-2 ring-primary' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CalendarBlank size={16} className="text-primary" weight="duotone" />
                      <span className="font-semibold">{routine.name}</span>
                      {routine.id === activeRoutineId && (
                        <Badge variant="default" className="text-xs">Active</Badge>
                      )}
                    </div>
                    {routine.description && (
                      <p className="text-sm text-muted-foreground mt-1">{routine.description}</p>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-1 text-xs text-muted-foreground mb-3">
                  {routine.clientSlots.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {routine.clientSlots.length} client{routine.clientSlots.length !== 1 ? 's' : ''}
                    </Badge>
                  )}
                  {routine.jobs.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {routine.jobs.length} job{routine.jobs.length !== 1 ? 's' : ''}
                    </Badge>
                  )}
                  {routine.meals.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {routine.meals.length} meal{routine.meals.length !== 1 ? 's' : ''}
                    </Badge>
                  )}
                  {routine.errands.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {routine.errands.length} errand{routine.errands.length !== 1 ? 's' : ''}
                    </Badge>
                  )}
                  {routine.shoppingList.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {routine.shoppingList.length} item{routine.shoppingList.length !== 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={routine.id === activeRoutineId ? 'secondary' : 'default'}
                    onClick={() => onLoad(routine.id)}
                    className="flex-1 text-xs gap-1"
                    disabled={routine.id === activeRoutineId}
                  >
                    <Check size={14} />
                    Load
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onDuplicate(routine.id)}
                    className="text-xs gap-1"
                  >
                    <Copy size={14} />
                    Duplicate
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onDelete(routine.id)}
                    className="text-xs"
                  >
                    <Trash size={14} />
                  </Button>
                </div>
                
                <p className="text-xs text-muted-foreground mt-2">
                  Created {format(routine.createdAt, 'MMM d, yyyy')}
                </p>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </>
  );
}

function OrganizationPreferenceDialog({
  open,
  onOpenChange,
  currentPreference,
  onUpdate
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPreference?: WorkOrganizationPreference;
  onUpdate: (preference: WorkOrganizationPreference) => void;
}) {
  const [selectedType, setSelectedType] = useState<WorkOrganizationType>(
    currentPreference?.type || 'date'
  );
  const [startTime, setStartTime] = useState(
    currentPreference?.startTime || '06:00'
  );

  const organizationOptions = [
    {
      value: 'date' as WorkOrganizationType,
      title: 'By Date',
      description: 'Organize work items by specific calendar dates',
      icon: <Calendar size={32} weight="duotone" className="text-primary" />,
      example: 'Show all tasks, clients, and jobs for each day',
      bestFor: 'Day-to-day planning and appointments'
    },
    {
      value: 'week' as WorkOrganizationType,
      title: 'By Week',
      description: 'Group work by week for broader planning',
      icon: <CalendarBlank size={32} weight="duotone" className="text-primary" />,
      example: 'View your entire week at a glance',
      bestFor: 'Weekly planning and recurring schedules'
    },
    {
      value: 'month' as WorkOrganizationType,
      title: 'By Month',
      description: 'Monthly overview of all work commitments',
      icon: <CalendarBlank size={32} weight="duotone" className="text-primary" />,
      example: 'See monthly patterns and long-term planning',
      bestFor: 'Long-term project management'
    },
    {
      value: 'time-of-day' as WorkOrganizationType,
      title: 'By Time of Day',
      description: 'Schedule-based organization starting from a specific time',
      icon: <Clock size={32} weight="duotone" className="text-primary" />,
      example: 'Daily schedule from 6 AM onwards',
      bestFor: 'Hourly scheduling and time blocking'
    },
    {
      value: 'job-based' as WorkOrganizationType,
      title: 'By Job/Project',
      description: 'Organize by different jobs or clients',
      icon: <Briefcase size={32} weight="duotone" className="text-primary" />,
      example: 'Group tasks: Job 1 (9am-12pm), Job 2 (1pm-5pm)',
      bestFor: 'Multiple projects or client-based work'
    }
  ];

  const handleUpdate = () => {
    onUpdate({
      type: selectedType,
      ...(selectedType === 'time-of-day' && { startTime })
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Gear size={28} weight="duotone" className="text-primary" />
            Change Work Organization
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Switch between different organization styles. Your work data will remain unchanged.
          </p>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <RadioGroup value={selectedType} onValueChange={(value) => setSelectedType(value as WorkOrganizationType)}>
            <div className="grid gap-4">
              {organizationOptions.map((option) => (
                <motion.div
                  key={option.value}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Label
                    htmlFor={`org-${option.value}`}
                    className="cursor-pointer"
                  >
                    <Card
                      className={`p-5 transition-all duration-200 hover:shadow-md ${
                        selectedType === option.value
                          ? 'ring-2 ring-primary bg-primary/5'
                          : 'hover:bg-accent/50'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <RadioGroupItem
                          value={option.value}
                          id={`org-${option.value}`}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            {option.icon}
                            <div>
                              <h3 className="font-semibold text-lg">{option.title}</h3>
                              <p className="text-sm text-muted-foreground">
                                {option.description}
                              </p>
                            </div>
                          </div>
                          
                          <div className="mt-3 space-y-2 ml-11">
                            <div className="flex items-start gap-2">
                              <span className="text-xs font-medium text-muted-foreground">Example:</span>
                              <p className="text-xs text-muted-foreground italic flex-1">
                                {option.example}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs">
                                {option.bestFor}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        
                        <AnimatePresence>
                          {selectedType === option.value && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              exit={{ scale: 0 }}
                              className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground"
                            >
                              <Check size={18} weight="bold" />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </Card>
                  </Label>
                </motion.div>
              ))}
            </div>
          </RadioGroup>

          <AnimatePresence>
            {selectedType === 'time-of-day' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <Card className="p-4 bg-accent/20">
                  <Label htmlFor="org-start-time" className="text-sm font-medium mb-2 block">
                    What time does your workday typically start?
                  </Label>
                  <div className="flex items-center gap-3">
                    <Clock size={20} className="text-primary" />
                    <input
                      id="org-start-time"
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <span className="text-sm text-muted-foreground">
                      Your schedule will start from this time
                    </span>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              className="flex-1 gap-2"
            >
              Update Organization
              <ArrowRight size={18} weight="bold" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
