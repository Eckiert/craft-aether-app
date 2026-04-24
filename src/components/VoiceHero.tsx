import { FileText, Mic, MicOff, Loader2, Sparkles, Zap } from "lucide-react";

interface VoiceHeroProps {
  onClick?: () => void;
  disabled?: boolean;
  isRecording?: boolean;
  isProcessing?: boolean;
}

export function VoiceHero({
  onClick,
  disabled = false,
  isRecording = false,
  isProcessing = false,
}: VoiceHeroProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="relative mb-8 block w-full overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-5 text-left transition-all hover:border-primary/30 hover:bg-gradient-to-br hover:from-primary/15 hover:via-card hover:to-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-70 sm:mb-10 sm:p-8"
      aria-label={isRecording ? "Sprachaufnahme stoppen" : "Sprachaufnahme starten"}
    >
      <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />

      <div className="relative grid gap-6 md:gap-8 md:grid-cols-[auto_1fr] md:items-center">
        {/* Animated mic */}
        <div className="relative flex items-center justify-center mx-auto md:mx-0">
          <span className="absolute inline-flex h-20 w-20 sm:h-24 sm:w-24 rounded-full bg-primary/30 animate-ping" />
          <span className="absolute inline-flex h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-primary/40 animate-pulse" />
          <div className="relative flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/40">
            <Mic className="h-7 w-7 sm:h-9 sm:w-9" />
          </div>
        </div>

        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-primary">
            <Sparkles className="h-3 w-3" /> KI-Spracherkennung
          </div>
          <h2 className="mt-3 text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight">
            Einfach sprechen — Aether erstellt dein Angebot.
          </h2>
          <p className="mt-2 text-sm md:text-base text-muted-foreground max-w-2xl">
            Kein Tippen, keine Formulare. Diktiere Positionen, Mengen und Preise in
            natürlicher Sprache — die KI strukturiert alles automatisch in dein Angebot.
          </p>

          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-border bg-background/70 px-4 py-2 text-sm font-medium text-foreground shadow-sm">
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                KI verarbeitet Aufnahme…
              </>
            ) : isRecording ? (
              <>
                <MicOff className="h-4 w-4 text-destructive" />
                Tippen zum Stoppen & Auswerten
              </>
            ) : (
              <>
                <Mic className="h-4 w-4 text-primary" />
                Tippen zum Starten von Walk & Talk
              </>
            )}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs text-foreground">
              <Zap className="h-3.5 w-3.5 text-primary" /> Sekundenschnell
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs text-foreground">
              <Mic className="h-3.5 w-3.5 text-primary" /> Freihändig auf der Baustelle
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs text-foreground">
              <FileText className="h-3.5 w-3.5 text-primary" /> Direkt als PDF
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}