import { useEffect, useState } from "react";

/**
 * AETHER Intro — eine kinematische Sekunden-Sequenz, die beim ersten Laden
 * der App gezeigt wird. Speichert Status in sessionStorage, sodass das Intro
 * pro Tab-Session nur einmal erscheint.
 */
export function AetherIntro({ onDone }: { onDone?: () => void }) {
  const [phase, setPhase] = useState<"in" | "out" | "gone">("in");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("out"), 2600);
    const t2 = setTimeout(() => {
      setPhase("gone");
      onDone?.();
    }, 3400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onDone]);

  if (phase === "gone") return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-background overflow-hidden transition-opacity duration-700 ${
        phase === "out" ? "opacity-0" : "opacity-100"
      }`}
      aria-hidden
    >
      {/* Ambient radial glow */}
      <div
        className="absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(ellipse at center, oklch(0.18 0 0) 0%, oklch(0.04 0 0) 60%)",
        }}
      />

      {/* Drifting grain / noise via subtle gradient */}
      <div
        className="absolute inset-0 opacity-[0.07] mix-blend-overlay"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, oklch(1 0 0) 0px, oklch(1 0 0) 1px, transparent 1px, transparent 3px)",
        }}
      />

      {/* Sweeping light beam */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute -inset-y-20 -left-1/2 w-[60%] aether-beam"
          style={{
            background:
              "linear-gradient(110deg, transparent 0%, oklch(1 0 0 / 0.08) 45%, oklch(1 0 0 / 0.18) 50%, oklch(1 0 0 / 0.08) 55%, transparent 100%)",
            filter: "blur(20px)",
          }}
        />
      </div>

      {/* Logo + Wordmark */}
      <div className="relative flex flex-col items-center gap-8">
        {/* Mark: rotating ring with center dot */}
        <div className="relative h-20 w-20 aether-mark-pop">
          <svg
            viewBox="0 0 100 100"
            className="absolute inset-0 h-full w-full aether-ring-spin"
          >
            <defs>
              <linearGradient id="aether-ring" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="oklch(0.985 0 0)" stopOpacity="0.95" />
                <stop offset="50%" stopColor="oklch(0.985 0 0)" stopOpacity="0.2" />
                <stop offset="100%" stopColor="oklch(0.985 0 0)" stopOpacity="0.95" />
              </linearGradient>
            </defs>
            <circle
              cx="50"
              cy="50"
              r="44"
              fill="none"
              stroke="url(#aether-ring)"
              strokeWidth="1"
              strokeDasharray="2 6"
            />
            <circle
              cx="50"
              cy="50"
              r="34"
              fill="none"
              stroke="oklch(0.985 0 0 / 0.3)"
              strokeWidth="0.6"
            />
          </svg>
          {/* Center triangle (A) */}
          <svg
            viewBox="0 0 100 100"
            className="absolute inset-0 h-full w-full aether-tri-rise"
          >
            <path
              d="M50 28 L70 70 L30 70 Z"
              fill="none"
              stroke="oklch(0.985 0 0)"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path
              d="M40 60 L60 60"
              stroke="oklch(0.985 0 0)"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          {/* Glow halo */}
          <div
            className="absolute inset-0 rounded-full aether-halo"
            style={{
              boxShadow: "0 0 60px 8px oklch(1 0 0 / 0.18)",
            }}
          />
        </div>

        {/* Wordmark — letters fade in with stagger */}
        <div className="flex items-center gap-[0.6em] font-mono text-2xl sm:text-3xl tracking-[0.5em] text-foreground">
          {"AETHER".split("").map((ch, i) => (
            <span
              key={i}
              className="aether-letter inline-block"
              style={{ animationDelay: `${600 + i * 90}ms` }}
            >
              {ch}
            </span>
          ))}
        </div>

        {/* Tagline */}
        <div
          className="aether-tagline text-[10px] uppercase tracking-[0.4em] text-muted-foreground"
          style={{ animationDelay: "1500ms" }}
        >
          Angebote · in Sekunden
        </div>

        {/* Progress line */}
        <div className="relative mt-2 h-px w-40 overflow-hidden bg-border/40">
          <div className="absolute inset-y-0 left-0 w-full bg-foreground aether-progress" />
        </div>
      </div>

      <style>{`
        @keyframes aether-mark-pop {
          0% { opacity: 0; transform: scale(0.7); filter: blur(8px); }
          60% { opacity: 1; transform: scale(1.05); filter: blur(0); }
          100% { opacity: 1; transform: scale(1); filter: blur(0); }
        }
        .aether-mark-pop { animation: aether-mark-pop 1100ms cubic-bezier(0.2, 0.8, 0.2, 1) both; }

        @keyframes aether-ring-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .aether-ring-spin { animation: aether-ring-spin 14s linear infinite; transform-origin: center; }

        @keyframes aether-tri-rise {
          0% { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .aether-tri-rise { animation: aether-tri-rise 900ms 300ms cubic-bezier(0.2, 0.8, 0.2, 1) both; }

        @keyframes aether-halo {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.9; }
        }
        .aether-halo { animation: aether-halo 2200ms ease-in-out infinite; border-radius: 9999px; }

        @keyframes aether-letter {
          0% { opacity: 0; transform: translateY(12px); filter: blur(6px); }
          100% { opacity: 1; transform: translateY(0); filter: blur(0); }
        }
        .aether-letter { animation: aether-letter 700ms cubic-bezier(0.2, 0.8, 0.2, 1) both; }

        @keyframes aether-tagline {
          0% { opacity: 0; letter-spacing: 0.2em; }
          100% { opacity: 1; letter-spacing: 0.4em; }
        }
        .aether-tagline { animation: aether-tagline 800ms cubic-bezier(0.2, 0.8, 0.2, 1) both; }

        @keyframes aether-progress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(0%); }
        }
        .aether-progress { animation: aether-progress 2400ms cubic-bezier(0.65, 0, 0.35, 1) both; }

        @keyframes aether-beam {
          0% { transform: translateX(-30%) rotate(8deg); opacity: 0; }
          30% { opacity: 1; }
          100% { transform: translateX(220%) rotate(8deg); opacity: 0; }
        }
        .aether-beam { animation: aether-beam 2600ms cubic-bezier(0.6, 0, 0.4, 1) both; }
      `}</style>
    </div>
  );
}