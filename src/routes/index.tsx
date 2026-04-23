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

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight">Angebote</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Erstelle und verwalte deine Kundenangebote.
          </p>
        </div>
        <Button onClick={createNew} size="lg" className="gap-2">
          <Plus className="h-4 w-4" /> Neues Angebot
        </Button>
      </div>

      {loadingQuotes ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : quotes.length === 0 ? (
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
      ) : (
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
      )}
    </AppShell>
  );
}
