import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const onSignOut = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border sticky top-0 z-40 bg-background/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2">
          <Link to="/" className="font-mono tracking-[0.3em] text-sm shrink-0">
            AETHER
          </Link>
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <span className="text-xs text-muted-foreground hidden sm:block">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={onSignOut} className="px-2 sm:px-3">
              <LogOut className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Abmelden</span>
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8">{children}</main>
    </div>
  );
}