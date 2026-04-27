import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Customer } from "@/lib/types";
import { Loader2, Plus, Trash2, Pencil, Users, Mail, Phone, MapPin, Search } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/kunden")({
  head: () => ({
    meta: [
      { title: "Kunden — AETHER" },
      { name: "description", content: "Verwalte deine Stammkunden für schnellere Angebote." },
    ],
  }),
  component: CustomersPage,
});

interface FormState {
  name: string;
  address: string;
  email: string;
  phone: string;
  notes: string;
}

const emptyForm: FormState = { name: "", address: "", email: "", phone: "", notes: "" };

function CustomersPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("name", { ascending: true });
      if (!active) return;
      if (error) toast.error(error.message);
      else setCustomers((data ?? []) as Customer[]);
      setLoadingList(false);
    })();
    return () => {
      active = false;
    };
  }, [user]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) =>
      [c.name, c.email, c.address, c.phone].some((v) => v?.toLowerCase().includes(q)),
    );
  }, [customers, search]);

  const openNew = () => {
    setEditId(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (c: Customer) => {
    setEditId(c.id);
    setForm({
      name: c.name,
      address: c.address ?? "",
      email: c.email ?? "",
      phone: c.phone ?? "",
      notes: c.notes ?? "",
    });
    setOpen(true);
  };

  const submit = async () => {
    if (!user) return;
    if (!form.name.trim()) {
      toast.error("Name ist erforderlich");
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      address: form.address.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      notes: form.notes.trim() || null,
    };
    if (editId) {
      const { data, error } = await supabase
        .from("customers")
        .update(payload)
        .eq("id", editId)
        .select()
        .single();
      setSaving(false);
      if (error || !data) return toast.error(error?.message ?? "Fehler");
      setCustomers((cs) => cs.map((c) => (c.id === editId ? (data as Customer) : c)));
      toast.success("Kunde aktualisiert");
    } else {
      const { data, error } = await supabase
        .from("customers")
        .insert({ ...payload, user_id: user.id })
        .select()
        .single();
      setSaving(false);
      if (error || !data) return toast.error(error?.message ?? "Fehler");
      setCustomers((cs) => [...cs, data as Customer].sort((a, b) => a.name.localeCompare(b.name)));
      toast.success("Kunde angelegt");
    }
    setOpen(false);
  };

  const remove = async (id: string) => {
    if (!confirm("Kunde wirklich löschen? Bestehende Angebote bleiben erhalten.")) return;
    const { error } = await supabase.from("customers").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setCustomers((cs) => cs.filter((c) => c.id !== id));
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">Kunden</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Stammkunden anlegen — beim Angebot einfach auswählen.
          </p>
        </div>
        <Button onClick={openNew} size="lg" className="gap-2">
          <Plus className="h-4 w-4" /> Neuer Kunde
        </Button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Suchen nach Name, E-Mail, Adresse…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {loadingList ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : customers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-16 text-center">
          <Users className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-lg font-medium">Noch keine Kunden</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Lege deinen ersten Kunden an, um Angebote schneller zu erstellen.
          </p>
          <Button onClick={openNew} className="mt-6 gap-2">
            <Plus className="h-4 w-4" /> Ersten Kunden anlegen
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-sm text-muted-foreground py-12">
          Keine Treffer für „{search}".
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <div
              key={c.id}
              className="group relative rounded-2xl border border-border bg-card p-5 hover:border-foreground/30 transition-all"
            >
              <h3 className="font-medium truncate pr-16">{c.name}</h3>
              <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                {c.email && (
                  <div className="flex items-center gap-1.5 truncate">
                    <Mail className="h-3 w-3 shrink-0" />
                    <span className="truncate">{c.email}</span>
                  </div>
                )}
                {c.phone && (
                  <div className="flex items-center gap-1.5 truncate">
                    <Phone className="h-3 w-3 shrink-0" />
                    <span className="truncate">{c.phone}</span>
                  </div>
                )}
                {c.address && (
                  <div className="flex items-start gap-1.5">
                    <MapPin className="h-3 w-3 shrink-0 mt-0.5" />
                    <span className="whitespace-pre-line line-clamp-2">{c.address}</span>
                  </div>
                )}
              </div>
              <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => openEdit(c)}
                  className="p-1.5 rounded-md hover:bg-muted"
                  aria-label="Bearbeiten"
                >
                  <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
                <button
                  onClick={() => remove(c.id)}
                  className="p-1.5 rounded-md hover:bg-muted"
                  aria-label="Löschen"
                >
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? "Kunde bearbeiten" : "Neuer Kunde"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="c-name">Name *</Label>
              <Input
                id="c-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Max Mustermann GmbH"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="c-email">E-Mail</Label>
                <Input
                  id="c-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="kontakt@firma.at"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-phone">Telefon</Label>
                <Input
                  id="c-phone"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+43 …"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-addr">Adresse</Label>
              <Textarea
                id="c-addr"
                rows={3}
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="Straße&#10;PLZ Ort"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-notes">Notizen</Label>
              <Textarea
                id="c-notes"
                rows={2}
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Interne Notizen, z. B. Ansprechpartner"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Abbrechen
            </Button>
            <Button onClick={submit} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editId ? "Speichern" : "Anlegen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}