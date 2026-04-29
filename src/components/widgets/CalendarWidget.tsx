import { useState, useEffect } from 'react';
import { WidgetContainer } from '@/components/WidgetContainer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Calendar, Plus, Clock, Bell, Trash, Pencil, CaretLeft, CaretRight, CalendarBlank, Rows } from '@phosphor-icons/react';
import { CalendarEvent, WidgetSize } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, startOfWeek, endOfWeek, isToday, addWeeks, subWeeks } from 'date-fns';

interface CalendarWidgetProps {
  events: CalendarEvent[];
  onUpdate: (events: CalendarEvent[]) => void;
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

export function CalendarWidget({ events, onUpdate, onRemove, widgetId, onDragStart, onDragEnd, size, onSizeChange }: CalendarWidgetProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [reminder, setReminder] = useState('none');
  const [color, setColor] = useState('blue');

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
    setShowDialog(true);
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
      description: description.trim(),
      date: eventDateTime,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      reminder: reminder !== 'none' ? parseInt(reminder) : undefined,
      reminderSent: false,
      color: color,
      createdAt: editingEvent?.createdAt || Date.now(),
    };

    if (editingEvent) {
      onUpdate(events.map((e) => (e.id === editingEvent.id ? newEvent : e)));
      toast.success('Event updated');
    } else {
      onUpdate([...events, newEvent]);
      toast.success('Event added');
    }

    setShowDialog(false);
    resetForm();
  };

  const deleteEvent = (id: string) => {
    onUpdate(events.filter((e) => e.id !== id));
    toast.success('Event deleted');
    setShowDialog(false);
    resetForm();
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

  const getEventsForMonth = () => {
    const monthStartDate = startOfMonth(currentMonth);
    const monthEndDate = endOfMonth(currentMonth);
    
    return events
      .filter((event) => {
        const eventDate = new Date(event.date);
        return eventDate >= monthStartDate && eventDate <= monthEndDate;
      })
      .sort((a, b) => a.date - b.date);
  };

  const getEventsForWeek = () => {
    const weekStartDate = startOfWeek(currentWeek);
    const weekEndDate = endOfWeek(currentWeek);
    
    return events
      .filter((event) => {
        const eventDate = new Date(event.date);
        return eventDate >= weekStartDate && eventDate <= weekEndDate;
      })
      .sort((a, b) => a.date - b.date);
  };

  const monthEvents = getEventsForMonth();
  const weekEvents = getEventsForWeek();

  const handleNavigatePrev = () => {
    if (viewMode === 'month') {
      setCurrentMonth(subMonths(currentMonth, 1));
    } else {
      setCurrentWeek(subWeeks(currentWeek, 1));
    }
  };

  const handleNavigateNext = () => {
    if (viewMode === 'month') {
      setCurrentMonth(addMonths(currentMonth, 1));
    } else {
      setCurrentWeek(addWeeks(currentWeek, 1));
    }
  };

  const currentDisplayTitle = viewMode === 'month'
    ? format(currentMonth, 'MMMM yyyy')
    : `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;

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
              onValueChange={(value) => value && setViewMode(value as 'month' | 'week')}
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
            </ToggleGroup>
            <Button onClick={() => openAddDialog()} size="sm" className="gap-1.5 h-7 text-xs flex-shrink-0">
              <Plus size={14} />
              <span className="hidden sm:inline">Add</span>
            </Button>
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
                              {event.startTime && (
                                <div className="flex items-center gap-1 opacity-90">
                                  <Clock size={10} />
                                  <span>{event.startTime}</span>
                                  {event.endTime && <span>- {event.endTime}</span>}
                                </div>
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
        ) : (
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
                          {event.startTime && (
                            <div className="flex items-center gap-0.5 mt-0.5 opacity-80">
                              <Clock size={8} />
                              <span>{event.startTime}</span>
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
                            {event.startTime && (
                              <Badge variant="secondary" className="text-xs h-5 gap-1">
                                <Clock size={12} />
                                {event.startTime}
                                {event.endTime && ` - ${event.endTime}`}
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
              Events & Plans - {viewMode === 'month' ? format(currentMonth, 'MMMM yyyy') : `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`}
            </h4>
            {(viewMode === 'month' ? monthEvents : weekEvents).length > 0 && (
              <Badge variant="outline" className="text-xs">
                {(viewMode === 'month' ? monthEvents : weekEvents).length} {(viewMode === 'month' ? monthEvents : weekEvents).length === 1 ? 'event' : 'events'}
              </Badge>
            )}
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            <AnimatePresence>
              {(viewMode === 'month' ? monthEvents : weekEvents).length === 0 ? (
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
                    No events this {viewMode}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Click "Add" to get started
                  </p>
                </motion.div>
              ) : (
                (viewMode === 'month' ? monthEvents : weekEvents).map((event) => (
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
                          {event.startTime && (
                            <Badge variant="secondary" className="text-xs h-5 gap-1 bg-background/50">
                              <Clock size={12} />
                              {event.startTime}
                              {event.endTime && ` - ${event.endTime}`}
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
            <div className="grid grid-cols-2 gap-3">
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
              <div className="space-y-2">
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
