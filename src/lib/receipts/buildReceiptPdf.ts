import { jsPDF } from 'jspdf';
import { format } from 'date-fns';

interface SeedLine {
  title: string;
  amount: number;
}

interface ReceiptMetadata {
  order_ref?: string;
  date?: string;
  provider?: string;
  seed_lines?: SeedLine[];
  sower_name?: string | null;
  sower_amount?: number | null;
  s2g_fee?: number | null;
  whisperer_amount?: number | null;
  whisperer_name?: string | null;
  subtotal?: number;
  processor_fee?: number;
  buyer_total?: number;
  topup_amount?: number;
}

const usd = (n: number | null | undefined) => (typeof n === 'number' ? `$${n.toFixed(2)}` : '-');

/** Loads /s2g-logo.webp as a data URL so jsPDF can embed it (addImage needs a data URI or raw bytes, not a plain path). */
async function loadLogoDataUrl(): Promise<string | null> {
  try {
    const res = await fetch('/s2g-logo.webp');
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * Builds the same content the /receipt/:orderId page renders, as a plain
 * jsPDF document (text + lines, no html2canvas -- no such library is in
 * this project's deps, and jsPDF alone is enough for a receipt this
 * simple). Returns the jsPDF instance; caller decides how to hand it to
 * the user (blob URL in a new tab, or doc.save()).
 */
export async function buildReceiptPdf(m: ReceiptMetadata, orderId: string): Promise<jsPDF> {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 48;
  let y = 56;

  const logo = await loadLogoDataUrl();
  if (logo) {
    try { doc.addImage(logo, 'WEBP', marginX, y - 20, 48, 48); } catch { /* unsupported image data -- skip, text header still renders */ }
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Receipt', pageWidth - marginX, y, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text('Sow2Grow', pageWidth - marginX, y + 14, { align: 'right' });
  doc.setTextColor(0);
  y += 48;

  doc.setDrawColor(220);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 24;

  const providerLabel = m.provider ? m.provider.charAt(0).toUpperCase() + m.provider.slice(1) : 'processor';
  const dateLabel = m.date ? format(new Date(m.date), 'PPP') : '';
  const colWidth = (pageWidth - marginX * 2) / 3;
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text('ORDER', marginX, y);
  doc.text('DATE', marginX + colWidth, y);
  doc.text('PROVIDER', marginX + colWidth * 2, y);
  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.text(m.order_ref ?? orderId, marginX, y + 14, { maxWidth: colWidth - 8 });
  doc.text(dateLabel, marginX + colWidth, y + 14, { maxWidth: colWidth - 8 });
  doc.text(providerLabel, marginX + colWidth * 2, y + 14, { maxWidth: colWidth - 8 });
  y += 40;

  doc.line(marginX, y, pageWidth - marginX, y);
  y += 20;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('Total paid', marginX, y);
  doc.text(usd(m.buyer_total), pageWidth - marginX, y, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  y += 16;

  if (m.processor_fee) {
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(`${providerLabel} processor fee`, marginX, y);
    doc.text(usd(m.processor_fee), pageWidth - marginX, y, { align: 'right' });
    doc.setTextColor(0);
    y += 18;
  }

  doc.line(marginX, y, pageWidth - marginX, y);
  y += 20;

  const isTopup = !m.seed_lines || m.seed_lines.length === 0;
  if (isTopup) {
    doc.setFontSize(10);
    doc.text('Amount credited to wallet', marginX, y);
    doc.setFont('helvetica', 'bold');
    doc.text(usd(m.topup_amount), pageWidth - marginX, y, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    y += 20;
  } else {
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`SEED${(m.seed_lines?.length ?? 0) > 1 ? 'S' : ''} - FROM ${(m.sower_name ?? '').toUpperCase()}`, marginX, y);
    doc.setTextColor(0);
    y += 14;
    doc.setFontSize(10);
    for (const line of m.seed_lines ?? []) {
      doc.text(line.title, marginX, y, { maxWidth: pageWidth - marginX * 2 - 80 });
      doc.text(usd(line.amount), pageWidth - marginX, y, { align: 'right' });
      y += 16;
    }
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text('Sower receives', marginX, y);
    doc.text(usd(m.sower_amount), pageWidth - marginX, y, { align: 'right' });
    y += 14;
    if (m.whisperer_amount) {
      doc.text(`Whisperer share${m.whisperer_name ? ` (${m.whisperer_name})` : ''}`, marginX, y);
      doc.text(usd(m.whisperer_amount), pageWidth - marginX, y, { align: 'right' });
      y += 14;
    }
    doc.setTextColor(0);
    y += 10;

    doc.line(marginX, y, pageWidth - marginX, y);
    y += 20;

    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text('PLATFORM FEE - SOW2GROW', marginX, y);
    doc.setTextColor(0);
    y += 14;
    doc.setFontSize(10);
    doc.text('Sow2Grow platform fee (15%)', marginX, y);
    doc.text(usd(m.s2g_fee), pageWidth - marginX, y, { align: 'right' });
    y += 20;
  }

  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text('Sow2Grow  |  sow2growapp.com', pageWidth / 2, pageHeight - 40, { align: 'center' });

  return doc;
}
