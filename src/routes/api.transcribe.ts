import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/transcribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const apiKey = process.env.LOVABLE_API_KEY;
          if (!apiKey) {
            return new Response(
              JSON.stringify({ error: "LOVABLE_API_KEY nicht konfiguriert" }),
              { status: 500, headers: { "Content-Type": "application/json" } },
            );
          }

          const incoming = await request.formData();
          const audio = incoming.get("audio") as Blob | null;
          if (!audio) {
            return new Response(
              JSON.stringify({ error: "Audio-Datei fehlt" }),
              { status: 400, headers: { "Content-Type": "application/json" } },
            );
          }

          const mime = (audio.type || "").split(";")[0];
          const extMap: Record<string, string> = {
            "audio/webm": "webm",
            "audio/mp4": "mp4",
            "audio/mpeg": "mp3",
            "audio/mp3": "mp3",
            "audio/wav": "wav",
            "audio/wave": "wav",
            "audio/x-wav": "wav",
            "audio/ogg": "ogg",
            "audio/m4a": "m4a",
          };
          const ext = extMap[mime] ?? "webm";

          const fd = new FormData();
          fd.append("file", audio, `recording.${ext}`);
          fd.append("model", "openai/gpt-4o-mini-transcribe");

          const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}` },
            body: fd,
          });

          if (!res.ok) {
            const err = await res.text();
            console.error("Lovable AI STT error:", res.status, err);
            if (res.status === 429) {
              return new Response(
                JSON.stringify({ error: "Zu viele Anfragen, bitte kurz warten." }),
                { status: 429, headers: { "Content-Type": "application/json" } },
              );
            }
            if (res.status === 402) {
              return new Response(
                JSON.stringify({ error: "AI-Guthaben aufgebraucht. Bitte aufladen." }),
                { status: 402, headers: { "Content-Type": "application/json" } },
              );
            }
            return new Response(
              JSON.stringify({ error: `Transkription fehlgeschlagen (${res.status}): ${err || "Unbekannter Fehler"}` }),
              { status: 500, headers: { "Content-Type": "application/json" } },
            );
          }

          const data = (await res.json()) as { text?: string };
          return new Response(JSON.stringify({ text: data.text ?? "" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (e) {
          console.error("transcribe error:", e);
          return new Response(
            JSON.stringify({ error: e instanceof Error ? e.message : "Unbekannter Fehler" }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
