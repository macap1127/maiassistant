import { useState, useEffect, useRef, useCallback } from "react";
import { Receipt, Plus, X, Loader2, Camera, Trash2, Calendar as CalIcon, Store, DollarSign, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

type ReceiptRow = {
  id: string;
  household_id: string;
  added_by: string;
  store: string;
  purchase_date: string | null;
  total: number | null;
  currency: string;
  notes: string | null;
  items_summary: string | null;
  image_path: string;
  created_at: string;
};

const fmtMoney = (n: number | null, currency = "USD") => {
  if (n == null) return "—";
  try { return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(n); }
  catch { return `${currency} ${n.toFixed(2)}`; }
};

const fmtDate = (s: string | null) => {
  if (!s) return "Date unknown";
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

export default function ReceiptsPage() {
  const { user } = useAuth();
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [receipts, setReceipts] = useState<ReceiptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [adderOpen, setAdderOpen] = useState(false);
  const [viewer, setViewer] = useState<ReceiptRow | null>(null);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);

  // Load household + receipts
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data: mem } = await supabase.from("household_members").select("household_id").eq("user_id", user.id).maybeSingle();
      if (!mem || cancelled) { setLoading(false); return; }
      setHouseholdId(mem.household_id);
      const { data: rows } = await supabase.from("receipts").select("*").eq("household_id", mem.household_id)
        .order("purchase_date", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false });
      if (cancelled) return;
      setReceipts((rows ?? []) as ReceiptRow[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  // Realtime
  useEffect(() => {
    if (!householdId) return;
    const ch = supabase.channel(`receipts-${householdId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "receipts", filter: `household_id=eq.${householdId}` },
        async () => {
          const { data: rows } = await supabase.from("receipts").select("*").eq("household_id", householdId)
            .order("purchase_date", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false });
          setReceipts((rows ?? []) as ReceiptRow[]);
        })
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [householdId]);

  // Sign thumbnails (lazy, batched)
  useEffect(() => {
    const missing = receipts.filter(r => !signedUrls[r.image_path]).map(r => r.image_path);
    if (missing.length === 0) return;
    (async () => {
      const { data } = await supabase.storage.from("receipts").createSignedUrls(missing, 3600);
      if (!data) return;
      setSignedUrls(prev => {
        const next = { ...prev };
        for (const item of data) if (item.signedUrl && item.path) next[item.path] = item.signedUrl;
        return next;
      });
    })();
  }, [receipts, signedUrls]);

  const openViewer = useCallback(async (r: ReceiptRow) => {
    setViewer(r);
    const { data } = await supabase.storage.from("receipts").createSignedUrl(r.image_path, 3600);
    setViewerUrl(data?.signedUrl ?? null);
  }, []);

  const deleteReceipt = useCallback(async (r: ReceiptRow) => {
    if (!confirm(`Delete receipt from ${r.store || "this store"}?`)) return;
    await supabase.storage.from("receipts").remove([r.image_path]);
    await supabase.from("receipts").delete().eq("id", r.id);
    setViewer(null);
    setViewerUrl(null);
    toast({ title: "Receipt deleted" });
  }, []);

  return (
    <div className="page-container pb-28">
      <div className="flex items-center justify-between mb-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-serif font-semibold">Receipts</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Snap, store, and find any receipt later</p>
        </div>
        <button
          onClick={() => setAdderOpen(true)}
          disabled={!householdId}
          className="flex items-center gap-1.5 bg-primary text-primary-foreground rounded-xl px-3 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : receipts.length === 0 ? (
        <div className="text-center py-16 animate-fade-in">
          <Receipt className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No receipts yet.</p>
          <p className="text-xs text-muted-foreground mt-1">Tap Add to snap your first receipt.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {receipts.map((r, i) => (
            <button
              key={r.id}
              onClick={() => openViewer(r)}
              className="group bg-card rounded-2xl border border-border overflow-hidden text-left animate-slide-up hover:border-primary/50 transition-colors"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div className="aspect-[3/4] bg-muted relative overflow-hidden">
                {signedUrls[r.image_path] ? (
                  <img src={signedUrls[r.image_path]} alt={r.store} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
                )}
              </div>
              <div className="p-2.5">
                <p className="text-sm font-medium truncate">{r.store || "Unknown store"}</p>
                <p className="text-[11px] text-muted-foreground">{fmtDate(r.purchase_date)}</p>
                <p className="text-xs font-semibold text-primary mt-0.5">{fmtMoney(r.total, r.currency)}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {householdId && (
        <ReceiptAdder
          open={adderOpen}
          onClose={() => setAdderOpen(false)}
          householdId={householdId}
          addedBy={user?.email?.split("@")[0] ?? ""}
        />
      )}

      <Dialog open={!!viewer} onOpenChange={(o) => { if (!o) { setViewer(null); setViewerUrl(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">{viewer?.store || "Receipt"}</DialogTitle>
          </DialogHeader>
          {viewer && (
            <div className="space-y-3">
              <div className="bg-muted rounded-xl overflow-hidden">
                {viewerUrl ? (
                  <img src={viewerUrl} alt="receipt" className="w-full max-h-[60vh] object-contain" />
                ) : (
                  <div className="aspect-[3/4] flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><p className="text-[10px] uppercase text-muted-foreground">Date</p><p>{fmtDate(viewer.purchase_date)}</p></div>
                <div><p className="text-[10px] uppercase text-muted-foreground">Total</p><p className="font-semibold">{fmtMoney(viewer.total, viewer.currency)}</p></div>
              </div>
              {viewer.items_summary && (
                <div><p className="text-[10px] uppercase text-muted-foreground">Items</p><p className="text-sm">{viewer.items_summary}</p></div>
              )}
              {viewer.notes && (
                <div><p className="text-[10px] uppercase text-muted-foreground">Notes</p><p className="text-sm">{viewer.notes}</p></div>
              )}
              {viewer.added_by && <p className="text-[11px] text-muted-foreground">Added by {viewer.added_by}</p>}
            </div>
          )}
          <DialogFooter className="sm:justify-between gap-2">
            <button
              onClick={() => viewer && deleteReceipt(viewer)}
              className="flex items-center gap-1.5 text-destructive text-sm px-3 py-2 rounded-xl hover:bg-destructive/10"
            >
              <Trash2 className="w-4 h-4" /> Delete
            </button>
            <button
              onClick={() => { setViewer(null); setViewerUrl(null); }}
              className="bg-secondary text-secondary-foreground rounded-xl px-4 py-2 text-sm"
            >
              Close
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ===== ADDER MODAL =====

const MAX_DIM = 1600;
async function compressImage(file: File): Promise<{ blob: Blob; dataUrl: string }> {
  const img = document.createElement("img");
  const reader = new FileReader();
  const dataUrl0: string = await new Promise((res, rej) => {
    reader.onload = () => res(reader.result as string);
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = dataUrl0; });
  const scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, w, h);
  const dataUrl: string = canvas.toDataURL("image/jpeg", 0.85);
  const blob: Blob = await new Promise((res) => canvas.toBlob((b) => res(b!), "image/jpeg", 0.85));
  return { blob, dataUrl };
}

function ReceiptAdder({ open, onClose, householdId, addedBy }: { open: boolean; onClose: () => void; householdId: string; addedBy: string }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<"pick" | "review">("pick");
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ store: "", purchase_date: "", total: "", currency: "USD", items_summary: "", notes: "" });

  const reset = () => {
    setStage("pick"); setImageBlob(null); setImageUrl(null);
    setForm({ store: "", purchase_date: "", total: "", currency: "USD", items_summary: "", notes: "" });
    setAnalyzing(false); setSaving(false);
  };

  const handleFile = async (file: File) => {
    if (!file) return;
    try {
      const { blob, dataUrl } = await compressImage(file);
      setImageBlob(blob);
      setImageUrl(dataUrl);
      setStage("review");
      setAnalyzing(true);
      const { data, error } = await supabase.functions.invoke("extract-receipt", { body: { imageDataUrl: dataUrl } });
      setAnalyzing(false);
      if (error) {
        toast({ title: "Couldn't read receipt", description: "Fill the details manually." });
        return;
      }
      setForm({
        store: data.store || "",
        purchase_date: data.purchase_date || "",
        total: data.total != null ? String(data.total) : "",
        currency: data.currency || "USD",
        items_summary: data.items_summary || "",
        notes: data.notes || "",
      });
    } catch (e) {
      console.error(e);
      toast({ title: "Couldn't process image", variant: "destructive" });
    }
  };

  const save = async () => {
    if (!imageBlob) return;
    setSaving(true);
    try {
      const ext = "jpg";
      const path = `${householdId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("receipts").upload(path, imageBlob, { contentType: "image/jpeg" });
      if (upErr) throw upErr;
      const totalNum = form.total.trim() ? Number(form.total) : null;
      const { error: insErr } = await supabase.from("receipts").insert({
        household_id: householdId,
        added_by: addedBy,
        store: form.store.trim(),
        purchase_date: form.purchase_date || null,
        total: totalNum != null && isFinite(totalNum) ? totalNum : null,
        currency: form.currency.trim().toUpperCase() || "USD",
        items_summary: form.items_summary.trim() || null,
        notes: form.notes.trim() || null,
        image_path: path,
      });
      if (insErr) throw insErr;
      toast({ title: "Receipt saved" });
      reset();
      onClose();
    } catch (e: any) {
      console.error(e);
      toast({ title: "Couldn't save receipt", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif">Add receipt</DialogTitle>
        </DialogHeader>

        {stage === "pick" && (
          <div className="space-y-3">
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); }}
            />
            <button
              onClick={() => fileInput.current?.click()}
              className="w-full flex flex-col items-center justify-center gap-2 bg-primary text-primary-foreground rounded-2xl py-10 hover:opacity-90"
            >
              <Camera className="w-8 h-8" />
              <span className="text-sm font-medium">Take a photo</span>
              <span className="text-[11px] opacity-80">or pick from gallery</span>
            </button>
            <p className="text-[11px] text-center text-muted-foreground flex items-center justify-center gap-1">
              <Sparkles className="w-3 h-3" /> AI will fill in store, date, and total — you confirm.
            </p>
          </div>
        )}

        {stage === "review" && (
          <div className="space-y-3">
            {imageUrl && (
              <div className="bg-muted rounded-xl overflow-hidden max-h-48">
                <img src={imageUrl} alt="preview" className="w-full h-full object-contain max-h-48" />
              </div>
            )}
            {analyzing && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-primary/5 border border-primary/20 rounded-xl p-2.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Reading receipt with AI…
              </div>
            )}

            <div className="space-y-2">
              <label className="block">
                <span className="text-[10px] uppercase text-muted-foreground flex items-center gap-1"><Store className="w-3 h-3" />Store</span>
                <input className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm mt-1" value={form.store} onChange={(e) => setForm(f => ({ ...f, store: e.target.value }))} placeholder="Trader Joe's" />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="text-[10px] uppercase text-muted-foreground flex items-center gap-1"><CalIcon className="w-3 h-3" />Date</span>
                  <input type="date" className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm mt-1" value={form.purchase_date} onChange={(e) => setForm(f => ({ ...f, purchase_date: e.target.value }))} />
                </label>
                <label className="block">
                  <span className="text-[10px] uppercase text-muted-foreground flex items-center gap-1"><DollarSign className="w-3 h-3" />Total</span>
                  <input type="number" inputMode="decimal" step="0.01" className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm mt-1" value={form.total} onChange={(e) => setForm(f => ({ ...f, total: e.target.value }))} placeholder="0.00" />
                </label>
              </div>
              <label className="block">
                <span className="text-[10px] uppercase text-muted-foreground">Items</span>
                <input className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm mt-1" value={form.items_summary} onChange={(e) => setForm(f => ({ ...f, items_summary: e.target.value }))} placeholder="milk, eggs, bread" />
              </label>
              <label className="block">
                <span className="text-[10px] uppercase text-muted-foreground">Notes</span>
                <textarea rows={2} className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm mt-1" value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Card ending 1234, gift for Sara…" />
              </label>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {stage === "review" && (
            <button onClick={reset} className="bg-secondary text-secondary-foreground rounded-xl px-3 py-2 text-sm">Retake</button>
          )}
          <button onClick={() => { reset(); onClose(); }} className="rounded-xl px-3 py-2 text-sm hover:bg-muted">Cancel</button>
          {stage === "review" && (
            <button
              onClick={save}
              disabled={saving || analyzing || !imageBlob}
              className="bg-primary text-primary-foreground rounded-xl px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5"
            >
              {saving && <Loader2 className="w-3 h-3 animate-spin" />}
              Save receipt
            </button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
