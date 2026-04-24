import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { calcTotal, formatEUR, STATUS_LABELS, UNITS, type Quote, type QuoteItem, type QuoteStatus } from "@/lib/types";
import { generateQuotePdf } from "@/lib/pdf";
import { useAudioRecorder } from "@/hooks/use-audio-recorder";
import { VoiceHero } from "@/components/VoiceHero";
import {
  ArrowLeft,
  ImagePlus,
  Loader2,
  Mic,
  MicOff,
  Plus,
  Printer,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/angebot/$id")({
  component: QuoteEditor,
});

function newItem(partial?: Partial<QuoteItem>): QuoteItem {
  return {
    id: crypto.randomUUID(),
    description: "",
    quantity: 1,
    unit: "Stk",
    price: 0,
    ...partial,
  };
}

function QuoteEditor() {
  const { id } = Route.useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});
  const [walkTalkOpen, setWalkTalkOpen] = useState(false);
  const [processingDictation, setProcessingDictation] = useState(false);
  const [activeFieldKey, setActiveFieldKey] = useState<string | null>(null);
  const fieldApplyRef = useRef<((text: string) => void) | null>(null);
  const recorder = useAudioRecorder();

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from("quotes")
        .select("*")
        .eq("id", id)
        .single();
      if (!active) return;
      if (error || !data) {
        toast.error("Angebot nicht gefunden");
        navigate({ to: "/" });
        return;
      }
      setQuote(data as unknown as Quote);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [id, user, navigate]);

  const total = useMemo(() => (quote ? calcTotal(quote.items) : 0), [quote]);

  // Sign URLs for any item photos so we can preview them
  useEffect(() => {
    if (!quote) return;
    const paths = quote.items.map((i) => i.photo_path).filter((p): p is string => !!p);
    if (paths.length === 0) return;
    let active = true;
    (async () => {
      const entries: [string, string][] = [];
      for (const p of paths) {
        if (photoUrls[p]) {
          entries.push([p, photoUrls[p]]);
          continue;
        }
        const { data } = await supabase.storage
          .from("quote-photos")
          .createSignedUrl(p, 60 * 60);
        if (data?.signedUrl) entries.push([p, data.signedUrl]);
      }
      if (active && entries.length) {
        setPhotoUrls((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quote?.items.map((i) => i.photo_path).join("|")]);

  const uploadPhoto = async (itemId: string, file: File) => {
    if (!user || !quote) return;
    setUploadingId(itemId);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user.id}/${quote.id}/${itemId}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("quote-photos")
      .upload(path, file, { upsert: true, contentType: file.type });
    setUploadingId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    // remove old photo if any
    const old = quote.items.find((i) => i.id === itemId)?.photo_path;
    if (old) await supabase.storage.from("quote-photos").remove([old]);
    updateItem(itemId, { photo_path: path });
    toast.success("Foto hinzugefügt");
  };

  const removePhoto = async (itemId: string) => {
    const path = quote?.items.find((i) => i.id === itemId)?.photo_path;
    if (path) await supabase.storage.from("quote-photos").remove([path]);
    updateItem(itemId, { photo_path: null });
  };

  const update = (patch: Partial<Quote>) => {
    setQuote((q) => (q ? { ...q, ...patch } : q));
  };

  const updateItem = (itemId: string, patch: Partial<QuoteItem>) => {
    setQuote((q) =>
      q
        ? { ...q, items: q.items.map((it) => (it.id === itemId ? { ...it, ...patch } : it)) }
        : q,
    );
  };

  const addItem = (item?: QuoteItem) => {
    setQuote((q) => (q ? { ...q, items: [...q.items, item ?? newItem()] } : q));
  };

  const removeItem = (itemId: string) => {
    setQuote((q) => (q ? { ...q, items: q.items.filter((it) => it.id !== itemId) } : q));
  };

  const save = async (silent = false) => {
    if (!quote) return;
    setSaving(true);
    const { error } = await supabase
      .from("quotes")
      .update({
        customer_name: quote.customer_name,
        customer_address: quote.customer_address,
        project_name: quote.project_name,
        notes: quote.notes,
        items: quote.items as unknown as never,
        status: quote.status,
        total,
      })
      .eq("id", quote.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return false;
    }
    if (!silent) toast.success("Gespeichert");
    return true;
  };

  const exportPdf = async () => {
    if (!quote) return;
    const ok = await save(true);
    if (!ok) return;
    generateQuotePdf({ ...quote, total }, true);
  };

  const transcribeBlob = async (blob: Blob): Promise<string> => {
    const fd = new FormData();
    fd.append("audio", blob, "audio.webm");
    const res = await fetch("/api/transcribe", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Transkription fehlgeschlagen");
    return (data.text ?? "").trim();
  };

  // Walk-&-Talk: record → transcribe → AI extracts multiple positions
  const startWalkTalk = async () => {
    setWalkTalkOpen(true);
    await recorder.start();
    if (recorder.error) toast.error(recorder.error);
  };

  const finishWalkTalk = async () => {
    const blob = await recorder.stop();
    if (!blob) {
      setWalkTalkOpen(false);
      return;
    }
    setProcessingDictation(true);
    try {
      const text = await transcribeBlob(blob);
      if (!text) {
        toast.error("Keine Sprache erkannt");
        return;
      }
      const res = await fetch("/api/parse-positions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "AI-Verarbeitung fehlgeschlagen");
        return;
      }
      const items: Array<{ description: string; quantity: number; unit: string; price: number }> =
        data.items ?? [];
      if (items.length === 0) {
        toast.warning("Keine Positionen erkannt");
      } else {
        setQuote((q) =>
          q ? { ...q, items: [...q.items, ...items.map((it) => newItem(it))] } : q,
        );
        if (data.notes) {
          setQuote((q) =>
            q ? { ...q, notes: q.notes ? q.notes + "\n" + data.notes : data.notes } : q,
          );
        }
        toast.success(`${items.length} Position${items.length === 1 ? "" : "en"} erkannt`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Fehler");
    } finally {
      setProcessingDictation(false);
      setWalkTalkOpen(false);
    }
  };

  const cancelWalkTalk = () => {
    recorder.cancel();
    setWalkTalkOpen(false);
  };

  // Single-field dictation (Kunde, Adresse, Projekt, Anmerkungen)
  const startFieldDictation = async (
    fieldKey: string,
    apply: (text: string) => void,
  ) => {
    setActiveFieldKey(fieldKey);
    fieldApplyRef.current = apply;
    await recorder.start();
    if (recorder.error) {
      toast.error(recorder.error);
      setActiveFieldKey(null);
    }
  };

  const stopFieldDictation = async () => {
    const apply = fieldApplyRef.current;
    fieldApplyRef.current = null;
    const blob = await recorder.stop();
    setActiveFieldKey(null);
    if (!blob || !apply) return;
    setProcessingDictation(true);
    try {
      const text = await transcribeBlob(blob);
      if (text) apply(text);
      else toast.error("Keine Sprache erkannt");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Fehler");
    } finally {
      setProcessingDictation(false);
    }
  };

  const MicButton = ({
    fieldKey,
    onText,
    className,
  }: {
    fieldKey: string;
    onText: (text: string) => void;
    className?: string;
  }) => {
    const active = activeFieldKey === fieldKey;
    const busy = processingDictation && activeFieldKey === null;
    return (
      <button
        type="button"
        disabled={busy || (activeFieldKey !== null && !active)}
        onClick={() => (active ? stopFieldDictation() : startFieldDictation(fieldKey, onText))}
        className={
          "p-2 rounded-md hover:bg-muted transition-colors disabled:opacity-50 " +
          (active ? "text-destructive" : "text-muted-foreground") +
          (className ? " " + className : "")
        }
        aria-label={active ? "Aufnahme stoppen" : "Diktieren"}
      >
        {active ? (
          <MicOff className="h-4 w-4 animate-pulse" />
        ) : busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Mic className="h-4 w-4" />
        )}
      </button>
    );
  };

  if (authLoading || loading || !quote) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <AppShell>
      <VoiceHero />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors self-start"
        >
          <ArrowLeft className="h-4 w-4" /> Übersicht
        </Link>
        <div className="flex gap-2 items-center flex-wrap">
          <Select
            value={quote.status ?? "draft"}
            onValueChange={(v) => update({ status: v as QuoteStatus })}
          >
            <SelectTrigger className="w-[140px] sm:w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(STATUS_LABELS) as QuoteStatus[]).map((s) => (
                <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => save()} disabled={saving} className="px-3">
            {saving ? <Loader2 className="h-4 w-4 sm:mr-2 animate-spin" /> : <Save className="h-4 w-4 sm:mr-2" />}
            <span className="hidden sm:inline">Speichern</span>
          </Button>
          <Button onClick={exportPdf} className="px-3">
            <Printer className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">PDF & Drucken</span>
            <span className="sm:hidden">PDF</span>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 mb-8">
        <section className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Kunde</h2>
          <div className="space-y-2">
            <Label htmlFor="cn">Name</Label>
            <div className="flex gap-2">
              <Input
                id="cn"
                value={quote.customer_name}
                onChange={(e) => update({ customer_name: e.target.value })}
              />
              <MicButton
                fieldKey="customer_name"
                onText={(t) => update({ customer_name: t })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ca">Adresse</Label>
            <div className="flex gap-2">
              <Textarea
                id="ca"
                rows={3}
                placeholder="Straße&#10;PLZ Ort"
                value={quote.customer_address ?? ""}
                onChange={(e) => update({ customer_address: e.target.value })}
              />
              <MicButton
                fieldKey="customer_address"
                onText={(t) =>
                  update({
                    customer_address: quote.customer_address
                      ? quote.customer_address + "\n" + t
                      : t,
                  })
                }
                className="self-start"
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Projekt</h2>
          <div className="space-y-2">
            <Label htmlFor="pn">Bezeichnung</Label>
            <div className="flex gap-2">
              <Input
                id="pn"
                value={quote.project_name}
                onChange={(e) => update({ project_name: e.target.value })}
              />
              <MicButton
                fieldKey="project_name"
                onText={(t) => update({ project_name: t })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Anmerkungen</Label>
            <div className="flex gap-2">
              <Textarea
                id="notes"
                rows={3}
                value={quote.notes ?? ""}
                onChange={(e) => update({ notes: e.target.value })}
              />
              <MicButton
                fieldKey="notes"
                onText={(t) =>
                  update({ notes: quote.notes ? quote.notes + " " + t : t })
                }
                className="self-start"
              />
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-border flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Positionen</h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={startWalkTalk}
              disabled={walkTalkOpen || processingDictation}
            >
              <Mic className="h-4 w-4 mr-2" /> Erneut diktieren
            </Button>
            <Button size="sm" variant="ghost" onClick={() => addItem()}>
              <Plus className="h-4 w-4 mr-2" /> Position
            </Button>
          </div>
        </div>

        {quote.items.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            Noch keine Positionen. Sage z. B. <em>"5 Meter Kabel zu 12,50 Euro"</em> oder füge manuell hinzu.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {quote.items.map((item, idx) => (
              <div key={item.id} className="p-4 grid grid-cols-12 gap-3 items-end">
                <div className="col-span-12 md:col-span-5 space-y-1">
                  <Label className="text-xs text-muted-foreground">#{idx + 1} Beschreibung</Label>
                  <Input
                    value={item.description}
                    onChange={(e) => updateItem(item.id, { description: e.target.value })}
                    placeholder="Leistung / Material"
                  />
                </div>
                <div className="col-span-6 md:col-span-2 space-y-1">
                  <Label className="text-xs text-muted-foreground">Menge</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={item.quantity}
                    onChange={(e) => updateItem(item.id, { quantity: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="col-span-6 md:col-span-1 space-y-1">
                  <Label className="text-xs text-muted-foreground">Einheit</Label>
                  <Select
                    value={item.unit}
                    onValueChange={(v) => updateItem(item.id, { unit: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {UNITS.map((u) => (
                        <SelectItem key={u} value={u}>{u}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-6 md:col-span-2 space-y-1">
                  <Label className="text-xs text-muted-foreground">Preis (€)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={item.price}
                    onChange={(e) => updateItem(item.id, { price: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="col-span-6 md:col-span-1 text-right font-medium tabular-nums self-center">
                  {formatEUR(item.quantity * item.price)}
                </div>
                <div className="col-span-12 md:col-span-1 justify-self-end flex gap-1">
                  <input
                    ref={(el) => {
                      fileInputs.current[item.id] = el;
                    }}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadPhoto(item.id, f);
                      e.target.value = "";
                    }}
                  />
                  <button
                    onClick={() => fileInputs.current[item.id]?.click()}
                    className="p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground"
                    aria-label="Foto hinzufügen"
                    disabled={uploadingId === item.id}
                  >
                    {uploadingId === item.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ImagePlus className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground"
                    aria-label="Position löschen"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {item.photo_path && (
                  <div className="col-span-12 mt-2">
                    <div className="relative inline-block">
                      {photoUrls[item.photo_path] ? (
                        <img
                          src={photoUrls[item.photo_path]}
                          alt={`Foto ${idx + 1}`}
                          className="h-32 w-32 object-cover rounded-lg border border-border"
                        />
                      ) : (
                        <div className="h-32 w-32 rounded-lg border border-border bg-muted flex items-center justify-center">
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        </div>
                      )}
                      <button
                        onClick={() => removePhoto(item.id)}
                        className="absolute -top-2 -right-2 p-1 rounded-full bg-background border border-border shadow hover:bg-muted"
                        aria-label="Foto entfernen"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="p-6 border-t border-border flex items-center justify-between bg-muted/30">
          <span className="text-sm text-muted-foreground">Gesamtsumme</span>
          <span className="text-3xl font-semibold tracking-tight tabular-nums">
            {formatEUR(total)}
          </span>
        </div>
      </section>

      <p className="mt-4 text-xs text-muted-foreground text-right">
        Gemäß § 19 UStG wird keine Umsatzsteuer berechnet (Kleinunternehmer).
      </p>

      {walkTalkOpen && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 text-center space-y-6 shadow-2xl">
            <div>
              <h3 className="text-xl font-semibold mb-2">Walk &amp; Talk</h3>
              <p className="text-sm text-muted-foreground">
                Beschreibe alle Positionen frei – z. B. <em>"Wandanstrich Wohnzimmer 25 Quadratmeter, weiße Dispersion, 18,90 pro Quadratmeter. Dann sechs Steckdosen tauschen, 35 Euro pro Stück."</em>
              </p>
            </div>

            <div className="flex flex-col items-center gap-4 py-4">
              {processingDictation ? (
                <>
                  <Loader2 className="h-16 w-16 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">KI extrahiert Positionen…</p>
                </>
              ) : recorder.isRecording ? (
                <>
                  <div className="relative">
                    <div className="absolute inset-0 bg-destructive/30 rounded-full animate-ping" />
                    <div className="relative h-20 w-20 rounded-full bg-destructive flex items-center justify-center">
                      <Mic className="h-10 w-10 text-destructive-foreground" />
                    </div>
                  </div>
                  <p className="text-sm font-medium">Aufnahme läuft…</p>
                </>
              ) : (
                <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
              )}
            </div>

            <div className="flex gap-2 justify-center">
              <Button variant="ghost" onClick={cancelWalkTalk} disabled={processingDictation}>
                Abbrechen
              </Button>
              <Button
                onClick={finishWalkTalk}
                disabled={!recorder.isRecording || processingDictation}
              >
                <MicOff className="h-4 w-4 mr-2" /> Fertig &amp; auswerten
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}