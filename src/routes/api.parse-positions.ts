import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/parse-positions")({
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

          const systemPrompt = `Du bist Assistent eines deutschsprachigen Baustellenleiters, der mündlich Angebotspositionen diktiert. Extrahiere ALLE genannten Leistungen/Materialien als separate Positionen.

Regeln:
- Beschreibung: kurz, klar, professionell (z. B. "Wandanstrich Wohnzimmer, weiße Dispersion")
- Menge: Zahl (Default 1)
- Einheit: nur eine von ["Stk","m","m²","m³","kg","h","Tag","Pauschal"]
- Preis: Einzelpreis in Euro (0 wenn nicht genannt)
- Erkenne Synonyme: Quadratmeter→m², laufende Meter→m, Stück→Stk, Stunden→h, pauschal→Pauschal
- Wenn der Sprecher Anmerkungen/Hinweise gibt (z. B. "Material ist im Preis drin"), packe sie in das notes-Feld
- Wenn nichts erkennbar ist, gib leeres items-Array zurück`;

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
                    name: "extract_positions",
                    description: "Extrahiere Angebotspositionen aus dem diktierten Text",
                    parameters: {
                      type: "object",
                      properties: {
                        items: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              description: { type: "string" },
                              quantity: { type: "number" },
                              unit: {
                                type: "string",
                                enum: ["Stk", "m", "m²", "m³", "kg", "h", "Tag", "Pauschal"],
                              },
                              price: { type: "number" },
                            },
                            required: ["description", "quantity", "unit", "price"],
                            additionalProperties: false,
                          },
                        },
                        notes: { type: "string" },
                      },
                      required: ["items"],
                      additionalProperties: false,
                    },
                  },
                },
              ],
              tool_choice: {
                type: "function",
                function: { name: "extract_positions" },
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
              JSON.stringify({ items: [], notes: "" }),
              { status: 200, headers: { "Content-Type": "application/json" } },
            );
          }
          const parsed = JSON.parse(toolCall.function.arguments);
          return new Response(JSON.stringify(parsed), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (e) {
          console.error("parse-positions error:", e);
          return new Response(
            JSON.stringify({ error: e instanceof Error ? e.message : "Unbekannter Fehler" }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
