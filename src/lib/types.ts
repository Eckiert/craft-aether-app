export interface QuoteItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  price: number;
}

export interface Quote {
  id: string;
  user_id: string;
  customer_name: string;
  customer_address: string | null;
  project_name: string;
  notes: string | null;
  items: QuoteItem[];
  total: number;
  created_at: string;
  updated_at: string;
}

export const UNITS = ["Stk", "m", "m²", "m³", "kg", "h", "Tag", "Pauschal"] as const;

export function calcTotal(items: QuoteItem[]): number {
  return items.reduce((sum, i) => sum + (Number(i.quantity) || 0) * (Number(i.price) || 0), 0);
}

export function formatEUR(value: number): string {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(value);
}