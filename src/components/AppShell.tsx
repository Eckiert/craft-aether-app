import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LogOut, FileText, Users, Settings as SettingsIcon } from "lucide-react";
import { getBauleiterEmail, setBauleiterEmail } from "@/lib/settings";
import { toast } from "sonner";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [emailInput, setEmailInput] = useState("");

  useEffect(() => {
    if (settingsOpen) setEmailInput(getBauleiterEmail());
  }, [settingsOpen]);

  const saveSettings = () => {
    setBauleiterEmail(emailInput);
    toast.success("Einstellungen gespeichert");
    setSettingsOpen(false);
  };

  const onSignOut = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border sticky top-0 z-40 bg-background/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-4 sm:gap-6 min-w-0">
            <Link to="/" className="font-mono tracking-[0.3em] text-sm shrink-0">
              AETHER
            </Link>
            <nav className="flex items-center gap-1">
              <Link
                to="/"
                activeOptions={{ exact: true }}
                activeProps={{ className: "text-foreground bg-muted" }}
                inactiveProps={{ className: "text-muted-foreground hover:text-foreground" }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs sm:text-sm transition-colors"
              >
                <FileText className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Angebote</span>
              </Link>
              <Link
                to="/kunden"
                activeProps={{ className: "text-foreground bg-muted" }}
                inactiveProps={{ className: "text-muted-foreground hover:text-foreground" }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs sm:text-sm transition-colors"
              >
                <Users className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Kunden</span>
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <span className="text-xs text-muted-foreground hidden sm:block">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={() => setSettingsOpen(true)} className="px-2 sm:px-3">
              <SettingsIcon className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Einstellungen</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={onSignOut} className="px-2 sm:px-3">
              <LogOut className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Abmelden</span>
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8">{children}</main>
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Einstellungen</DialogTitle>
            <DialogDescription>
              E-Mail-Adresse des Bauleiters. Beim Klick auf „PDF &amp; Drucken" wird das Standard-Mailprogramm mit dieser Adresse geöffnet.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="bauleiter-email">Bauleiter E-Mail</Label>
            <Input
              id="bauleiter-email"
              type="email"
              placeholder="bauleiter@firma.de"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSettingsOpen(false)}>Abbrechen</Button>
            <Button onClick={saveSettings}>Speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}