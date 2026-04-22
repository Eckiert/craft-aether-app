import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/transcribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const apiKey = process.env.ELEVENLABS_API_KEY;
          if (!apiKey) {
            return new Response(
              JSON.stringify({ error: "ELEVENLABS_API_KEY nicht konfiguriert" }),
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

          const fd = new FormData();
          fd.append("file", audio, "audio.webm");
          fd.append("model_id", "scribe_v2");
          fd.append("language_code", "deu");
          fd.append("tag_audio_events", "false");
          fd.append("diarize", "false");

          const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
            method: "POST",
            headers: { "xi-api-key": apiKey },
            body: fd,
          });

          if (!res.ok) {
            const err = await res.text();
            console.error("ElevenLabs error:", res.status, err);
            return new Response(
              JSON.stringify({ error: `Transkription fehlgeschlagen (${res.status})` }),
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
