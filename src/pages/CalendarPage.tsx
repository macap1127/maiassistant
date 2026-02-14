import { useState } from "react";
import { Plus, MapPin, Clock, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { useFamilyData, genId, type CalendarEvent } from "@/lib/store";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  isToday,
  parseISO,
} from "date-fns";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const CalendarPage = () => {
  const { data, update } = useFamilyData();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showForm, setShowForm] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: "", time: "", location: "", notes: "" });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const selectedDateStr = format(selectedDate, "yyyy-MM-dd");
  const eventsForDate = data.events.filter((e) => e.date === selectedDateStr);

  const datesWithEvents = new Set(data.events.map((e) => e.date));

  const addEvent = () => {
    const title = newEvent.title.trim();
    if (!title) return;
    update((d) => ({
      ...d,
      events: [
        ...d.events,
        {
          id: genId(),
          title,
          date: selectedDateStr,
          time: newEvent.time || undefined,
          location: newEvent.location.trim() || undefined,
          notes: newEvent.notes.trim() || undefined,
          addedBy: "You",
        },
      ],
    }));
    setNewEvent({ title: "", time: "", location: "", notes: "" });
    setShowForm(false);
  };

  const removeEvent = (id: string) =>
    update((d) => ({ ...d, events: d.events.filter((e) => e.id !== id) }));

  return (
    <div className="page-container">
      <h1 className="text-2xl font-serif font-semibold mb-1 animate-fade-in">Calendar</h1>
      <p className="text-sm text-muted-foreground mb-5 animate-fade-in">
        {data.events.length} upcoming events
      </p>

      {/* Month navigation */}
      <div className="bg-card rounded-2xl border border-border p-4 mb-4 animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-secondary transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h2 className="text-base font-serif font-semibold">
            {format(currentMonth, "MMMM yyyy")}
          </h2>
          <button
            onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-secondary transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 mb-1">
          {WEEKDAYS.map((d) => (
            <div key={d} className="text-center text-[11px] font-medium text-muted-foreground py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day) => {
            const dayStr = format(day, "yyyy-MM-dd");
            const inMonth = isSameMonth(day, currentMonth);
            const selected = isSameDay(day, selectedDate);
            const today = isToday(day);
            const hasEvents = datesWithEvents.has(dayStr);

            return (
              <button
                key={dayStr}
                onClick={() => setSelectedDate(day)}
                className={`relative flex flex-col items-center justify-center py-2 rounded-xl text-sm transition-colors ${
                  !inMonth ? "text-muted-foreground/40" : ""
                } ${selected ? "bg-primary text-primary-foreground" : today ? "bg-primary/10 text-primary font-semibold" : "hover:bg-secondary"}`}
              >
                {format(day, "d")}
                {hasEvents && !selected && (
                  <span className="absolute bottom-1 w-1 h-1 rounded-full bg-primary" />
                )}
                {hasEvents && selected && (
                  <span className="absolute bottom-1 w-1 h-1 rounded-full bg-primary-foreground" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected date events */}
      <div className="animate-slide-up" style={{ animationDelay: "100ms" }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-serif font-semibold">
            {isToday(selectedDate) ? "Today" : format(selectedDate, "MMM d, yyyy")}
          </h3>
          <button
            onClick={() => setShowForm(!showForm)}
            className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Add event form */}
        {showForm && (
          <div className="bg-card rounded-2xl border border-border p-4 mb-3 space-y-3 animate-slide-up">
            <input
              value={newEvent.title}
              onChange={(e) => setNewEvent((p) => ({ ...p, title: e.target.value }))}
              placeholder="Event title"
              className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="flex gap-2">
              <input
                type="time"
                value={newEvent.time}
                onChange={(e) => setNewEvent((p) => ({ ...p, time: e.target.value }))}
                className="flex-1 bg-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <input
                value={newEvent.location}
                onChange={(e) => setNewEvent((p) => ({ ...p, location: e.target.value }))}
                placeholder="Location"
                className="flex-1 bg-background border border-border rounded-xl px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <input
              value={newEvent.notes}
              onChange={(e) => setNewEvent((p) => ({ ...p, notes: e.target.value }))}
              placeholder="Notes (optional)"
              className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              onClick={addEvent}
              className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Add Event
            </button>
          </div>
        )}

        {/* Event list */}
        {eventsForDate.length === 0 && !showForm && (
          <p className="text-sm text-muted-foreground text-center py-8">No events for this day</p>
        )}
        <div className="space-y-2">
          {eventsForDate
            .sort((a, b) => (a.time || "").localeCompare(b.time || ""))
            .map((event) => (
              <div
                key={event.id}
                className="bg-card rounded-xl p-3 border border-border flex items-start gap-3"
              >
                <div className="w-1 self-stretch rounded-full bg-primary shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{event.title}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                    {event.time && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {event.time}
                      </span>
                    )}
                    {event.location && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {event.location}
                      </span>
                    )}
                  </div>
                  {event.notes && (
                    <p className="text-xs text-muted-foreground mt-1">{event.notes}</p>
                  )}
                </div>
                <button
                  onClick={() => removeEvent(event.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
        </div>
      </div>

      {/* Sync info */}
      <div className="mt-6 bg-secondary/50 rounded-2xl p-4 animate-slide-up" style={{ animationDelay: "200ms" }}>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
          Calendar Sync
        </p>
        <p className="text-sm text-muted-foreground">
          Connect your Google, Apple, or Outlook calendar to sync events automatically. Coming soon!
        </p>
      </div>
    </div>
  );
};

export default CalendarPage;
