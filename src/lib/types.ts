export interface QuoteItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  price: number;
  photo_path?: string | null;
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
  status: QuoteStatus;
  created_at: string;
  updated_at: string;
}

export const UNITS = ["Stk", "m", "m²", "m³", "kg", "h", "Tag", "Pauschal"] as const;

export type QuoteStatus = "draft" | "sent" | "accepted" | "rejected";

export const STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: "Entwurf",
  sent: "Versendet",
  accepted: "Angenommen",
  rejected: "Abgelehnt",
};

export const STATUS_STYLES: Record<QuoteStatus, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  sent: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  accepted: "bg-green-500/10 text-green-400 border-green-500/30",
  rejected: "bg-red-500/10 text-red-400 border-red-500/30",
};

export function calcTotal(items: QuoteItem[]): number {
  return items.reduce((sum, i) => sum + (Number(i.quantity) || 0) * (Number(i.price) || 0), 0);
}

export function formatEUR(value: number): string {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(value);
}