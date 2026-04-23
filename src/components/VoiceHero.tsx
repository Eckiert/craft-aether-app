import { Mic, Sparkles, Loader2 } from "lucide-react";

interface VoiceHeroProps {
  /** Triggered when the user wants to start dictating positions. */
  onStart: () => void;
  /** Disable interaction (e.g. while a recording / processing flow is active). */
  disabled?: boolean;
  /** Show a subtle "processing" hint instead of the idle CTA. */
  busy?: boolean;
  /** Compact variant for the dashboard / overview page. */
  variant?: "full" | "compact";
}

/**
 * Voice-first hero banner. Visually anchors the app's unique value proposition:
 * "Sprich – wir tippen." Designed to be the first thing users notice on the
 * overview page and on top of the quote editor so the AI dictation feature
 * never feels hidden behind a small icon.
 */
export function VoiceHero({ onStart, disabled, busy, variant = "full" }: VoiceHeroProps) {
  const isCompact = variant === "compact";

  // Rotating example sentences spoken by tradespeople.
  const examples = [
    "„25 m² Wandanstrich, weiße Dispersion, 18,90 pro m²“",
    "„6 Steckdosen tauschen, 35 Euro pro Stück“",
    "„Pauschal Baustellenreinigung 180 Euro“",
  ];

  return (
    <button
      type="button"
      onClick={onStart}
      disabled={disabled}
      className={
        "group relative w-full overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/15 via-primary/5 to-background text-left transition-all hover:border-primary/60 hover:shadow-[0_0_60px_-15px_var(--color-primary)] disabled:opacity-60 disabled:cursor-not-allowed " +
        (isCompact ? "p-5 sm:p-6" : "p-6 sm:p-10")
      }
    >
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full blur-3xl opacity-40"
        style={{ background: "radial-gradient(circle, var(--color-primary) 0%, transparent 70%)" }}
      />
      <div
        className="pointer-events-none absolute -bottom-32 -left-16 h-72 w-72 rounded-full blur-3xl opacity-25"
        style={{ background: "radial-gradient(circle, var(--color-primary) 0%, transparent 70%)" }}
      />

      <div className="relative flex items-center gap-5 sm:gap-8">
        {/* Animated mic with pulse rings + soundwave bars */}
        <div className="relative shrink-0">
          <span className="absolute inset-0 rounded-full bg-primary/40 voice-pulse-ring" />
          <span
            className="absolute inset-0 rounded-full bg-primary/25 voice-pulse-ring"
            style={{ animationDelay: "0.8s" }}
          />
          <div
            className={
              "relative flex items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/40 transition-transform group-hover:scale-105 " +
              (isCompact ? "h-16 w-16" : "h-20 w-20 sm:h-24 sm:w-24")
            }
          >
            {busy ? (
              <Loader2 className={isCompact ? "h-7 w-7 animate-spin" : "h-9 w-9 animate-spin"} />
            ) : (
              <Mic className={isCompact ? "h-7 w-7" : "h-9 w-9 sm:h-11 sm:w-11"} />
            )}
          </div>

          {/* Soundwave bars */}
          {!isCompact && (
            <div className="absolute -right-10 top-1/2 hidden -translate-y-1/2 items-center gap-1 sm:flex">
              {[0, 0.15, 0.3, 0.1, 0.25].map((delay, i) => (
                <span
                  key={i}
                  className="voice-bar block w-1 rounded-full bg-primary/70"
                  style={{
                    height: `${18 + (i % 3) * 8}px`,
                    animationDelay: `${delay}s`,
                  }}
                />
              ))}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[10px] sm:text-xs uppercase tracking-[0.2em] text-primary">
            <Sparkles className="h-3 w-3" />
            <span>KI-Sprachdiktat</span>
          </div>
          <h2
            className={
              "mt-2 font-semibold tracking-tight " +
              (isCompact ? "text-xl sm:text-2xl" : "text-2xl sm:text-4xl")
            }
          >
            <span className="voice-shimmer-text">Sprich – wir tippen.</span>
          </h2>
          <p
            className={
              "mt-2 text-muted-foreground " + (isCompact ? "text-xs sm:text-sm" : "text-sm sm:text-base")
            }
          >
            Diktiere alle Positionen frei. Die KI erkennt Menge, Einheit und Preis – kein Eintippen mehr.
          </p>

          {!isCompact && (
            <div className="mt-4 hidden h-6 sm:block">
              {examples.map((ex, i) => (
                <p
                  key={i}
                  className="voice-float-word absolute text-sm italic text-foreground/70"
                  style={{
                    animationDelay: `${i * 4}s`,
                    animationDuration: `${examples.length * 4}s`,
                  }}
                >
                  {ex}
                </p>
              ))}
            </div>
          )}
        </div>

        <div
          className={
            "hidden shrink-0 rounded-full border border-primary/40 bg-primary/10 px-4 py-2 text-xs font-medium text-primary transition-all group-hover:bg-primary group-hover:text-primary-foreground sm:block " +
            (isCompact ? "" : "sm:px-5 sm:py-2.5 sm:text-sm")
          }
        >
          {busy ? "Bitte warten…" : "Jetzt diktieren"}
        </div>
      </div>
    </button>
  );
}