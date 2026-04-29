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
    <div className="mb-8 sm:mb-10 flex justify-center">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="voice-breathing relative flex items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-70"
        aria-label={isRecording ? "Sprachaufnahme stoppen" : "Sprachaufnahme starten"}
      >
        <span className="voice-breathing-glow absolute inline-flex h-28 w-28 sm:h-32 sm:w-32 rounded-full bg-primary/25 blur-xl" />
        <span className="voice-breathing-ring absolute inline-flex h-24 w-24 sm:h-28 sm:w-28 rounded-full border border-primary/30" />
        <div className="voice-breathing-core relative flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30">
          {isProcessing ? (
            <Loader2 className="h-9 w-9 sm:h-11 sm:w-11 animate-spin" />
          ) : isRecording ? (
            <MicOff className="h-9 w-9 sm:h-11 sm:w-11" />
          ) : (
            <Mic className="h-9 w-9 sm:h-11 sm:w-11" />
          )}
        </div>
      </button>
    </div>
  );
}