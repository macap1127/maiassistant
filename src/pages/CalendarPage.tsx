import { useState, useRef, useMemo } from "react";
import { Plus, MapPin, Clock, Trash2, ChevronLeft, ChevronRight, Upload, Tag, FileUp, X, CheckSquare, Check, Pencil } from "lucide-react";
import { useFamilyData, genId, type CalendarEvent } from "@/lib/store";
import { parseIcsFile, readFileAsText } from "@/lib/ics-parser";
import { supabase } from "@/integrations/supabase/client";
import { useHousehold } from "@/lib/useHousehold";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { formatTime12h } from "@/lib/date";

type PendingEvent = {
  title: string;
  date: string;
  time: string;
  location: string;
  notes: string;
};
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
} from "date-fns";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Color palette for source tags
const SOURCE_COLORS = [
  "bg-blue-500/15 text-blue-700 border-blue-500/20",
  "bg-purple-500/15 text-purple-700 border-purple-500/20",
  "bg-amber-500/15 text-amber-700 border-amber-500/20",
  "bg-emerald-500/15 text-emerald-700 border-emerald-500/20",
  "bg-rose-500/15 text-rose-700 border-rose-500/20",
  "bg-cyan-500/15 text-cyan-700 border-cyan-500/20",
];

function getSourceColor(source: string, allSources: string[]) {
  const idx = allSources.indexOf(source);
  return SOURCE_COLORS[idx % SOURCE_COLORS.length];
}

const CalendarPage = () => {
  const { data, update } = useFamilyData();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showForm, setShowForm] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: "", time: "", location: "", notes: "", assignedTo: "" });
  const [uploadSource, setUploadSource] = useState("");
  const [uploadAssignedTo, setUploadAssignedTo] = useState("");
  const [importing, setImporting] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState({ title: "", time: "", location: "", notes: "", assignedTo: "" });
  const [pendingEvents, setPendingEvents] = useState<PendingEvent[] | null>(null);
  const [pendingMeta, setPendingMeta] = useState<{ source: string; assignedTo?: string }>({ source: "" });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const selectedDateStr = format(selectedDate, "yyyy-MM-dd");
  const eventsForDate = data.events.filter((e) => e.date === selectedDateStr);
  const tasksForDate = useMemo(
    () => data.tasks.filter((t) => t.dueDate && t.dueDate === selectedDateStr),
    [data.tasks, selectedDateStr]
  );
  const datesWithEvents = useMemo(() => {
    const s = new Set(data.events.map((e) => e.date));
    data.tasks.forEach((t) => { if (t.dueDate) s.add(t.dueDate); });
    return s;
  }, [data.events, data.tasks]);

  // All unique sources for color mapping
  const allSources = [...new Set(data.events.map((e) => e.source).filter(Boolean))] as string[];

  const toggleTask = (id: string) =>
    update((d) => ({
      ...d,
      tasks: d.tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)),
    }));

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
          assignedTo: newEvent.assignedTo || undefined,
          addedBy: "You",
        },
      ],
    }));
    setNewEvent({ title: "", time: "", location: "", notes: "", assignedTo: "" });
    setShowForm(false);
  };

  const removeEvent = (id: string) =>
    update((d) => ({ ...d, events: d.events.filter((e) => e.id !== id) }));

  const startEdit = (event: CalendarEvent) => {
    setEditingEventId(event.id);
    setEditDraft({
      title: event.title,
      time: event.time || "",
      location: event.location || "",
      notes: event.notes || "",
      assignedTo: event.assignedTo || "",
    });
  };

  const saveEdit = () => {
    if (!editingEventId) return;
    const title = editDraft.title.trim();
    if (!title) return;
    update((d) => ({
      ...d,
      events: d.events.map((e) =>
        e.id === editingEventId
          ? {
              ...e,
              title,
              time: editDraft.time || undefined,
              location: editDraft.location.trim() || undefined,
              notes: editDraft.notes.trim() || undefined,
              assignedTo: editDraft.assignedTo || undefined,
            }
          : e
      ),
    }));
    setEditingEventId(null);
  };

  const cancelEdit = () => setEditingEventId(null);

  const updatePending = (idx: number, patch: Partial<PendingEvent>) =>
    setPendingEvents((list) => list?.map((e, i) => (i === idx ? { ...e, ...patch } : e)) ?? null);

  const removePending = (idx: number) =>
    setPendingEvents((list) => list?.filter((_, i) => i !== idx) ?? null);

  const confirmPending = () => {
    if (!pendingEvents) return;
    const valid = pendingEvents.filter((e) => e.title.trim() && /^\d{4}-\d{2}-\d{2}$/.test(e.date));
    if (valid.length === 0) {
      toast.error("Each event needs a title and date");
      return;
    }
    const { source, assignedTo } = pendingMeta;
    update((d) => ({
      ...d,
      events: [
        ...d.events,
        ...valid.map((ev) => ({
          id: genId(),
          title: ev.title.trim(),
          date: ev.date,
          time: ev.time || undefined,
          location: ev.location.trim() || undefined,
          notes: ev.notes.trim() || undefined,
          addedBy: "You",
          source,
          assignedTo,
        })),
      ],
    }));
    toast.success(`Added ${valid.length} event${valid.length > 1 ? "s" : ""}`);
    setPendingEvents(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const source = uploadSource.trim();
    if (!source) {
      toast.error("Please enter a source label first (e.g. \"Jake's School\")");
      return;
    }

    const lower = file.name.toLowerCase();
    const isIcs = lower.endsWith(".ics");
    const isImage = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf" || lower.endsWith(".pdf");

    if (!isIcs && !isImage && !isPdf) {
      toast.error("Upload a .ics file, image, or PDF");
      return;
    }

    setImporting(true);
    const assignedTo = uploadAssignedTo || undefined;
    try {
      if (isIcs) {
        const text = await readFileAsText(file);
        const parsed = parseIcsFile(text, source).map((ev) => ({ ...ev, assignedTo }));
        if (parsed.length === 0) {
          toast.error("No events found in the file");
          return;
        }
        update((d) => ({ ...d, events: [...d.events, ...parsed] }));
        toast.success(`Imported ${parsed.length} event${parsed.length > 1 ? "s" : ""} from "${source}"`);
      } else {
        // Image or PDF → AI extraction
        const dataUrl: string = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(file);
        });

        const { data: result, error } = await supabase.functions.invoke("extract-events", {
          body: { imageDataUrl: dataUrl, source },
        });
        if (error) throw error;

        const extracted = (result?.events || []) as Array<{
          title: string; date: string; time?: string | null;
          location?: string | null; notes?: string | null; source?: string;
        }>;
        if (extracted.length === 0) {
          toast.error("No events found in that file");
          return;
        }

        // Stage for user confirmation instead of inserting directly
        setPendingEvents(
          extracted.map((ev) => ({
            title: ev.title || "",
            date: ev.date || "",
            time: ev.time || "",
            location: ev.location || "",
            notes: ev.notes || "",
          }))
        );
        setPendingMeta({ source, assignedTo });
      }
      setShowUpload(false);
      setUploadSource("");
      setUploadAssignedTo("");
    } catch (err) {
      console.error(err);
      toast.error("Failed to import events from that file");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

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

      {/* Action buttons */}
      <div className="animate-slide-up" style={{ animationDelay: "100ms" }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-serif font-semibold">
            {isToday(selectedDate) ? "Today" : format(selectedDate, "MMM d, yyyy")}
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setShowUpload(!showUpload); setShowForm(false); }}
              className="w-8 h-8 rounded-full bg-secondary text-foreground flex items-center justify-center hover:opacity-90 transition-opacity"
              title="Import calendar"
            >
              <Upload className="w-4 h-4" />
            </button>
            <button
              onClick={() => { setShowForm(!showForm); setShowUpload(false); }}
              className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Import calendar form */}
        {showUpload && (
          <div className="bg-card rounded-2xl border border-border p-4 mb-3 space-y-3 animate-slide-up">
            <div className="flex items-center gap-2 mb-1">
              <FileUp className="w-4 h-4 text-primary" />
              <p className="text-sm font-medium">Import Calendar</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Upload an .ics file, a photo of a schedule/flyer, or a PDF. We'll pull out the events automatically.
            </p>
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                value={uploadSource}
                onChange={(e) => setUploadSource(e.target.value)}
                placeholder="Source label (e.g. Jake's School)"
                className="w-full bg-background border border-border rounded-xl pl-9 pr-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            {data.members.length > 0 && (
              <select
                value={uploadAssignedTo}
                onChange={(e) => setUploadAssignedTo(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Assign to family member (optional)</option>
                {data.members.map((m) => (
                  <option key={m.id} value={m.name}>{m.name}</option>
                ))}
              </select>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".ics,image/*,application/pdf,.pdf"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => {
                if (!uploadSource.trim()) {
                  toast.error("Enter a source label first");
                  return;
                }
                fileInputRef.current?.click();
              }}
              disabled={importing}
              className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Upload className="w-4 h-4" />
              {importing ? "Reading…" : "Choose file (.ics, image, PDF)"}
            </button>
            <button
              onClick={() => setShowUpload(false)}
              className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        )}

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
            {data.members.length > 0 && (
              <select
                value={newEvent.assignedTo}
                onChange={(e) => setNewEvent((p) => ({ ...p, assignedTo: e.target.value }))}
                className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Assign to family member (optional)</option>
                {data.members.map((m) => (
                  <option key={m.id} value={m.name}>{m.name}</option>
                ))}
              </select>
            )}
            <button
              onClick={addEvent}
              className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Add Event
            </button>
          </div>
        )}

        {/* Source filter chips */}
        {allSources.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {allSources.map((src) => (
              <span
                key={src}
                className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${getSourceColor(src, allSources)}`}
              >
                {src}
              </span>
            ))}
          </div>
        )}

        {/* Event list */}
        {eventsForDate.length === 0 && tasksForDate.length === 0 && !showForm && !showUpload && (
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
                  {editingEventId === event.id ? (
                    <div className="space-y-2">
                      <input
                        value={editDraft.title}
                        onChange={(e) => setEditDraft((d) => ({ ...d, title: e.target.value }))}
                        placeholder="Event title"
                        className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      <div className="flex gap-2">
                        <input
                          type="time"
                          value={editDraft.time}
                          onChange={(e) => setEditDraft((d) => ({ ...d, time: e.target.value }))}
                          className="flex-1 bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                        <input
                          value={editDraft.location}
                          onChange={(e) => setEditDraft((d) => ({ ...d, location: e.target.value }))}
                          placeholder="Location"
                          className="flex-1 bg-background border border-border rounded-xl px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                      <input
                        value={editDraft.notes}
                        onChange={(e) => setEditDraft((d) => ({ ...d, notes: e.target.value }))}
                        placeholder="Notes"
                        className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      {data.members.length > 0 && (
                        <select
                          value={editDraft.assignedTo}
                          onChange={(e) => setEditDraft((d) => ({ ...d, assignedTo: e.target.value }))}
                          className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          <option value="">Assign to family member (optional)</option>
                          {data.members.map((m) => (
                            <option key={m.id} value={m.name}>{m.name}</option>
                          ))}
                        </select>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={saveEdit}
                          className="flex-1 bg-primary text-primary-foreground rounded-xl py-2 text-sm font-medium hover:opacity-90 transition-opacity"
                        >
                          Save
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="flex-1 bg-secondary text-secondary-foreground rounded-xl py-2 text-sm font-medium hover:bg-secondary/80 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{event.title}</p>
                        {event.source && (
                          <span
                            className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full border shrink-0 ${getSourceColor(event.source, allSources)}`}
                          >
                            {event.source}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                        {event.time && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTime12h(event.time)}
                          </span>
                        )}
                        {event.location && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {event.location}
                          </span>
                        )}
                        {event.assignedTo && (
                          <span className="text-xs text-primary font-medium">
                            • {event.assignedTo}
                          </span>
                        )}
                      </div>
                      {event.notes && (
                        <p className="text-xs text-muted-foreground mt-1">{event.notes}</p>
                      )}
                    </>
                  )}
                </div>
                {editingEventId !== event.id && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => startEdit(event)}
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => removeEvent(event.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}

          {tasksForDate.map((task) => (
            <div
              key={task.id}
              className={`bg-card rounded-xl p-3 border border-border flex items-center gap-3 ${task.completed ? "opacity-60" : ""}`}
            >
              <button
                onClick={() => toggleTask(task.id)}
                className={`w-6 h-6 rounded-full border-2 border-primary flex items-center justify-center shrink-0 transition-colors ${task.completed ? "bg-primary" : "hover:bg-primary/10"}`}
                aria-label="Toggle task"
              >
                {task.completed && <Check className="w-3.5 h-3.5 text-primary-foreground" />}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`text-sm font-medium truncate ${task.completed ? "line-through" : ""}`}>
                    {task.title}
                  </p>
                  <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full border border-primary/30 bg-primary/10 text-primary shrink-0 flex items-center gap-1">
                    <CheckSquare className="w-2.5 h-2.5" /> Task
                  </span>
                </div>
                {task.assignedTo && (
                  <p className="text-xs text-muted-foreground mt-0.5">{task.assignedTo}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sync info */}
      <div className="mt-6 bg-secondary/50 rounded-2xl p-4 animate-slide-up" style={{ animationDelay: "200ms" }}>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
          Calendar Import
        </p>
        <p className="text-sm text-muted-foreground">
          Upload .ics files from schools, sports leagues, or any calendar app. Events are tagged by source so you always know where they came from.
        </p>
      </div>

      {/* Confirm scanned events */}
      <Dialog open={!!pendingEvents} onOpenChange={(o) => { if (!o) setPendingEvents(null); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review {pendingEvents?.length ?? 0} event{(pendingEvents?.length ?? 0) === 1 ? "" : "s"}</DialogTitle>
            <DialogDescription>
              Edit anything that looks off, then confirm to add to your calendar
              {pendingMeta.source ? ` under "${pendingMeta.source}"` : ""}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {pendingEvents?.map((ev, idx) => (
              <div key={idx} className="border border-border rounded-xl p-3 space-y-2 bg-card">
                <div className="flex items-start gap-2">
                  <input
                    value={ev.title}
                    onChange={(e) => updatePending(idx, { title: e.target.value })}
                    placeholder="Title"
                    className="flex-1 bg-background border border-border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <button
                    onClick={() => removePending(idx)}
                    className="text-muted-foreground hover:text-destructive transition-colors p-1"
                    aria-label="Remove"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={ev.date}
                    onChange={(e) => updatePending(idx, { date: e.target.value })}
                    className="flex-1 bg-background border border-border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <input
                    type="time"
                    value={ev.time}
                    onChange={(e) => updatePending(idx, { time: e.target.value })}
                    className="flex-1 bg-background border border-border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <input
                  value={ev.location}
                  onChange={(e) => updatePending(idx, { location: e.target.value })}
                  placeholder="Location (optional)"
                  className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <input
                  value={ev.notes}
                  onChange={(e) => updatePending(idx, { notes: e.target.value })}
                  placeholder="Notes (optional)"
                  className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            ))}
            {pendingEvents?.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No events to add.</p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <button
              onClick={() => setPendingEvents(null)}
              className="px-4 py-2 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/80 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={confirmPending}
              disabled={!pendingEvents?.length}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              Add to calendar
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CalendarPage;
