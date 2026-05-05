import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Camera, ClipboardList, ShieldCheck, BookOpen, Loader2, Plus, Trash2, HardHat } from "lucide-react";
import { toast } from "sonner";

type Customer = { id: string; name: string };
type Site = {
  id: string;
  name: string;
  address: string | null;
  description: string | null;
  customer_id: string | null;
  created_at: string;
};
type DiaryEntry = {
  id: string;
  site_id: string;
  entry_date: string;
  weather: string | null;
  temperature: string | null;
  personnel: string | null;
  work_performed: string | null;
  incidents: string | null;
  materials: string | null;
  notes: string | null;
  created_at: string;
};

export const Route = createFileRoute("/baustelle")({
  head: () => ({
    meta: [
      { title: "Baustellendokumentation — AETHER" },
      { name: "description", content: "Fotodokumentation, Protokolle, Nachweise & Prüfung, Bautagebuch — alles an einem Ort." },
    ],
  }),
  component: BaustellePage,
});

function BaustellePage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [siteDialogOpen, setSiteDialogOpen] = useState(false);
  const [siteForm, setSiteForm] = useState({ name: "", address: "", customer_id: "", description: "" });
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const emptyEntry = {
    entry_date: today,
    weather: "",
    temperature: "",
    personnel: "",
    work_performed: "",
    incidents: "",
    materials: "",
    notes: "",
  };
  const [entryForm, setEntryForm] = useState(emptyEntry);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const [c, s] = await Promise.all([
        supabase.from("customers").select("id,name").order("name"),
        supabase.from("sites").select("*").order("created_at", { ascending: false }),
      ]);
      if (!active) return;
      if (c.error) toast.error(c.error.message);
      else setCustomers((c.data ?? []) as Customer[]);
      if (s.error) toast.error(s.error.message);
      else {
        const list = (s.data ?? []) as Site[];
        setSites(list);
        if (list.length && !selectedSiteId) setSelectedSiteId(list[0].id);
      }
      setLoadingData(false);
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (!selectedSiteId) {
      setEntries([]);
      return;
    }
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from("site_diary_entries")
        .select("*")
        .eq("site_id", selectedSiteId)
        .order("entry_date", { ascending: false });
      if (!active) return;
      if (error) toast.error(error.message);
      else setEntries((data ?? []) as DiaryEntry[]);
    })();
    return () => {
      active = false;
    };
  }, [selectedSiteId]);

  const createSite = async () => {
    if (!user) return;
    if (!siteForm.name.trim()) return toast.error("Name erforderlich");
    const { data, error } = await supabase
      .from("sites")
      .insert({
        user_id: user.id,
        name: siteForm.name.trim(),
        address: siteForm.address.trim() || null,
        description: siteForm.description.trim() || null,
        customer_id: siteForm.customer_id || null,
      })
      .select()
      .single();
    if (error || !data) return toast.error(error?.message ?? "Fehler");
    setSites((s) => [data as Site, ...s]);
    setSelectedSiteId((data as Site).id);
    setSiteForm({ name: "", address: "", customer_id: "", description: "" });
    setSiteDialogOpen(false);
    toast.success("Baustelle angelegt");
  };

  const deleteSite = async (id: string) => {
    if (!confirm("Baustelle inkl. Bautagebuch wirklich löschen?")) return;
    const { error } = await supabase.from("sites").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setSites((s) => s.filter((x) => x.id !== id));
    if (selectedSiteId === id) setSelectedSiteId(null);
    toast.success("Gelöscht");
  };

  const createEntry = async () => {
    if (!user || !selectedSiteId) return;
    const { data, error } = await supabase
      .from("site_diary_entries")
      .insert({
        user_id: user.id,
        site_id: selectedSiteId,
        entry_date: entryForm.entry_date,
        weather: entryForm.weather || null,
        temperature: entryForm.temperature || null,
        personnel: entryForm.personnel || null,
        work_performed: entryForm.work_performed || null,
        incidents: entryForm.incidents || null,
        materials: entryForm.materials || null,
        notes: entryForm.notes || null,
      })
      .select()
      .single();
    if (error || !data) return toast.error(error?.message ?? "Fehler");
    setEntries((e) => [data as DiaryEntry, ...e]);
    setEntryForm(emptyEntry);
    setEntryDialogOpen(false);
    toast.success("Eintrag gespeichert");
  };

  const deleteEntry = async (id: string) => {
    if (!confirm("Eintrag löschen?")) return;
    const { error } = await supabase.from("site_diary_entries").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setEntries((e) => e.filter((x) => x.id !== id));
  };

  const customerName = (id: string | null) =>
    id ? customers.find((c) => c.id === id)?.name ?? "—" : "—";
  const selectedSite = sites.find((s) => s.id === selectedSiteId) ?? null;

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <AppShell>
      <div className="mb-8 sm:mb-10">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">Baustellendokumentation</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Fotos, Protokolle, Nachweise und Bautagebuch zentral verwalten.
        </p>
      </div>

      <Tabs defaultValue="foto" className="w-full">
        <TabsList className="h-auto flex-wrap gap-1 bg-muted p-1">
          <TabsTrigger value="foto" className="gap-1.5">
            <Camera className="h-3.5 w-3.5" /> Fotodokumentation
          </TabsTrigger>
          <TabsTrigger value="protokolle" className="gap-1.5">
            <ClipboardList className="h-3.5 w-3.5" /> Protokolle
          </TabsTrigger>
          <TabsTrigger value="nachweise" className="gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" /> Nachweise & Prüfung
          </TabsTrigger>
          <TabsTrigger value="tagebuch" className="gap-1.5">
            <BookOpen className="h-3.5 w-3.5" /> Bautagebuch
          </TabsTrigger>
        </TabsList>

        <TabsContent value="foto" className="mt-6">
          <EmptySection
            icon={<Camera className="h-10 w-10" />}
            title="Fotodokumentation"
            description="Lade Baustellenfotos hoch und ordne sie Projekten und Daten zu."
          />
        </TabsContent>
        <TabsContent value="protokolle" className="mt-6">
          <EmptySection
            icon={<ClipboardList className="h-10 w-10" />}
            title="Protokolle"
            description="Erstelle Bau-, Abnahme- und Besprechungsprotokolle."
          />
        </TabsContent>
        <TabsContent value="nachweise" className="mt-6">
          <EmptySection
            icon={<ShieldCheck className="h-10 w-10" />}
            title="Nachweise & Prüfung"
            description="Hinterlege Prüfberichte, Zertifikate und Materialnachweise."
          />
        </TabsContent>
        <TabsContent value="tagebuch" className="mt-6">
          {loadingData ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
              {/* Sites sidebar */}
              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium">Baustellen</h3>
                  <Button size="sm" variant="ghost" onClick={() => setSiteDialogOpen(true)} className="h-7 px-2">
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {sites.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-6 text-center">
                    Noch keine Baustelle.
                  </p>
                ) : (
                  <div className="space-y-1">
                    {sites.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setSelectedSiteId(s.id)}
                        className={`group w-full text-left rounded-lg border px-3 py-2 transition-colors ${
                          s.id === selectedSiteId
                            ? "border-foreground bg-muted"
                            : "border-border hover:border-foreground/30"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">{s.name}</div>
                            <div className="text-[11px] text-muted-foreground truncate">
                              {customerName(s.customer_id)}
                            </div>
                          </div>
                          <Trash2
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteSite(s.id);
                            }}
                            className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0 mt-0.5"
                          />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Entries */}
              <div>
                {!selectedSite ? (
                  <div className="rounded-2xl border border-dashed border-border p-16 text-center">
                    <HardHat className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
                    <h2 className="text-lg font-medium">Baustelle auswählen</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Wähle links eine Baustelle oder lege eine neue an.
                    </p>
                    <Button onClick={() => setSiteDialogOpen(true)} className="mt-6 gap-2">
                      <Plus className="h-4 w-4" /> Neue Baustelle
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div>
                        <h2 className="text-xl font-semibold tracking-tight">{selectedSite.name}</h2>
                        <p className="text-sm text-muted-foreground">
                          Kunde: {customerName(selectedSite.customer_id)}
                          {selectedSite.address ? ` · ${selectedSite.address}` : ""}
                        </p>
                      </div>
                      <Button onClick={() => setEntryDialogOpen(true)} className="gap-2">
                        <Plus className="h-4 w-4" /> Neuer Eintrag
                      </Button>
                    </div>

                    {entries.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-border p-12 text-center">
                        <BookOpen className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
                        <p className="text-sm text-muted-foreground">Noch keine Tagebuch-Einträge.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {entries.map((e) => (
                          <div
                            key={e.id}
                            className="rounded-2xl border border-border bg-card p-5"
                          >
                            <div className="flex items-start justify-between gap-2 mb-3">
                              <div>
                                <div className="text-sm font-medium">
                                  {new Date(e.entry_date).toLocaleDateString("de-DE", {
                                    weekday: "long",
                                    day: "numeric",
                                    month: "long",
                                    year: "numeric",
                                  })}
                                </div>
                                {(e.weather || e.temperature) && (
                                  <div className="text-xs text-muted-foreground mt-0.5">
                                    {[e.weather, e.temperature].filter(Boolean).join(" · ")}
                                  </div>
                                )}
                              </div>
                              <button
                                onClick={() => deleteEntry(e.id)}
                                className="p-1.5 rounded-md hover:bg-muted"
                                aria-label="Löschen"
                              >
                                <Trash2 className="h-4 w-4 text-muted-foreground" />
                              </button>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2 text-sm">
                              <Field label="Personal" value={e.personnel} />
                              <Field label="Material" value={e.materials} />
                              <Field label="Ausgeführte Arbeiten" value={e.work_performed} full />
                              <Field label="Vorkommnisse" value={e.incidents} full />
                              <Field label="Notizen" value={e.notes} full />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Site dialog */}
      <Dialog open={siteDialogOpen} onOpenChange={setSiteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neue Baustelle</DialogTitle>
            <DialogDescription>Lege eine Baustelle an und verknüpfe sie mit einem Kunden.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input
                value={siteForm.name}
                onChange={(e) => setSiteForm({ ...siteForm, name: e.target.value })}
                placeholder="z.B. Neubau Müllerstraße 12"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Kunde</Label>
              <Select
                value={siteForm.customer_id || "none"}
                onValueChange={(v) => setSiteForm({ ...siteForm, customer_id: v === "none" ? "" : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Kunde wählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Kein Kunde —</SelectItem>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {customers.length === 0 && (
                <p className="text-[11px] text-muted-foreground">
                  Noch keine Kunden — lege sie unter „Kunden" an.
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Adresse</Label>
              <Input
                value={siteForm.address}
                onChange={(e) => setSiteForm({ ...siteForm, address: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Beschreibung</Label>
              <Textarea
                value={siteForm.description}
                onChange={(e) => setSiteForm({ ...siteForm, description: e.target.value })}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSiteDialogOpen(false)}>Abbrechen</Button>
            <Button onClick={createSite}>Anlegen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Entry dialog */}
      <Dialog open={entryDialogOpen} onOpenChange={setEntryDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Neuer Tagebuch-Eintrag</DialogTitle>
            <DialogDescription>{selectedSite?.name}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Datum</Label>
              <Input
                type="date"
                value={entryForm.entry_date}
                onChange={(e) => setEntryForm({ ...entryForm, entry_date: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Wetter</Label>
              <Input
                value={entryForm.weather}
                onChange={(e) => setEntryForm({ ...entryForm, weather: e.target.value })}
                placeholder="z.B. sonnig, leicht bewölkt"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Temperatur</Label>
              <Input
                value={entryForm.temperature}
                onChange={(e) => setEntryForm({ ...entryForm, temperature: e.target.value })}
                placeholder="z.B. 18°C"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Personal</Label>
              <Input
                value={entryForm.personnel}
                onChange={(e) => setEntryForm({ ...entryForm, personnel: e.target.value })}
                placeholder="z.B. 3 Maurer, 1 Polier"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Ausgeführte Arbeiten</Label>
              <Textarea
                rows={3}
                value={entryForm.work_performed}
                onChange={(e) => setEntryForm({ ...entryForm, work_performed: e.target.value })}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Material / Geräte</Label>
              <Textarea
                rows={2}
                value={entryForm.materials}
                onChange={(e) => setEntryForm({ ...entryForm, materials: e.target.value })}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Besondere Vorkommnisse</Label>
              <Textarea
                rows={2}
                value={entryForm.incidents}
                onChange={(e) => setEntryForm({ ...entryForm, incidents: e.target.value })}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Notizen</Label>
              <Textarea
                rows={2}
                value={entryForm.notes}
                onChange={(e) => setEntryForm({ ...entryForm, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEntryDialogOpen(false)}>Abbrechen</Button>
            <Button onClick={createEntry}>Speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function Field({ label, value, full }: { label: string; value: string | null; full?: boolean }) {
  if (!value) return null;
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">{label}</div>
      <div className="text-sm whitespace-pre-wrap">{value}</div>
    </div>
  );
}

function EmptySection({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border p-16 text-center">
      <div className="mx-auto mb-4 text-muted-foreground flex justify-center">{icon}</div>
      <h2 className="text-lg font-medium">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">{description}</p>
      <p className="mt-6 text-xs text-muted-foreground">Funktion folgt — sag Bescheid, wenn ich loslegen soll.</p>
    </div>
  );
}