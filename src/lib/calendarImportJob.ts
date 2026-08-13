// Calendar AI import job runner.
//
// Runs OUTSIDE the React component tree so an in-progress import survives a
// page unmount / remount (which happens on native when the photo picker
// closes and the app briefly backgrounds). Results are also mirrored to
// sessionStorage so they survive a full WebView reload.
//
// Large photos are downscaled before being base64-encoded: a 10MB HEIC/JPEG
// turns into a ~14MB base64 string, which is enough to get a WKWebView killed
// for memory pressure — that's what made the screen "flash" back to the
// calendar mid-read.

import { supabase } from "@/integrations/supabase/client";

export type ImportedEvent = {
  title: string;
  date: string;
  time: string;
  location: string;
  notes: string;
};

export type ImportJobState = {
  running: boolean;
  events: ImportedEvent[] | null;
  meta: { source: string; assignedTo?: string } | null;
  error: string | null;
  errorCode: string | null;
};

const RESULT_KEY = "mia.calendar.importJobResult";
const ACTIVE_KEY = "mia.calendar.importJobActive";

const initial: ImportJobState = {
  running: false,
  events: null,
  meta: null,
  error: null,
  errorCode: null,
};

function readPersisted(): ImportJobState {
  try {
    const raw = sessionStorage.getItem(RESULT_KEY);
    if (!raw) {
      const wasInterrupted = sessionStorage.getItem(ACTIVE_KEY) === "true";
      sessionStorage.removeItem(ACTIVE_KEY);
      return wasInterrupted
        ? { ...initial, error: "Import was interrupted. Please try again.", errorCode: "IMPORT_INTERRUPTED" }
        : initial;
    }
    const parsed = JSON.parse(raw);
    return { ...initial, ...parsed, running: false };
  } catch {
    return initial;
  }
}

let state: ImportJobState = readPersisted();
const listeners = new Set<(s: ImportJobState) => void>();

function persist() {
  try {
    if (state.events || state.error) {
      sessionStorage.setItem(
        RESULT_KEY,
        JSON.stringify({ events: state.events, meta: state.meta, error: state.error, errorCode: state.errorCode })
      );
    } else {
      sessionStorage.removeItem(RESULT_KEY);
    }
  } catch {
    /* ignore */
  }
}

function setState(patch: Partial<ImportJobState>) {
  state = { ...state, ...patch };
  persist();
  listeners.forEach((l) => l(state));
}

export function getImportJobState(): ImportJobState {
  return state;
}

export function subscribeImportJob(cb: (s: ImportJobState) => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/** Clear the finished result (after the user accepts/dismisses the review). */
export function clearImportJob() {
  state = { ...initial };
  try {
    sessionStorage.removeItem(ACTIVE_KEY);
  } catch {
    /* ignore */
  }
  persist();
  listeners.forEach((l) => l(state));
}

const MAX_DIM = 1600;
const JPEG_QUALITY = 0.82;
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const MAX_PDF_BYTES = 6 * 1024 * 1024;
const MAX_DATA_URL_CHARS = 8 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 60_000;

function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.readAsDataURL(file);
  });
}

/**
 * Downscale an image file to a modest JPEG data URL. Falls back to the raw
 * data URL if the browser can't decode it.
 */
export async function toCompressedDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    if (file.size > MAX_PDF_BYTES) throw new Error("FILE_TOO_LARGE");
    const raw = await readAsDataUrl(file);
    if (raw.length > MAX_DATA_URL_CHARS) throw new Error("FILE_TOO_LARGE");
    return raw;
  }
  if (file.size > MAX_IMAGE_BYTES) throw new Error("FILE_TOO_LARGE");

  let url: string | null = null;
  try {
    url = URL.createObjectURL(file);
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("decode failed"));
      el.src = url as string;
    });

    const scale = Math.min(1, MAX_DIM / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("IMAGE_PROCESSING_FAILED");
    ctx.drawImage(img, 0, 0, w, h);
    const out = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
    // Free the decoded bitmap ASAP.
    canvas.width = 0;
    canvas.height = 0;
    if (!out || out.length < 100) throw new Error("IMAGE_PROCESSING_FAILED");
    if (out.length > MAX_DATA_URL_CHARS) throw new Error("FILE_TOO_LARGE");
    return out;
  } catch (error) {
    if (error instanceof Error && (error.message === "FILE_TOO_LARGE" || error.message === "IMAGE_PROCESSING_FAILED")) {
      throw error;
    }
    throw new Error("IMAGE_PROCESSING_FAILED");
  } finally {
    if (url) URL.revokeObjectURL(url);
  }
}

/**
 * Kick off an import. Safe to call once per file; concurrent calls are ignored
 * while a job is running.
 */
export function startImportJob(opts: {
  file: File;
  source: string;
  assignedTo?: string;
  householdId?: string;
}) {
  if (state.running) return;
  setState({ running: true, events: null, meta: null, error: null, errorCode: null });
  try {
    sessionStorage.setItem(ACTIVE_KEY, "true");
  } catch {
    /* ignore */
  }

  void (async () => {
    try {
      const dataUrl = await toCompressedDataUrl(opts.file);

      const { data: result, error } = await supabase.functions.invoke("extract-events", {
        body: { imageDataUrl: dataUrl, source: opts.source, householdId: opts.householdId },
        timeout: REQUEST_TIMEOUT_MS,
      });

      if (error) {
        const ctx = (error as any)?.context?.body;
        const msg = ctx?.error || (error as any)?.message || "";
        const code = ctx?.code || "";
        try {
          sessionStorage.removeItem(ACTIVE_KEY);
        } catch {
          /* ignore */
        }
        setState({ running: false, error: msg || "failed", errorCode: code || null });
        return;
      }

      const extracted = (result?.events || []) as Array<{
        title: string;
        date: string;
        time?: string | null;
        location?: string | null;
        notes?: string | null;
      }>;

      try {
        sessionStorage.removeItem(ACTIVE_KEY);
      } catch {
        /* ignore */
      }
      setState({
        running: false,
        events: extracted.map((ev) => ({
          title: ev.title || "",
          date: ev.date || "",
          time: ev.time || "",
          location: ev.location || "",
          notes: ev.notes || "",
        })),
        meta: { source: opts.source, assignedTo: opts.assignedTo },
        error: null,
        errorCode: null,
      });
    } catch (e) {
      console.error("calendar import job failed", e);
      try {
        sessionStorage.removeItem(ACTIVE_KEY);
      } catch {
        /* ignore */
      }
      const message = e instanceof Error ? e.message : "failed";
      setState({ running: false, error: message, errorCode: message });
    }
  })();
}
