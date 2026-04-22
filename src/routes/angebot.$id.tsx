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
import { getRecognition, parseTranscript } from "@/lib/voice";
import { generateQuotePdf } from "@/lib/pdf";
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
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<ReturnType<typeof getRecognition>>(null);

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

  const startListening = () => {
    const rec = getRecognition();
    if (!rec) {
      toast.error("Spracherkennung wird in diesem Browser nicht unterstützt. Bitte Chrome verwenden.");
      return;
    }
    recognitionRef.current = rec;
    setListening(true);
    rec.onresult = (e: any) => {
      const transcript: string = e.results[0][0].transcript;
      const parsed = parseTranscript(transcript);
      addItem(newItem(parsed));
      toast.success(`Erkannt: "${transcript}"`);
    };
    rec.onerror = (e: any) => {
      toast.error(`Fehler: ${e.error ?? "unbekannt"}`);
      setListening(false);
    };
    rec.onend = () => setListening(false);
    try {
      rec.start();
    } catch {
      setListening(false);
    }
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
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
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Übersicht
        </Link>
        <div className="flex gap-2 items-center">
          <Select
            value={quote.status ?? "draft"}
            onValueChange={(v) => update({ status: v as QuoteStatus })}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(STATUS_LABELS) as QuoteStatus[]).map((s) => (
                <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => save()} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Speichern
          </Button>
          <Button onClick={exportPdf}>
            <Printer className="h-4 w-4 mr-2" /> PDF & Drucken
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 mb-8">
        <section className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Kunde</h2>
          <div className="space-y-2">
            <Label htmlFor="cn">Name</Label>
            <Input
              id="cn"
              value={quote.customer_name}
              onChange={(e) => update({ customer_name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ca">Adresse</Label>
            <Textarea
              id="ca"
              rows={3}
              placeholder="Straße&#10;PLZ Ort"
              value={quote.customer_address ?? ""}
              onChange={(e) => update({ customer_address: e.target.value })}
            />
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Projekt</h2>
          <div className="space-y-2">
            <Label htmlFor="pn">Bezeichnung</Label>
            <Input
              id="pn"
              value={quote.project_name}
              onChange={(e) => update({ project_name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Anmerkungen</Label>
            <Textarea
              id="notes"
              rows={3}
              value={quote.notes ?? ""}
              onChange={(e) => update({ notes: e.target.value })}
            />
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="p-6 border-b border-border flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Positionen</h2>
          <div className="flex gap-2">
            <Button
              variant={listening ? "destructive" : "outline"}
              size="sm"
              onClick={listening ? stopListening : startListening}
            >
              {listening ? (
                <>
                  <MicOff className="h-4 w-4 mr-2 animate-pulse" /> Stop
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4 mr-2" /> Sprache
                </>
              )}
            </Button>
            <Button size="sm" onClick={() => addItem()}>
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
                <div className="col-span-4 md:col-span-2 space-y-1">
                  <Label className="text-xs text-muted-foreground">Menge</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={item.quantity}
                    onChange={(e) => updateItem(item.id, { quantity: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="col-span-4 md:col-span-1 space-y-1">
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
                <div className="col-span-4 md:col-span-2 space-y-1">
                  <Label className="text-xs text-muted-foreground">Preis (€)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={item.price}
                    onChange={(e) => updateItem(item.id, { price: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="col-span-10 md:col-span-1 text-right font-medium tabular-nums">
                  {formatEUR(item.quantity * item.price)}
                </div>
                <button
                  onClick={() => removeItem(item.id)}
                  className="col-span-2 md:col-span-1 justify-self-end p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground"
                  aria-label="Position löschen"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
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
    </AppShell>
  );
}