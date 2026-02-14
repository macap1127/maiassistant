import { genId, type CalendarEvent } from "./store";

/**
 * Parse an .ics file string into CalendarEvent objects.
 * Handles standard VEVENT blocks with DTSTART, SUMMARY, LOCATION, DESCRIPTION.
 */
export function parseIcsFile(icsText: string, source: string): CalendarEvent[] {
  const events: CalendarEvent[] = [];

  // Unfold lines (RFC 5545: lines starting with space/tab are continuations)
  const unfolded = icsText.replace(/\r\n[ \t]/g, "").replace(/\r/g, "");
  const lines = unfolded.split("\n");

  let inEvent = false;
  let current: Partial<CalendarEvent> = {};

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === "BEGIN:VEVENT") {
      inEvent = true;
      current = {};
      continue;
    }

    if (trimmed === "END:VEVENT") {
      if (inEvent && current.title && current.date) {
        events.push({
          id: genId(),
          title: current.title,
          date: current.date,
          time: current.time,
          location: current.location,
          notes: current.notes,
          addedBy: "Import",
          source,
        });
      }
      inEvent = false;
      continue;
    }

    if (!inEvent) continue;

    const colonIdx = trimmed.indexOf(":");
    if (colonIdx === -1) continue;

    const keyPart = trimmed.slice(0, colonIdx);
    const value = trimmed.slice(colonIdx + 1);
    // Strip parameters (e.g. DTSTART;TZID=America/New_York:20240101T090000)
    const key = keyPart.split(";")[0];

    switch (key) {
      case "SUMMARY":
        current.title = value;
        break;
      case "LOCATION":
        current.location = value;
        break;
      case "DESCRIPTION":
        current.notes = value.replace(/\\n/g, " ").replace(/\\,/g, ",").slice(0, 200);
        break;
      case "DTSTART": {
        const parsed = parseIcsDate(value);
        if (parsed) {
          current.date = parsed.date;
          current.time = parsed.time;
        }
        break;
      }
    }
  }

  return events;
}

function parseIcsDate(value: string): { date: string; time?: string } | null {
  // Formats: 20240115, 20240115T093000, 20240115T093000Z
  const cleaned = value.replace("Z", "");

  if (cleaned.length >= 8) {
    const year = cleaned.slice(0, 4);
    const month = cleaned.slice(4, 6);
    const day = cleaned.slice(6, 8);
    const date = `${year}-${month}-${day}`;

    let time: string | undefined;
    if (cleaned.length >= 13) {
      const hours = cleaned.slice(9, 11);
      const minutes = cleaned.slice(11, 13);
      time = `${hours}:${minutes}`;
    }

    return { date, time };
  }

  return null;
}

/** Read a File object and return its text content */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}
