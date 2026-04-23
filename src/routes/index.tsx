import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { formatEUR, STATUS_LABELS, STATUS_STYLES, type Quote, type QuoteStatus } from "@/lib/types";
import { Plus, FileText, Trash2, Loader2, ChevronLeft, ChevronRight, LayoutGrid, CalendarDays } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  component: IndexPage,
});

function IndexPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loadingQuotes, setLoadingQuotes] = useState(true);
  const [view, setView] = useState<"calendar" | "grid">("calendar");
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from("quotes")
        .select("*")
        .order("created_at", { ascending: false });
      if (!active) return;
      if (error) toast.error(error.message);
      else setQuotes((data ?? []) as unknown as Quote[]);
      setLoadingQuotes(false);
    })();
    return () => {
      active = false;
    };
  }, [user]);

  const createNew = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("quotes")
      .insert({
        user_id: user.id,
        customer_name: "Neuer Kunde",
        project_name: "Neues Projekt",
        items: [],
        total: 0,
        status: "draft",
      })
      .select()
      .single();
    if (error || !data) {
      toast.error(error?.message ?? "Fehler beim Anlegen");
      return;
    }
    navigate({ to: "/angebot/$id", params: { id: data.id } });
  };

  const remove = async (id: string) => {
    if (!confirm("Angebot wirklich löschen?")) return;
    const { error } = await supabase.from("quotes").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setQuotes((q) => q.filter((x) => x.id !== id));
    toast.success("Gelöscht");
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const STATUS_DOT: Record<QuoteStatus, string> = {
    draft: "bg-muted-foreground/60",
    sent: "bg-blue-400",
    accepted: "bg-green-400",
    rejected: "bg-red-400",
  };

  const dayKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const quotesByDay = useMemo(() => {
    const map = new Map<string, Quote[]>();
    for (const q of quotes) {
      const k = dayKey(new Date(q.created_at));
      const arr = map.get(k);
      if (arr) arr.push(q);
      else map.set(k, [q]);
    }
    return map;
  }, [quotes]);

  const monthLabel = cursor.toLocaleDateString("de-DE", { month: "long", year: "numeric" });
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7; // Mo=0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayKey = dayKey(new Date());

  const cells: Array<{ key: string; day: number | null; date: Date | null }> = [];
  for (let i = 0; i < firstWeekday; i++) cells.push({ key: `empty-${i}`, day: null, date: null });
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    cells.push({ key: dayKey(date), day: d, date });
  }
  while (cells.length % 7 !== 0) cells.push({ key: `tail-${cells.length}`, day: null, date: null });

  const selectedQuotes = selectedDay ? (quotesByDay.get(selectedDay) ?? []) : [];

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight">Angebote</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Erstelle und verwalte deine Kundenangebote.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-border p-0.5">
            <button
              onClick={() => setView("calendar")}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs transition-colors ${view === "calendar" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              aria-label="Kalender-Ansicht"
            >
              <CalendarDays className="h-3.5 w-3.5" /> Kalender
            </button>
            <button
              onClick={() => setView("grid")}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs transition-colors ${view === "grid" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              aria-label="Listen-Ansicht"
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Liste
            </button>
          </div>
          <Button onClick={createNew} size="lg" className="gap-2">
            <Plus className="h-4 w-4" /> Neues Angebot
          </Button>
        </div>
      </div>

      {loadingQuotes ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : quotes.length === 0 && view === "grid" ? (
        <div className="rounded-2xl border border-dashed border-border p-16 text-center">
          <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-lg font-medium">Noch keine Angebote</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Lege dein erstes Angebot an — es dauert nur eine Minute.
          </p>
          <Button onClick={createNew} className="mt-6 gap-2">
            <Plus className="h-4 w-4" /> Erstes Angebot erstellen
          </Button>
        </div>
      ) : view === "grid" ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {quotes.map((q) => (
            <div
              key={q.id}
              className="group relative rounded-2xl border border-border bg-card p-5 hover:border-foreground/30 transition-all"
            >
              <Link
                to="/angebot/$id"
                params={{ id: q.id }}
                className="block"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs text-muted-foreground font-mono">
                    {new Date(q.created_at).toLocaleDateString("de-DE")}
                  </div>
                  <span
                    className={`text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 rounded-full border ${STATUS_STYLES[(q.status ?? "draft") as QuoteStatus]}`}
                  >
                    {STATUS_LABELS[(q.status ?? "draft") as QuoteStatus]}
                  </span>
                </div>
                <h3 className="mt-2 font-medium truncate">{q.project_name}</h3>
                <p className="text-sm text-muted-foreground truncate">{q.customer_name}</p>
                <div className="mt-4 text-2xl font-semibold tracking-tight">
                  {formatEUR(Number(q.total))}
                </div>
              </Link>
              <button
                onClick={() => remove(q.id)}
                className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-2 rounded-md hover:bg-muted transition-all"
                aria-label="Löschen"
              >
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setCursor(new Date(year, month - 1, 1))}
                className="p-2 rounded-md hover:bg-muted transition-colors"
                aria-label="Vorheriger Monat"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-medium capitalize">{monthLabel}</h2>
                <button
                  onClick={() => {
                    const d = new Date();
                    setCursor(new Date(d.getFullYear(), d.getMonth(), 1));
                    setSelectedDay(dayKey(d));
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted"
                >
                  Heute
                </button>
              </div>
              <button
                onClick={() => setCursor(new Date(year, month + 1, 1))}
                className="p-2 rounded-md hover:bg-muted transition-colors"
                aria-label="Nächster Monat"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
              {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((d) => (
                <div key={d} className="text-center py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map((c) => {
                if (!c.date) return <div key={c.key} className="aspect-square" />;
                const dayQuotes = quotesByDay.get(c.key) ?? [];
                const isToday = c.key === todayKey;
                const isSelected = c.key === selectedDay;
                const hasQuotes = dayQuotes.length > 0;
                return (
                  <button
                    key={c.key}
                    onClick={() => setSelectedDay(c.key)}
                    className={`aspect-square rounded-lg border p-1.5 flex flex-col text-left transition-all ${
                      isSelected
                        ? "border-foreground bg-muted"
                        : isToday
                          ? "border-foreground/40 bg-muted/40"
                          : "border-border hover:border-foreground/30"
                    }`}
                  >
                    <span className={`text-xs font-medium ${isToday ? "text-foreground" : "text-muted-foreground"}`}>
                      {c.day}
                    </span>
                    {hasQuotes && (
                      <div className="mt-auto flex flex-wrap gap-0.5">
                        {dayQuotes.slice(0, 4).map((q) => (
                          <span
                            key={q.id}
                            className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[(q.status ?? "draft") as QuoteStatus]}`}
                          />
                        ))}
                        {dayQuotes.length > 4 && (
                          <span className="text-[9px] text-muted-foreground leading-none">
                            +{dayQuotes.length - 4}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-muted-foreground">
              {(Object.keys(STATUS_LABELS) as QuoteStatus[]).map((s) => (
                <div key={s} className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${STATUS_DOT[s]}`} />
                  {STATUS_LABELS[s]}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="text-sm font-medium">
              {selectedDay
                ? new Date(selectedDay).toLocaleDateString("de-DE", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                : "Tag auswählen"}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {selectedDay
                ? `${selectedQuotes.length} ${selectedQuotes.length === 1 ? "Angebot" : "Angebote"}`
                : "Klicke einen Tag im Kalender an."}
            </p>
            <div className="mt-4 space-y-2">
              {selectedDay && selectedQuotes.length === 0 && (
                <div className="text-xs text-muted-foreground py-8 text-center border border-dashed border-border rounded-lg">
                  Keine Angebote an diesem Tag.
                </div>
              )}
              {selectedQuotes.map((q) => (
                <Link
                  key={q.id}
                  to="/angebot/$id"
                  params={{ id: q.id }}
                  className="block rounded-lg border border-border p-3 hover:border-foreground/30 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium truncate">{q.project_name}</span>
                    <span
                      className={`shrink-0 text-[9px] uppercase tracking-wider font-medium px-1.5 py-0.5 rounded-full border ${STATUS_STYLES[(q.status ?? "draft") as QuoteStatus]}`}
                    >
                      {STATUS_LABELS[(q.status ?? "draft") as QuoteStatus]}
                    </span>
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground truncate">
                    {q.customer_name}
                  </div>
                  <div className="mt-1 text-sm font-semibold">{formatEUR(Number(q.total))}</div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
