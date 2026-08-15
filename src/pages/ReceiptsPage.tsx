import { useState, useEffect, useRef, useCallback } from "react";
import { Receipt, Plus, X, Loader2, Camera, Trash2, Calendar as CalIcon, Store, DollarSign, Sparkles, ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useTranslation } from "react-i18next";
import { useHousehold } from "@/lib/useHousehold";
import { limitsForTier, startOfCurrentMonth } from "@/lib/usageLimits";
import { useUpgradePrompt, UpgradeLink } from "@/components/UpgradePrompt";
import { useSearchParams } from "react-router-dom";
import { Search, SlidersHorizontal } from "lucide-react";

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

const fmtDate = (s: string | null, unknownLabel = "Date unknown") => {
  if (!s) return unknownLabel;
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

export default function ReceiptsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { household } = useHousehold();
  const { promptUpgrade, upgradeDialog } = useUpgradePrompt();
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [receipts, setReceipts] = useState<ReceiptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [adderOpen, setAdderOpen] = useState(false);
  const [viewer, setViewer] = useState<ReceiptRow | null>(null);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [receiptToDelete, setReceiptToDelete] = useState<ReceiptRow | null>(null);

  // Filters — seeded from the URL so the voice assistant can deep-link
  // (e.g. /receipts?q=Home%20Depot) and the screen shows only those receipts.
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [store, setStore] = useState(searchParams.get("store") ?? "");
  const [month, setMonth] = useState(searchParams.get("month") ?? "");
  const [minTotal, setMinTotal] = useState(searchParams.get("min") ?? "");
  const [maxTotal, setMaxTotal] = useState(searchParams.get("max") ?? "");
  const [showFilters, setShowFilters] = useState(
    Boolean(searchParams.get("store") || searchParams.get("month") || searchParams.get("min") || searchParams.get("max")),
  );

  // Keep local filter state in sync when the assistant navigates here again.
  useEffect(() => {
    setQuery(searchParams.get("q") ?? "");
    setStore(searchParams.get("store") ?? "");
    setMonth(searchParams.get("month") ?? "");
    setMinTotal(searchParams.get("min") ?? "");
    setMaxTotal(searchParams.get("max") ?? "");
  }, [searchParams]);

  const storeOptions = Array.from(
    new Set(receipts.map((r) => (r.store || "").trim()).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b));

  const q = query.trim().toLowerCase();
  const min = minTotal === "" ? null : Number(minTotal);
  const max = maxTotal === "" ? null : Number(maxTotal);
  const filtered = receipts.filter((r) => {
    if (q && ![r.store, r.items_summary, r.notes, r.added_by].some((f) => (f || "").toLowerCase().includes(q))) return false;
    if (store && (r.store || "").toLowerCase() !== store.toLowerCase()) return false;
    if (month) {
      const d = r.purchase_date ?? r.created_at.slice(0, 10);
      if (!d.startsWith(month)) return false;
    }
    if (min != null && !Number.isNaN(min) && (r.total ?? 0) < min) return false;
    if (max != null && !Number.isNaN(max) && (r.total ?? 0) > max) return false;
    return true;
  });
  const filtersActive = Boolean(q || store || month || minTotal || maxTotal);
  const clearFilters = () => {
    setQuery(""); setStore(""); setMonth(""); setMinTotal(""); setMaxTotal("");
    setSearchParams({}, { replace: true });
  };
  const filteredTotal = filtered.reduce((sum, r) => sum + (r.total ?? 0), 0);

  // Basic plan has a monthly receipt-scan cap; block the adder once it's used up.
  const scanLimit = household?.subscriptionTier === "basic" ? (limitsForTier("basic").receiptScans ?? 0) : null;
  const scansUsedThisMonth = receipts.filter((r) => new Date(r.created_at) >= startOfCurrentMonth()).length;
  const scansExhausted = scanLimit != null && scansUsedThisMonth >= scanLimit;

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
    await supabase.storage.from("receipts").remove([r.image_path]);
    await supabase.from("receipts").delete().eq("id", r.id);
    if (viewer?.id === r.id) {
      setViewer(null);
      setViewerUrl(null);
    }
    setReceiptToDelete(null);
    toast({ title: t("receipts.receiptDeletedToast") });
  }, [viewer]);

  return (
    <div className="page-container pb-28">
      <div className="flex items-center justify-between mb-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-serif font-semibold">{t("receipts.title")}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{t("receipts.subtitle")}</p>
        </div>
        <button
          onClick={() => (scansExhausted ? promptUpgrade("receiptScans") : setAdderOpen(true))}
          disabled={!householdId}
          className="flex items-center gap-1.5 bg-primary text-primary-foreground rounded-xl px-3 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          <Plus className="w-4 h-4" /> {t("receipts.add")}
        </button>
      </div>

      {/* Remaining monthly receipt scans (Basic plan only — higher tiers are unlimited) */}
      {household?.subscriptionTier === "basic" && (() => {
        const limit = limitsForTier("basic").receiptScans ?? 0;
        const monthStart = startOfCurrentMonth();
        const used = receipts.filter((r) => new Date(r.created_at) >= monthStart).length;
        const remaining = Math.max(0, limit - used);
        return (
          <div
            className={`text-xs rounded-lg px-3 py-2 mb-4 ${
              remaining === 0 ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
            }`}
          >
            <span className="flex items-center gap-2">
              {t("receipts.scansRemaining", {
                count: remaining,
                limit,
                defaultValue: `{{count}} of {{limit}} receipt scans left this month`,
              })}
              {remaining === 0 && <UpgradeLink />}
            </span>
          </div>
        );
      })()}



      {/* Search + filters */}
      <div className="mb-4 space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("receipts.searchPlaceholder", { defaultValue: "Search store, items or notes" })}
              className="w-full bg-card border border-border rounded-xl pl-9 pr-3 py-2 text-sm"
            />
          </div>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`rounded-xl border px-3 py-2 text-sm flex items-center gap-1.5 ${showFilters || filtersActive ? "border-primary text-primary" : "border-border text-muted-foreground"}`}
            aria-label={t("receipts.filters", { defaultValue: "Filters" })}
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>

        {showFilters && (
          <div className="bg-card border border-border rounded-xl p-3 grid grid-cols-2 gap-2">
            <label className="text-xs text-muted-foreground col-span-2">
              {t("receipts.filterStore", { defaultValue: "Store" })}
              <select
                value={store}
                onChange={(e) => setStore(e.target.value)}
                className="mt-1 w-full bg-background border border-border rounded-lg px-2 py-2 text-sm text-foreground"
              >
                <option value="">{t("receipts.allStores", { defaultValue: "All stores" })}</option>
                {storeOptions.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label className="text-xs text-muted-foreground col-span-2">
              {t("receipts.filterMonth", { defaultValue: "Month" })}
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="mt-1 w-full bg-background border border-border rounded-lg px-2 py-2 text-sm text-foreground"
              />
            </label>
            <label className="text-xs text-muted-foreground">
              {t("receipts.filterMin", { defaultValue: "Min $" })}
              <input
                type="number" inputMode="decimal" min="0" value={minTotal}
                onChange={(e) => setMinTotal(e.target.value)}
                className="mt-1 w-full bg-background border border-border rounded-lg px-2 py-2 text-sm text-foreground"
              />
            </label>
            <label className="text-xs text-muted-foreground">
              {t("receipts.filterMax", { defaultValue: "Max $" })}
              <input
                type="number" inputMode="decimal" min="0" value={maxTotal}
                onChange={(e) => setMaxTotal(e.target.value)}
                className="mt-1 w-full bg-background border border-border rounded-lg px-2 py-2 text-sm text-foreground"
              />
            </label>
          </div>
        )}

        {filtersActive && (
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {t("receipts.filterSummary", {
                count: filtered.length,
                total: fmtMoney(filteredTotal, filtered[0]?.currency ?? "USD"),
                defaultValue: "{{count}} receipts · {{total}}",
              })}
            </span>
            <button onClick={clearFilters} className="text-primary font-medium">
              {t("receipts.clearFilters", { defaultValue: "Clear" })}
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 animate-fade-in">
          <Receipt className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">{t("receipts.noReceiptsYet")}</p>
          <p className="text-xs text-muted-foreground mt-1">{t("receipts.tapAddHint")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((r, i) => (
            <div
              key={r.id}
              className="group bg-card rounded-2xl border border-border overflow-hidden text-left animate-slide-up hover:border-primary/50 transition-colors relative"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <button
                onClick={() => setReceiptToDelete(r)}
                className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-black/50 text-white opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                aria-label={t("receipts.deleteReceiptAria")}
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => openViewer(r)}
                className="w-full text-left"
              >
                <div className="aspect-[3/4] bg-muted relative overflow-hidden">
                  {signedUrls[r.image_path] ? (
                    <img src={signedUrls[r.image_path]} alt={r.store} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
                  )}
                </div>
                <div className="p-2.5">
                  <p className="text-sm font-medium truncate">{r.store || t("receipts.unknownStore")}</p>
                  <p className="text-xs text-muted-foreground">{fmtDate(r.purchase_date, t("receipts.dateUnknown"))}</p>
                  <p className="text-xs font-semibold text-primary mt-0.5">{fmtMoney(r.total, r.currency)}</p>
                </div>
              </button>
            </div>
          ))}
        </div>
      )}

      {upgradeDialog}

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
            <DialogTitle className="font-serif">{viewer?.store || t("receipts.receiptSingular")}</DialogTitle>
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
                <div><p className="text-xs uppercase text-muted-foreground">{t("receipts.date")}</p><p>{fmtDate(viewer.purchase_date, t("receipts.dateUnknown"))}</p></div>
                <div><p className="text-xs uppercase text-muted-foreground">{t("receipts.total")}</p><p className="font-semibold">{fmtMoney(viewer.total, viewer.currency)}</p></div>
              </div>
              {viewer.items_summary && (
                <div><p className="text-xs uppercase text-muted-foreground">{t("receipts.items")}</p><p className="text-sm">{viewer.items_summary}</p></div>
              )}
              {viewer.notes && (
                <div><p className="text-xs uppercase text-muted-foreground">{t("receipts.notes")}</p><p className="text-sm">{viewer.notes}</p></div>
              )}
              {viewer.added_by && <p className="text-xs text-muted-foreground">{t("receipts.addedBy", { name: viewer.added_by })}</p>}
            </div>
          )}
          <DialogFooter className="sm:justify-between gap-2">
            <button
              onClick={() => viewer && setReceiptToDelete(viewer)}
              className="flex items-center gap-1.5 text-destructive text-sm px-3 py-2 rounded-xl hover:bg-destructive/10"
            >
              <Trash2 className="w-4 h-4" /> {t("receipts.delete")}
            </button>
            <button
              onClick={() => { setViewer(null); setViewerUrl(null); }}
              className="bg-secondary text-secondary-foreground rounded-xl px-4 py-2 text-sm"
            >
              {t("receipts.close")}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!receiptToDelete} onOpenChange={(o) => { if (!o) setReceiptToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif">{t("receipts.deleteReceiptTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("receipts.deleteReceiptDescription", { store: receiptToDelete?.store || t("receipts.thisStore") })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setReceiptToDelete(null)}>{t("receipts.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => receiptToDelete && void deleteReceipt(receiptToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("receipts.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
  const { t } = useTranslation();
  const cameraInput = useRef<HTMLInputElement>(null);
  const libraryInput = useRef<HTMLInputElement>(null);
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
        toast({ title: t("receipts.couldntReadReceipt"), description: t("receipts.fillManually") });
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
      toast({ title: t("receipts.couldntProcessImage"), variant: "destructive" });
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
      toast({ title: t("receipts.receiptSaved") });
      reset();
      onClose();
    } catch (e: any) {
      console.error(e);
      toast({ title: t("receipts.couldntSaveReceipt"), description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif">{t("receipts.addReceipt")}</DialogTitle>
        </DialogHeader>

        {stage === "pick" && (
          <div className="space-y-3">
            <input
              ref={cameraInput}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); }}
            />
            <input
              ref={libraryInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); }}
            />
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => cameraInput.current?.click()}
                className="flex flex-col items-center justify-center gap-2 bg-primary text-primary-foreground rounded-2xl py-8 hover:opacity-90"
              >
                <Camera className="w-7 h-7" />
                <span className="text-sm font-medium">{t("receipts.takePhoto")}</span>
              </button>
              <button
                onClick={() => libraryInput.current?.click()}
                className="flex flex-col items-center justify-center gap-2 bg-secondary text-secondary-foreground rounded-2xl py-8 hover:opacity-90 border border-border"
              >
                <ImageIcon className="w-7 h-7" />
                <span className="text-sm font-medium">{t("receipts.fromLibrary")}</span>
              </button>
            </div>
            <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
              <Sparkles className="w-3 h-3" /> {t("receipts.aiFillHint")}
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
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> {t("receipts.readingWithAi")}
              </div>
            )}

            <div className="space-y-2">
              <label className="block">
                <span className="text-xs uppercase text-muted-foreground flex items-center gap-1"><Store className="w-3 h-3" />{t("receipts.store")}</span>
                <input className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm mt-1" value={form.store} onChange={(e) => setForm(f => ({ ...f, store: e.target.value }))} placeholder={t("receipts.storePlaceholder")} />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="text-xs uppercase text-muted-foreground flex items-center gap-1"><CalIcon className="w-3 h-3" />{t("receipts.date")}</span>
                  <input type="date" className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm mt-1" value={form.purchase_date} onChange={(e) => setForm(f => ({ ...f, purchase_date: e.target.value }))} />
                </label>
                <label className="block">
                  <span className="text-xs uppercase text-muted-foreground flex items-center gap-1"><DollarSign className="w-3 h-3" />{t("receipts.total")}</span>
                  <input type="number" inputMode="decimal" step="0.01" className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm mt-1" value={form.total} onChange={(e) => setForm(f => ({ ...f, total: e.target.value }))} placeholder="0.00" />
                </label>
              </div>
              <label className="block">
                <span className="text-xs uppercase text-muted-foreground">{t("receipts.items")}</span>
                <input className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm mt-1" value={form.items_summary} onChange={(e) => setForm(f => ({ ...f, items_summary: e.target.value }))} placeholder={t("receipts.itemsPlaceholder")} />
              </label>
              <label className="block">
                <span className="text-xs uppercase text-muted-foreground">{t("receipts.notes")}</span>
                <textarea rows={2} className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm mt-1" value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} placeholder={t("receipts.notesPlaceholder")} />
              </label>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {stage === "review" && (
            <button onClick={reset} className="bg-secondary text-secondary-foreground rounded-xl px-3 py-2 text-sm">{t("receipts.retake")}</button>
          )}
          <button onClick={() => { reset(); onClose(); }} className="rounded-xl px-3 py-2 text-sm hover:bg-muted">{t("receipts.cancel")}</button>
          {stage === "review" && (
            <button
              onClick={save}
              disabled={saving || analyzing || !imageBlob}
              className="bg-primary text-primary-foreground rounded-xl px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5"
            >
              {saving && <Loader2 className="w-3 h-3 animate-spin" />}
              {t("receipts.saveReceipt")}
            </button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
