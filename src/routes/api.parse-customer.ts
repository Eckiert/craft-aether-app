import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/parse-customer")({
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

          const { text } = (await request.json()) as { text?: string };
          if (!text || !text.trim()) {
            return new Response(
              JSON.stringify({ error: "Kein Text übergeben" }),
              { status: 400, headers: { "Content-Type": "application/json" } },
            );
          }

          const systemPrompt = `Du extrahierst Kundenstammdaten aus einem deutschsprachigen Diktat.

Regeln:
- name: Firma oder Person (z. B. "Bauer GmbH" oder "Max Mustermann")
- address: Straße + Hausnummer, PLZ, Ort — falls genannt, mit Zeilenumbruch zwischen Straße und PLZ Ort
- email: nur wenn genannt (Punkt = "." und "at" = "@" korrekt normalisieren)
- phone: nur wenn genannt, in gängigem Format (z. B. "+43 664 1234567")
- notes: nur interne Zusatzinfos (Ansprechpartner, Kontext), NICHT die anderen Felder wiederholen
- Wenn ein Feld nicht genannt wird, lasse es leer ("")`;

          const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: text },
              ],
              tools: [
                {
                  type: "function",
                  function: {
                    name: "extract_customer",
                    description: "Extrahiere Kundenstammdaten aus dem Diktat",
                    parameters: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        address: { type: "string" },
                        email: { type: "string" },
                        phone: { type: "string" },
                        notes: { type: "string" },
                      },
                      required: ["name", "address", "email", "phone", "notes"],
                      additionalProperties: false,
                    },
                  },
                },
              ],
              tool_choice: {
                type: "function",
                function: { name: "extract_customer" },
              },
            }),
          });

          if (!res.ok) {
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
            const err = await res.text();
            console.error("AI gateway error:", res.status, err);
            return new Response(
              JSON.stringify({ error: "AI-Verarbeitung fehlgeschlagen" }),
              { status: 500, headers: { "Content-Type": "application/json" } },
            );
          }

          const data = await res.json();
          const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
          if (!toolCall) {
            return new Response(
              JSON.stringify({ name: "", address: "", email: "", phone: "", notes: "" }),
              { status: 200, headers: { "Content-Type": "application/json" } },
            );
          }
          const parsed = JSON.parse(toolCall.function.arguments);
          return new Response(JSON.stringify(parsed), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (e) {
          console.error("parse-customer error:", e);
          return new Response(
            JSON.stringify({ error: e instanceof Error ? e.message : "Unbekannter Fehler" }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});