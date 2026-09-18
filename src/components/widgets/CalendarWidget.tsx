import { useState, useEffect, useMemo, useRef } from 'react';
import { useLocalStorageState } from '@/hooks/useLocalStorageState';
import { WidgetContainer } from '@/components/WidgetContainer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { AISuggestionsPanel } from '@/components/AISuggestionsPanel';
import { Calendar, Plus, Clock, Bell, Trash, Pencil, CaretLeft, CaretRight, CalendarBlank, Rows, CalendarDot, ClockCountdown, Sparkle, UploadSimple } from '@phosphor-icons/react';
import { AIInsightAction, CalendarEntryType, CalendarEvent, FamilyCalendarPlannerEvent, WidgetAIState, WidgetSize } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, startOfWeek, endOfWeek, isToday, addWeeks, subWeeks, addDays, subDays, startOfDay, endOfDay } from 'date-fns';
import { buildAIInputHash, generateWidgetAIState, updateAIInsightStatus } from '@/lib/ai-organizer';
import { parseICalText } from '@/lib/ical-parser';
import { appendImportedCalendarEvent } from '@/lib/calendar-imports';

interface CalendarWidgetProps {
  events: CalendarEvent[];
  onUpdate: (events: CalendarEvent[]) => void;
  aiState?: WidgetAIState;
  onAIStateChange: (state: WidgetAIState) => void;
  onRemove: () => void;
  widgetId: string;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  size?: WidgetSize;
  onSizeChange?: (size: WidgetSize) => void;
}

const eventColors = [
  { value: 'blue', label: 'Blue', class: 'bg-blue-500/20 border-blue-500 text-blue-700' },
  { value: 'green', label: 'Green', class: 'bg-green-500/20 border-green-500 text-green-700' },
  { value: 'purple', label: 'Purple', class: 'bg-purple-500/20 border-purple-500 text-purple-700' },
  { value: 'orange', label: 'Orange', class: 'bg-orange-500/20 border-orange-500 text-orange-700' },
  { value: 'pink', label: 'Pink', class: 'bg-pink-500/20 border-pink-500 text-pink-700' },
  { value: 'red', label: 'Red', class: 'bg-red-500/20 border-red-500 text-red-700' },
];

const eventTypes: { value: CalendarEntryType; label: string }[] = [
  { value: 'appointment', label: 'Appointment' },
  { value: 'event', label: 'Event' },
  { value: 'occasion', label: 'Occasion' },
];

export function CalendarWidget({
  events,
  onUpdate,
  aiState,
  onAIStateChange,
  onRemove,
  widgetId,
  onDragStart,
  onDragEnd,
  size,
  onSizeChange,
}: CalendarWidgetProps) {
  const [, setPlannerEvents] = useLocalStorageState<FamilyCalendarPlannerEvent[]>('family-calendar-planner-events', []);
  const [showDialog, setShowDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [currentDay, setCurrentDay] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day' | 'schedule'>('month');
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [reminder, setReminder] = useState('none');
  const [color, setColor] = useState('blue');
  const [eventType, setEventType] = useState<CalendarEntryType>('event');
  const [allDay, setAllDay] = useState(false);
  const [location, setLocation] = useState('');
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(true);
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkReminders = () => {
      const now = Date.now();
      events.forEach((event) => {
        if (event.reminder && !event.reminderSent) {
          const reminderTime = event.date - event.reminder * 60 * 1000;
          if (now >= reminderTime && now < event.date) {
            toast.info(`Reminder: ${event.title}`, {
              description: event.startTime ? `Starting at ${event.startTime}` : 'Event coming up',
              duration: 10000,
            });
            onUpdate(
              events.map((e) =>
                e.id === event.id ? { ...e, reminderSent: true } : e
              )
            );
          }
        }
      });
    };

    const interval = setInterval(checkReminders, 60000);
    checkReminders();

    return () => clearInterval(interval);
  }, [events, onUpdate]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setEventDate('');
    setStartTime('');
    setEndTime('');
    setReminder('none');
    setColor('blue');
    setEventType('event');
    setAllDay(false);
    setLocation('');
    setEditingEvent(null);
  };

  const openAddDialog = (date?: Date) => {
    resetForm();
    if (date) {
      setEventDate(format(date, 'yyyy-MM-dd'));
    }
    setShowDialog(true);
  };

  const openEditDialog = (event: CalendarEvent) => {
    setEditingEvent(event);
    setTitle(event.title);
    setDescription(event.description || '');
    setEventDate(format(new Date(event.date), 'yyyy-MM-dd'));
    setStartTime(event.startTime || '');
    setEndTime(event.endTime || '');
    setReminder(event.reminder?.toString() || 'none');
    setColor(event.color || 'blue');
    setEventType(event.type || 'event');
    setAllDay(Boolean(event.allDay));
    setLocation(event.location || '');
    setShowDialog(true);
  };

  const buildDateTimeIso = (dateMs: number, time?: string, fallbackTime = '09:00') => {
    const date = new Date(dateMs);
    const [hours, minutes] = (time || fallbackTime).split(':').map(Number);
    date.setHours(hours || 0, minutes || 0, 0, 0);
    return date.toISOString();
  };

  const mapToFamilyCalendarPlannerEvent = (event: CalendarEvent): FamilyCalendarPlannerEvent => {
    const start = buildDateTimeIso(event.date, event.startTime, '09:00');
    const end = buildDateTimeIso(event.date, event.endTime || event.startTime, '10:00');

    return {
      id: event.id,
      calendarId: 'family-calendar-default',
      title: event.title,
      description: event.description || undefined,
      startTime: start,
      endTime: end,
      allDay: Boolean(event.allDay),
      visibility: 'private',
      requiresApproval: false,
      createdBy: 'personal-organizer-user',
      attendees: ['personal-organizer-user'],
      location: event.location || undefined,
      reminders: event.reminder ? [event.reminder] : [],
      color: event.color,
      createdAt: new Date(event.createdAt).toISOString(),
      updatedAt: new Date().toISOString(),
    };
  };

  const syncFamilyCalendarPlanner = async (calendarEvents: CalendarEvent[]) => {
    const mappedEvents = calendarEvents.map(mapToFamilyCalendarPlannerEvent);
    setPlannerEvents(mappedEvents);

    const apiBaseUrl = import.meta.env.VITE_FAMILY_CALENDAR_API_URL;
    if (!apiBaseUrl) return;

    try {
      const response = await fetch(`${apiBaseUrl.replace(/\/$/, '')}/events/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ events: mappedEvents }),
      });

      if (!response.ok) {
        throw new Error(`Sync failed with status ${response.status}`);
      }
    } catch {
      toast.error('Unable to sync with Family Calendar Planner API');
    }
  };

  const saveEvent = () => {
    if (!title.trim() || !eventDate) {
      toast.error('Please fill in required fields');
      return;
    }

    const eventDateTime = new Date(eventDate).setHours(0, 0, 0, 0);
    const newEvent: CalendarEvent = {
      id: editingEvent?.id || Date.now().toString(),
      title: title.trim(),
      type: eventType,
      description: description.trim(),
      date: eventDateTime,
      startTime: allDay ? undefined : startTime || undefined,
      endTime: allDay ? undefined : endTime || undefined,
      allDay: allDay,
      location: location.trim() || undefined,
      reminder: reminder !== 'none' ? parseInt(reminder) : undefined,
      reminderSent: false,
      color: color,
      createdAt: editingEvent?.createdAt || Date.now(),
    };

    const updatedEvents = editingEvent
      ? events.map((e) => (e.id === editingEvent.id ? newEvent : e))
      : [...events, newEvent];

    onUpdate(updatedEvents);
    void syncFamilyCalendarPlanner(updatedEvents);

    if (editingEvent) {
      toast.success('Event updated');
    } else {
      toast.success('Event added');
    }

    setShowDialog(false);
    resetForm();
  };

  const deleteEvent = (id: string) => {
    const updatedEvents = events.filter((e) => e.id !== id);
    onUpdate(updatedEvents);
    void syncFamilyCalendarPlanner(updatedEvents);
    toast.success('Event deleted');
    setShowDialog(false);
    resetForm();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!importInputRef.current) return;
    importInputRef.current.value = '';
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const text = loadEvent.target?.result;
      if (typeof text !== 'string') return;

      const drafts = parseICalText(text);
      if (drafts.length === 0) {
        toast.info('No events found in the selected file');
        return;
      }

      let added = 0;
      let updatedEvents = [...events];
      for (const draft of drafts) {
        const result = appendImportedCalendarEvent(updatedEvents, draft);
        if (result.added) {
          updatedEvents = result.events;
          added++;
        }
      }

      onUpdate(updatedEvents);
      void syncFamilyCalendarPlanner(updatedEvents);

      if (added === 0) {
        toast.info('All events in the file are already imported');
      } else {
        toast.success(`Imported ${added} event${added !== 1 ? 's' : ''} from ${file.name}`);
      }
    };
    // iCal files are UTF-8 in modern clients; legacy Latin-1 files from older
    // Outlook exports are not supported and will render non-ASCII chars incorrectly.
    reader.readAsText(file);
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const weekStart = startOfWeek(currentWeek);
  const weekEnd = endOfWeek(currentWeek);
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const getEventsForDate = (date: Date) => {
    return events.filter((event) => isSameDay(new Date(event.date), date));
  };

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  const getColorClass = (colorValue: string) => {
    return eventColors.find((c) => c.value === colorValue)?.class || eventColors[0].class;
  };

  const getEventTypeLabel = (type: CalendarEntryType) => {
    return eventTypes.find((eventTypeOption) => eventTypeOption.value === type)?.label || 'Event';
  };

  const aiInput = { events };
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
        feature: 'calendar',
        input: aiInput,
        dataSummary: [
          'Feature: calendar conflict review',
          `${events.length} events considered`,
          `${events.filter((event) => !event.allDay).length} timed events available for future conflict checks`,
          'Calendar suggestions remain advisory until Phase 2',
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

  const getEventTimeLabel = (event: CalendarEvent) => {
    if (event.allDay) return 'All day';
    if (!event.startTime) return '';
    return `${event.startTime}${event.endTime ? ` - ${event.endTime}` : ''}`;
  };

  const monthEvents = useMemo(() => {
    const monthStartDate = startOfMonth(currentMonth);
    const monthEndDate = endOfMonth(currentMonth);

    return events
      .filter((event) => {
        const eventDate = new Date(event.date);
        return eventDate >= monthStartDate && eventDate <= monthEndDate;
      })
      .sort((a, b) => a.date - b.date);
  }, [currentMonth, events]);

  const weekEvents = useMemo(() => {
    const weekStartDate = startOfWeek(currentWeek);
    const weekEndDate = endOfWeek(currentWeek);

    return events
      .filter((event) => {
        const eventDate = new Date(event.date);
        return eventDate >= weekStartDate && eventDate <= weekEndDate;
      })
      .sort((a, b) => a.date - b.date);
  }, [currentWeek, events]);

  const dayEvents = useMemo(() => {
    const dayStartDate = startOfDay(currentDay);
    const dayEndDate = endOfDay(currentDay);

    return events
      .filter((event) => {
        const eventDate = new Date(event.date);
        return eventDate >= dayStartDate && eventDate <= dayEndDate;
      })
      .sort((a, b) => {
        if (!a.startTime && !b.startTime) return a.date - b.date;
        if (!a.startTime) return 1;
        if (!b.startTime) return -1;
        return a.startTime.localeCompare(b.startTime);
      });
  }, [currentDay, events]);
  const visibleRangeEvents = viewMode === 'month' ? monthEvents : viewMode === 'week' ? weekEvents : dayEvents;

  const handleNavigatePrev = () => {
    if (viewMode === 'month') {
      setCurrentMonth(subMonths(currentMonth, 1));
    } else if (viewMode === 'week') {
      setCurrentWeek(subWeeks(currentWeek, 1));
    } else {
      setCurrentDay(subDays(currentDay, 1));
    }
  };

  const handleNavigateNext = () => {
    if (viewMode === 'month') {
      setCurrentMonth(addMonths(currentMonth, 1));
    } else if (viewMode === 'week') {
      setCurrentWeek(addWeeks(currentWeek, 1));
    } else {
      setCurrentDay(addDays(currentDay, 1));
    }
  };

  const currentDisplayTitle = viewMode === 'month'
    ? format(currentMonth, 'MMMM yyyy')
    : viewMode === 'week'
    ? `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`
    : format(currentDay, 'EEEE, MMMM d, yyyy');

  const getEventPosition = (event: CalendarEvent) => {
    if (!event.startTime) return null;
    
    const [hours, minutes] = event.startTime.split(':').map(Number);
    const startMinutes = hours * 60 + minutes;
    const top = (startMinutes / 60) * 60;
    
    let height = 60;
    if (event.endTime) {
      const [endHours, endMinutes] = event.endTime.split(':').map(Number);
      const endMinutesTotal = endHours * 60 + endMinutes;
      const duration = endMinutesTotal - startMinutes;
      height = (duration / 60) * 60;
    }
    
    return { top, height };
  };

  return (
    <WidgetContainer
      title="Calendar"
      icon={<Calendar size={24} />}
      onRemove={onRemove}
      value={{ id: widgetId, type: 'calendar', events }}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      size={size}
      onSizeChange={onSizeChange}
      widgetType="calendar"
    >
      {showAIPanel ? (
        <AISuggestionsPanel
          title="AI Calendar Review"
          featureLabel="calendar"
          state={aiState}
          isGenerating={isGeneratingInsights}
          isStale={isAIStale}
          onGenerate={handleGenerateInsights}
          onApplyAction={handleApplyAction}
          onDismissInsight={(insightId) => updateInsightStatus(insightId, 'dismissed')}
          onClose={() => setShowAIPanel(false)}
        />
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="gap-2 text-xs text-muted-foreground w-full"
          onClick={() => setShowAIPanel(true)}
        >
          <Sparkle size={13} />
          Show AI Suggestions
        </Button>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNavigatePrev}
              className="h-8 w-8 flex-shrink-0"
            >
              <CaretLeft size={16} />
            </Button>
            <h3 className="font-semibold text-foreground min-w-[140px] text-center text-xs sm:text-sm">
              {currentDisplayTitle}
            </h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNavigateNext}
              className="h-8 w-8 flex-shrink-0"
            >
              <CaretRight size={16} />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <ToggleGroup
              type="single"
              value={viewMode}
              onValueChange={(value) => value && setViewMode(value as 'month' | 'week' | 'day' | 'schedule')}
              className="border rounded-lg p-0.5"
            >
              <ToggleGroupItem value="month" aria-label="Month view" className="h-7 px-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                <CalendarBlank size={14} className="sm:mr-1" />
                <span className="hidden sm:inline text-xs">Month</span>
              </ToggleGroupItem>
              <ToggleGroupItem value="week" aria-label="Week view" className="h-7 px-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                <Rows size={14} className="sm:mr-1" />
                <span className="hidden sm:inline text-xs">Week</span>
              </ToggleGroupItem>
              <ToggleGroupItem value="day" aria-label="Day view" className="h-7 px-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                <CalendarDot size={14} className="sm:mr-1" />
                <span className="hidden sm:inline text-xs">Day</span>
              </ToggleGroupItem>
              <ToggleGroupItem value="schedule" aria-label="Schedule view" className="h-7 px-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                <ClockCountdown size={14} className="sm:mr-1" />
                <span className="hidden sm:inline text-xs">Schedule</span>
              </ToggleGroupItem>
            </ToggleGroup>
            <Button onClick={() => openAddDialog()} size="sm" className="gap-1.5 h-7 text-xs flex-shrink-0">
              <Plus size={14} />
              <span className="hidden sm:inline">Add</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-7 text-xs flex-shrink-0"
              onClick={() => importInputRef.current?.click()}
              title="Import events from an iCal (.ics) file"
            >
              <UploadSimple size={14} />
              <span className="hidden sm:inline">Import</span>
            </Button>
            <input
              ref={importInputRef}
              type="file"
              accept=".ics,text/calendar"
              className="hidden"
              onChange={handleImportFile}
            />
          </div>
        </div>

        {viewMode === 'month' ? (
          <div className="grid grid-cols-7 gap-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-xs font-medium text-muted-foreground text-center py-1">
                {day}
              </div>
            ))}
            {calendarDays.map((day, idx) => {
            const dayEvents = getEventsForDate(day);
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const isTodayDate = isToday(day);
            const hasEvents = dayEvents.length > 0;

            const calendarCell = (
              <button
                onClick={() => setSelectedDate(day)}
                onDoubleClick={() => openAddDialog(day)}
                className={`
                  aspect-square p-1 rounded-lg text-xs transition-all relative group
                  ${isCurrentMonth ? 'text-foreground' : 'text-muted-foreground opacity-50'}
                  ${isSelected ? 'bg-primary/20 ring-2 ring-primary' : 'hover:bg-accent/50'}
                  ${isTodayDate ? 'font-bold ring-1 ring-primary/50' : ''}
                `}
              >
                <div className="flex flex-col h-full">
                  <span className="text-center">{format(day, 'd')}</span>
                  {hasEvents && (
                    <div className="flex-1 flex items-center justify-center">
                      <Badge 
                        variant="secondary" 
                        className="h-4 min-w-4 px-1 text-[10px] font-semibold bg-primary/80 text-primary-foreground group-hover:scale-110 transition-transform"
                      >
                        {dayEvents.length}
                      </Badge>
                    </div>
                  )}
                </div>
              </button>
            );

            if (hasEvents && isCurrentMonth) {
              return (
                <HoverCard key={idx} openDelay={200} closeDelay={100}>
                  <HoverCardTrigger asChild>
                    {calendarCell}
                  </HoverCardTrigger>
                  <HoverCardContent 
                    side="right" 
                    align="start" 
                    className="w-72 p-3"
                    sideOffset={5}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between border-b border-border pb-2">
                        <h4 className="font-semibold text-sm">
                          {format(day, 'MMM d, yyyy')}
                        </h4>
                        <Badge variant="outline" className="text-xs">
                          {dayEvents.length} {dayEvents.length === 1 ? 'event' : 'events'}
                        </Badge>
                      </div>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {dayEvents.map((event) => (
                          <div
                            key={event.id}
                            className={`p-2 rounded-md border text-xs ${getColorClass(event.color || 'blue')}`}
                          >
                            <div className="font-medium truncate">{event.title}</div>
                            {event.description && (
                              <div className="text-xs opacity-80 mt-0.5 line-clamp-2">
                                {event.description}
                              </div>
                            )}
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              {(event.startTime || event.allDay) && (
                                <div className="flex items-center gap-1 opacity-90">
                                  <Clock size={10} />
                                  <span>{getEventTimeLabel(event)}</span>
                                </div>
                              )}
                              {event.location && (
                                <Badge variant="secondary" className="text-[10px] h-4 px-1">
                                  {event.location}
                                </Badge>
                              )}
                              {event.reminder && (
                                <div className="flex items-center gap-1 opacity-90">
                                  <Bell size={10} />
                                  <span>{event.reminder}m before</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </HoverCardContent>
                </HoverCard>
              );
            }

            return <div key={idx}>{calendarCell}</div>;
          })}
        </div>
        ) : viewMode === 'week' ? (
          <div className="space-y-2">
            <div className="grid grid-cols-7 gap-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="text-xs font-medium text-muted-foreground text-center py-1">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map((day, idx) => {
                const dayEvents = getEventsForDate(day);
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const isTodayDate = isToday(day);
                const hasEvents = dayEvents.length > 0;

                return (
                  <div key={idx} className="flex flex-col gap-1">
                    <button
                      onClick={() => setSelectedDate(day)}
                      onDoubleClick={() => openAddDialog(day)}
                      className={`
                        p-2 rounded-lg text-sm transition-all relative group
                        ${isSelected ? 'bg-primary/20 ring-2 ring-primary' : 'hover:bg-accent/50 bg-card border border-border'}
                        ${isTodayDate ? 'font-bold ring-2 ring-primary/50' : ''}
                      `}
                    >
                      <div className="text-center font-semibold mb-1">
                        {format(day, 'd')}
                      </div>
                      {hasEvents && (
                        <Badge 
                          variant="secondary" 
                          className="h-4 w-full text-[10px] font-semibold bg-primary/80 text-primary-foreground"
                        >
                          {dayEvents.length} {dayEvents.length === 1 ? 'event' : 'events'}
                        </Badge>
                      )}
                    </button>
                    <div className="space-y-1 min-h-[100px] max-h-[200px] overflow-y-auto">
                      {dayEvents.slice(0, 3).map((event) => (
                        <div
                          key={event.id}
                          onClick={() => openEditDialog(event)}
                          className={`p-1.5 rounded text-[10px] cursor-pointer border ${getColorClass(event.color || 'blue')} hover:shadow-sm transition-shadow`}
                        >
                          <div className="font-medium truncate">{event.title}</div>
                          {(event.startTime || event.allDay) && (
                            <div className="flex items-center gap-0.5 mt-0.5 opacity-80">
                              <Clock size={8} />
                              <span>{getEventTimeLabel(event)}</span>
                            </div>
                          )}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-[9px] text-muted-foreground text-center py-0.5">
                          +{dayEvents.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : viewMode === 'day' ? (
          <div className="space-y-3">
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-lg text-foreground">
                    {format(currentDay, 'EEEE')}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {format(currentDay, 'MMMM d, yyyy')}
                  </p>
                </div>
                {isToday(currentDay) && (
                  <Badge className="bg-primary text-primary-foreground">
                    Today
                  </Badge>
                )}
              </div>
              
              {dayEvents.length > 0 ? (
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {dayEvents.length} {dayEvents.length === 1 ? 'Event' : 'Events'} Scheduled
                  </div>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {dayEvents.map((event, idx) => (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        onClick={() => openEditDialog(event)}
                        className={`p-3 rounded-lg border-l-4 cursor-pointer group hover:shadow-md transition-all ${getColorClass(event.color || 'blue')}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-base text-foreground mb-1">
                              {event.title}
                            </h4>
                            {event.description && (
                              <p className="text-sm opacity-90 mb-2 line-clamp-2">
                                {event.description}
                              </p>
                            )}
                            <div className="flex items-center gap-3 flex-wrap">
                              {(event.startTime || event.allDay) && (
                                <div className="flex items-center gap-1.5 text-sm">
                                  <Clock size={16} className="opacity-70" />
                                  <span className="font-medium">
                                    {getEventTimeLabel(event)}
                                  </span>
                                </div>
                              )}
                              {event.location && (
                                <Badge variant="secondary" className="text-xs h-5 bg-background/50">
                                  {event.location}
                                </Badge>
                              )}
                              {event.reminder && (
                                <div className="flex items-center gap-1.5 text-sm">
                                  <Bell size={16} className="opacity-70" />
                                  <span>{event.reminder}m before</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <Pencil 
                            size={16} 
                            className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" 
                          />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                    <Calendar size={32} className="text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    No events scheduled for this day
                  </p>
                  <Button 
                    onClick={() => openAddDialog(currentDay)} 
                    size="sm" 
                    variant="outline"
                    className="gap-2 mt-2"
                  >
                    <Plus size={16} />
                    Add Event
                  </Button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-lg text-foreground">
                    {format(currentDay, 'EEEE')}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {format(currentDay, 'MMMM d, yyyy')}
                  </p>
                </div>
                {isToday(currentDay) && (
                  <Badge className="bg-primary text-primary-foreground">
                    Today
                  </Badge>
                )}
              </div>
              
              <div className="relative">
                <div className="max-h-[600px] overflow-y-auto pr-2">
                  <div className="relative border border-border rounded-lg">
                    {Array.from({ length: 24 }, (_, i) => i).map((hour) => {
                      const hourEvents = dayEvents.filter((event) => {
                        if (!event.startTime) return false;
                        const [eventHour] = event.startTime.split(':').map(Number);
                        return eventHour === hour;
                      });

                      return (
                        <div
                          key={hour}
                          className="relative border-b border-border last:border-b-0 h-[60px] flex hover:bg-accent/30 transition-colors group"
                        >
                          <div className="w-16 flex-shrink-0 p-2 border-r border-border bg-muted/30">
                            <div className="text-xs font-semibold text-muted-foreground">
                              {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                            </div>
                          </div>
                          
                          <div className="flex-1 relative p-1">
                            {hourEvents.length > 0 ? (
                              <div className="space-y-1">
                                {hourEvents.map((event) => {
                                  const position = getEventPosition(event);
                                  const zIndex = 10;
                                  
                                  return (
                                    <motion.div
                                      key={event.id}
                                      initial={{ opacity: 0, scale: 0.95 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      onClick={() => openEditDialog(event)}
                                      className={`absolute left-1 right-1 rounded-md p-2 cursor-pointer group/event hover:shadow-lg transition-all border-l-4 ${getColorClass(event.color || 'blue')}`}
                                      style={{
                                        top: position ? `${(position.top % 60)}px` : '0px',
                                        height: position ? `${Math.min(position.height, 58)}px` : 'auto',
                                        zIndex,
                                      }}
                                    >
                                      <div className="flex items-start justify-between gap-2 h-full overflow-hidden">
                                        <div className="flex-1 min-w-0 overflow-hidden">
                                          <div className="font-semibold text-xs truncate">
                                            {event.title}
                                          </div>
                                          <div className="flex items-center gap-1 mt-0.5">
                                            <Clock size={10} className="flex-shrink-0" />
                                            <span className="text-[10px] opacity-90">
                                              {event.startTime}
                                              {event.endTime && ` - ${event.endTime}`}
                                            </span>
                                          </div>
                                          {event.description && position && position.height > 40 && (
                                            <p className="text-[10px] opacity-80 mt-1 line-clamp-1">
                                              {event.description}
                                            </p>
                                          )}
                                        </div>
                                        <Pencil 
                                          size={12} 
                                          className="opacity-0 group-hover/event:opacity-100 transition-opacity flex-shrink-0" 
                                        />
                                      </div>
                                    </motion.div>
                                  );
                                })}
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  const hourStr = hour.toString().padStart(2, '0');
                                  setStartTime(`${hourStr}:00`);
                                  openAddDialog(currentDay);
                                }}
                                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                              >
                                <Plus size={16} className="text-muted-foreground" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                {dayEvents.filter(e => !e.startTime).length > 0 && (
                  <div className="mt-4 space-y-2">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      All-Day Events
                    </h4>
                    {dayEvents.filter(e => !e.startTime).map((event) => (
                      <div
                        key={event.id}
                        onClick={() => openEditDialog(event)}
                        className={`p-2 rounded-lg border cursor-pointer group hover:shadow-sm transition-all ${getColorClass(event.color || 'blue')}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mt-1">
                              <h5 className="font-medium text-sm">{event.title}</h5>
                              <Badge variant="outline" className="text-[10px] h-4 px-1 bg-background/50">
                                {getEventTypeLabel(event.type || 'event')}
                              </Badge>
                            </div>
                            {event.description && (
                              <p className="text-xs opacity-80 mt-1 line-clamp-1">{event.description}</p>
                            )}
                          </div>
                          <Pencil size={14} className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {selectedDate && (
          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-sm text-foreground">
                {format(selectedDate, 'EEEE, MMMM d, yyyy')}
              </h4>
              <Button
                onClick={() => openAddDialog(selectedDate)}
                size="sm"
                variant="outline"
                className="gap-1 h-7 text-xs"
              >
                <Plus size={14} />
                Add
              </Button>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              <AnimatePresence>
                {selectedDateEvents.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    No events on this day
                  </p>
                ) : (
                  selectedDateEvents.map((event) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -50 }}
                      className={`p-2 rounded-lg border cursor-pointer group ${getColorClass(event.color || 'blue')}`}
                      onClick={() => openEditDialog(event)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h5 className="font-medium text-sm truncate">{event.title}</h5>
                          {event.description && (
                            <p className="text-xs opacity-80 truncate">{event.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {(event.startTime || event.allDay) && (
                              <Badge variant="secondary" className="text-xs h-5 gap-1">
                                <Clock size={12} />
                                {getEventTimeLabel(event)}
                              </Badge>
                            )}
                            {event.location && (
                              <Badge variant="secondary" className="text-xs h-5">
                                {event.location}
                              </Badge>
                            )}
                            {event.reminder && (
                              <Badge variant="secondary" className="text-xs h-5 gap-1">
                                <Bell size={12} />
                                {event.reminder}m
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Pencil size={14} className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>
        )}

        <div className="border-t border-border pt-4 mt-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-sm text-foreground">
              Events & Plans - {viewMode === 'month' ? format(currentMonth, 'MMMM yyyy') : viewMode === 'week' ? `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}` : format(currentDay, 'MMMM d, yyyy')}
            </h4>
            {visibleRangeEvents.length > 0 && (
              <Badge variant="outline" className="text-xs">
                {visibleRangeEvents.length} {visibleRangeEvents.length === 1 ? 'event' : 'events'}
              </Badge>
            )}
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            <AnimatePresence>
              {visibleRangeEvents.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center py-8"
                >
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-3">
                    <Calendar size={24} className="text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    No events this {viewMode === 'schedule' ? 'day' : viewMode}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Click "Add" to get started
                  </p>
                </motion.div>
              ) : (
                visibleRangeEvents.map((event) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    className={`p-3 rounded-lg border cursor-pointer group hover:shadow-sm transition-all ${getColorClass(event.color || 'blue')}`}
                    onClick={() => openEditDialog(event)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold opacity-75">
                            {format(new Date(event.date), 'EEE, MMM d')}
                          </span>
                          {isToday(new Date(event.date)) && (
                            <Badge variant="secondary" className="text-[10px] h-4 px-1 bg-primary text-primary-foreground">
                              Today
                            </Badge>
                          )}
                        </div>
                        <h5 className="font-medium text-sm">{event.title}</h5>
                        {event.description && (
                          <p className="text-xs opacity-80 mt-1 line-clamp-2">{event.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {(event.startTime || event.allDay) && (
                            <Badge variant="secondary" className="text-xs h-5 gap-1 bg-background/50">
                              <Clock size={12} />
                              {getEventTimeLabel(event)}
                            </Badge>
                          )}
                          {event.location && (
                            <Badge variant="secondary" className="text-xs h-5 bg-background/50">
                              {event.location}
                            </Badge>
                          )}
                          {event.reminder && (
                            <Badge variant="secondary" className="text-xs h-5 gap-1 bg-background/50">
                              <Bell size={12} />
                              {event.reminder}m before
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Pencil size={14} className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" />
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingEvent ? 'Edit Event' : 'Add Event'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="event-title">Title *</Label>
              <Input
                id="event-title"
                placeholder="Event title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-description">Description</Label>
              <Textarea
                id="event-description"
                placeholder="Event description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-date">Date *</Label>
              <Input
                id="event-date"
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch id="all-day" checked={allDay} onCheckedChange={setAllDay} />
              <Label htmlFor="all-day">All day</Label>
            </div>
            {!allDay && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="start-time">Start Time</Label>
                  <Input
                    id="start-time"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-time">End Time</Label>
                  <Input
                    id="end-time"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="event-location">Location</Label>
              <Input
                id="event-location"
                placeholder="Location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="event-type">Type</Label>
                <Select value={eventType} onValueChange={(value) => setEventType(value as CalendarEntryType)}>
                  <SelectTrigger id="event-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {eventTypes.map((eventTypeOption) => (
                      <SelectItem key={eventTypeOption.value} value={eventTypeOption.value}>
                        {eventTypeOption.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reminder">Reminder</Label>
                <Select value={reminder} onValueChange={setReminder}>
                  <SelectTrigger id="reminder">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No reminder</SelectItem>
                    <SelectItem value="5">5 minutes before</SelectItem>
                    <SelectItem value="15">15 minutes before</SelectItem>
                    <SelectItem value="30">30 minutes before</SelectItem>
                    <SelectItem value="60">1 hour before</SelectItem>
                    <SelectItem value="1440">1 day before</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="color">Color</Label>
                <Select value={color} onValueChange={setColor}>
                  <SelectTrigger id="color">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {eventColors.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            {editingEvent && (
              <Button
                variant="destructive"
                onClick={() => deleteEvent(editingEvent.id)}
                className="gap-2 mr-auto"
              >
                <Trash size={16} />
                Delete
              </Button>
            )}
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={saveEvent}>
              {editingEvent ? 'Update' : 'Add'} Event
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </WidgetContainer>
  );
}
