import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Loader2, Check, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — AETHER" },
      { name: "description", content: "Nutzer verwalten und freischalten." },
    ],
  }),
  component: AdminPage,
});

type ProfileRow = {
  id: string;
  email: string | null;
  approved: boolean;
  created_at: string;
};

function AdminPage() {
  const { user, loading, isAdmin, profileLoading } = useAuth();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  useEffect(() => {
    if (loading || profileLoading) return;
    if (!user) navigate({ to: "/login" });
    else if (!isAdmin) navigate({ to: "/" });
  }, [user, loading, isAdmin, profileLoading, navigate]);

  const load = useCallback(async () => {
    setLoadingList(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id,email,approved,created_at")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setProfiles((data ?? []) as ProfileRow[]);
    setLoadingList(false);
  }, []);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  const setApproved = async (id: string, approved: boolean) => {
    const { error } = await supabase.from("profiles").update({ approved }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(approved ? "Nutzer freigeschaltet" : "Zugang entzogen");
    setProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, approved } : p)));
  };

  if (loading || profileLoading || !isAdmin) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  const pending = profiles.filter((p) => !p.approved);
  const active = profiles.filter((p) => p.approved);

  return (
    <AppShell>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Nutzerverwaltung</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Neue Registrierungen freischalten oder Zugang entziehen.
          </p>
        </div>

        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Wartet auf Freigabe ({pending.length})
          </h2>
          {loadingList ? (
            <div className="py-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : pending.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Keine offenen Anfragen.</p>
          ) : (
            <div className="rounded-xl border border-border overflow-hidden">
              {pending.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-4 border-b border-border last:border-b-0 bg-card">
                  <div>
                    <div className="font-medium">{p.email ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">
                      Registriert am {new Date(p.created_at).toLocaleDateString("de-DE")}
                    </div>
                  </div>
                  <Button size="sm" onClick={() => setApproved(p.id, true)}>
                    <Check className="h-4 w-4 mr-1.5" /> Freischalten
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Freigeschaltet ({active.length})
          </h2>
          {active.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Noch keine freigeschalteten Nutzer.</p>
          ) : (
            <div className="rounded-xl border border-border overflow-hidden">
              {active.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-4 border-b border-border last:border-b-0 bg-card">
                  <div>
                    <div className="font-medium">{p.email ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">
                      Seit {new Date(p.created_at).toLocaleDateString("de-DE")}
                    </div>
                  </div>
                  {p.id !== user?.id && (
                    <Button size="sm" variant="ghost" onClick={() => setApproved(p.id, false)}>
                      <X className="h-4 w-4 mr-1.5" /> Sperren
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}