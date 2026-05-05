import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Camera, ClipboardList, ShieldCheck, BookOpen, Loader2 } from "lucide-react";

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

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

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
          <EmptySection
            icon={<BookOpen className="h-10 w-10" />}
            title="Bautagebuch"
            description="Tägliche Einträge zu Wetter, Personal, Leistung und Vorkommnissen."
          />
        </TabsContent>
      </Tabs>
    </AppShell>
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