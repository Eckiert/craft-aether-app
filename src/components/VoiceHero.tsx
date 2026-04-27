import { Mic, MicOff, Loader2 } from "lucide-react";

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
      className="relative mb-8 flex w-full flex-col items-center justify-center overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-8 transition-all hover:border-primary/30 hover:bg-gradient-to-br hover:from-primary/15 hover:via-card hover:to-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-70 sm:mb-10 sm:p-12"
      aria-label={isRecording ? "Sprachaufnahme stoppen" : "Sprachaufnahme starten"}
    >
      <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />

      {/* Animated mic only — clean & minimal */}
      <div className="relative flex items-center justify-center">
        <span className="absolute inline-flex h-24 w-24 sm:h-28 sm:w-28 rounded-full bg-primary/30 animate-ping" />
        <span className="absolute inline-flex h-20 w-20 sm:h-24 sm:w-24 rounded-full bg-primary/40 animate-pulse" />
        <div className="relative flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/40">
          {isProcessing ? (
            <Loader2 className="h-9 w-9 sm:h-11 sm:w-11 animate-spin" />
          ) : isRecording ? (
            <MicOff className="h-9 w-9 sm:h-11 sm:w-11" />
          ) : (
            <Mic className="h-9 w-9 sm:h-11 sm:w-11" />
          )}
        </div>
      </div>
    </button>
  );
}