import jsPDF from "jspdf";
import { formatEUR, type Quote } from "./types";

export function generateQuotePdf(quote: Quote, openPrint = true) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 18;
  let y = margin;

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("AETHER", margin, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text("ANGEBOT", pageWidth - margin, y, { align: "right" });
  y += 4;
  doc.text(
    `Datum: ${new Date(quote.created_at).toLocaleDateString("de-DE")}`,
    pageWidth - margin,
    y,
    { align: "right" },
  );
  doc.setTextColor(0);

  // Divider
  y += 6;
  doc.setDrawColor(220);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // Customer
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text("KUNDE", margin, y);
  doc.setTextColor(0);
  y += 5;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(quote.customer_name || "-", margin, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  if (quote.customer_address) {
    quote.customer_address.split("\n").forEach((line) => {
      doc.text(line, margin, y);
      y += 5;
    });
  }

  y += 6;
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text("PROJEKT", margin, y);
  doc.setTextColor(0);
  y += 5;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(quote.project_name || "-", margin, y);
  y += 10;

  // Items table header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setFillColor(0);
  doc.setTextColor(255);
  doc.rect(margin, y, pageWidth - margin * 2, 8, "F");
  doc.text("Beschreibung", margin + 2, y + 5.5);
  doc.text("Menge", pageWidth - margin - 70, y + 5.5, { align: "right" });
  doc.text("Einheit", pageWidth - margin - 50, y + 5.5);
  doc.text("Einzel", pageWidth - margin - 22, y + 5.5, { align: "right" });
  doc.text("Gesamt", pageWidth - margin - 2, y + 5.5, { align: "right" });
  doc.setTextColor(0);
  y += 10;

  // Items
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  quote.items.forEach((item) => {
    const lineTotal = item.quantity * item.price;
    const descLines = doc.splitTextToSize(item.description || "-", pageWidth - margin * 2 - 90);
    const rowHeight = Math.max(7, descLines.length * 5 + 2);
    if (y + rowHeight > 270) {
      doc.addPage();
      y = margin;
    }
    doc.text(descLines, margin + 2, y + 4);
  doc.text(String(item.quantity), pageWidth - margin - 70, y + 4, { align: "right" });
    doc.text(item.unit, pageWidth - margin - 50, y + 4);
    doc.text(formatEUR(item.price), pageWidth - margin - 22, y + 4, { align: "right" });
    doc.text(formatEUR(lineTotal), pageWidth - margin - 2, y + 4, { align: "right" });
    y += rowHeight;
    doc.setDrawColor(235);
    doc.line(margin, y, pageWidth - margin, y);
  });

  // Total
  y += 8;
  if (y > 260) {
    doc.addPage();
    y = margin;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Gesamtsumme", pageWidth - margin - 50, y, { align: "right" });
  doc.text(formatEUR(Number(quote.total)), pageWidth - margin - 2, y, { align: "right" });
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text(
    "Gemäß § 19 UStG wird keine Umsatzsteuer berechnet (Kleinunternehmer).",
    pageWidth - margin - 2,
    y,
    { align: "right" },
  );
  doc.setTextColor(0);

  // Notes
  if (quote.notes) {
    y += 14;
    if (y > 250) {
      doc.addPage();
      y = margin;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Anmerkungen", margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const notesLines = doc.splitTextToSize(quote.notes, pageWidth - margin * 2);
    doc.text(notesLines, margin, y);
  }

  if (openPrint) {
    doc.autoPrint();
    const url = doc.output("bloburl");
    window.open(url, "_blank");
  } else {
    doc.save(`Angebot-${quote.project_name || quote.id}.pdf`);
  }
}