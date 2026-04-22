// Web Speech API helpers — typed lightly to stay TS-strict
/* eslint-disable @typescript-eslint/no-explicit-any */

type Recognition = any;

export interface ParsedItem {
  description: string;
  quantity: number;
  unit: string;
  price: number;
}

export function getRecognition(): Recognition | null {
  if (typeof window === "undefined") return null;
  const w = window as any;
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
  if (!Ctor) return null;
  const rec = new Ctor();
  rec.lang = "de-DE";
  rec.interimResults = false;
  rec.continuous = false;
  return rec;
}

const UNIT_MAP: Record<string, string> = {
  stück: "Stk", stueck: "Stk", stk: "Stk",
  meter: "m", m: "m",
  quadratmeter: "m²", "m²": "m²", qm: "m²",
  kubikmeter: "m³", "m³": "m³",
  kilo: "kg", kilogramm: "kg", kg: "kg",
  stunde: "h", stunden: "h", h: "h",
  tag: "Tag", tage: "Tag",
  pauschal: "Pauschal",
};

function wordToNumber(w: string): number | null {
  const map: Record<string, number> = {
    null: 0, eins: 1, ein: 1, eine: 1, zwei: 2, drei: 3, vier: 4, fünf: 5,
    sechs: 6, sieben: 7, acht: 8, neun: 9, zehn: 10, elf: 11, zwölf: 12,
    zwanzig: 20, dreißig: 30, vierzig: 40, fünfzig: 50, hundert: 100,
  };
  return w.toLowerCase() in map ? map[w.toLowerCase()] : null;
}

function parseNumber(s: string): number | null {
  const cleaned = s.replace(/\./g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  if (!isNaN(n)) return n;
  return wordToNumber(s);
}

/**
 * Parses a German voice transcript into a quote item.
 * Examples:
 *  "5 Meter Kabel zu 12,50 Euro"
 *  "10 Stück Steckdose Preis 8 Euro"
 *  "Wandanstrich 25 Quadratmeter 18,90"
 */
export function parseTranscript(text: string): ParsedItem {
  const original = text.trim();
  let working = " " + original.toLowerCase() + " ";

  // Price: look for "X Euro" / "X,YY €" / "preis X" / "zu X"
  let price = 0;
  const priceRe = /(?:(?:zu|preis|für|kostet|kosten|à|a)\s+)?(\d+(?:[.,]\d+)?)\s*(?:€|euro|eur)\b/;
  const priceMatch = working.match(priceRe);
  if (priceMatch) {
    price = parseNumber(priceMatch[1]) ?? 0;
    working = working.replace(priceMatch[0], " ");
  } else {
    // Fallback: last decimal number is price
    const nums = [...working.matchAll(/\d+[.,]\d+/g)];
    if (nums.length > 0) {
      const last = nums[nums.length - 1];
      price = parseNumber(last[0]) ?? 0;
      working = working.replace(last[0], " ");
    }
  }

  // Quantity + unit
  let quantity = 1;
  let unit = "Stk";
  const unitKeys = Object.keys(UNIT_MAP).sort((a, b) => b.length - a.length);
  const unitPattern = unitKeys.map((u) => u.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const qtyRe = new RegExp(`(\\d+(?:[.,]\\d+)?|eins|ein|eine|zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn)\\s*(${unitPattern})\\b`, "i");
  const qtyMatch = working.match(qtyRe);
  if (qtyMatch) {
    quantity = parseNumber(qtyMatch[1]) ?? 1;
    unit = UNIT_MAP[qtyMatch[2].toLowerCase()] ?? "Stk";
    working = working.replace(qtyMatch[0], " ");
  } else {
    // Just a number → quantity
    const nMatch = working.match(/\b(\d+(?:[.,]\d+)?)\b/);
    if (nMatch) {
      quantity = parseNumber(nMatch[1]) ?? 1;
      working = working.replace(nMatch[0], " ");
    }
  }

  // Description: leftover words from original (preserve case)
  const removedTokens = new Set<string>();
  if (priceMatch) priceMatch[0].split(/\s+/).forEach((t) => removedTokens.add(t.toLowerCase()));
  if (qtyMatch) qtyMatch[0].split(/\s+/).forEach((t) => removedTokens.add(t.toLowerCase()));
  const fillers = new Set(["zu", "preis", "für", "kostet", "kosten", "à", "a", "und", "von", "mit", "ein", "eine"]);
  const description = original
    .split(/\s+/)
    .filter((tok) => {
      const low = tok.toLowerCase().replace(/[.,;:]/g, "");
      if (!low) return false;
      if (removedTokens.has(low)) return false;
      if (fillers.has(low)) return false;
      return true;
    })
    .join(" ")
    .trim() || original;

  return { description, quantity, unit, price };
}