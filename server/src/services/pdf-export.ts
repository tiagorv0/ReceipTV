import PDFDocument from 'pdfkit';
import { ReceiptFilters } from '../types/receipt.js';

interface ReceiptForPDF {
  nome: string;
  valor: number | string;
  data_pagamento: string;
  banco?: string | null;
  tipo_pagamento?: string | null;
}

function formatCurrency(value: number | string): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(String(value)) || 0);
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;
}

export function generateHistoryPDF(receipts: ReceiptForPDF[], filtros: ReceiptFilters): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4', bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on('data', chunk => chunks.push(chunk as Buffer));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const margin = 40;
    const contentWidth = pageWidth - margin * 2;

    const now = new Date();
    const nowStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // ── Header ──────────────────────────────────────────────────────────
    doc.rect(0, 0, pageWidth, 60).fill('#16a34a');
    doc.fillColor('white').fontSize(18).font('Helvetica-Bold')
      .text('ReceipTV', margin, 15);
    doc.fontSize(10).font('Helvetica')
      .text('Relatório de Comprovantes', margin, 36);
    doc.fontSize(9)
      .text(nowStr, margin, 15, { align: 'right', width: contentWidth });

    // ── Filter summary ───────────────────────────────────────────────────
    let y = 78;
    doc.fillColor('#222').fontSize(9).font('Helvetica-Bold')
      .text('FILTROS APLICADOS', margin, y);
    y += 14;

    const parts: string[] = [];
    if (filtros.startDate ?? filtros.endDate)
      parts.push(`Período: ${formatDate(filtros.startDate)} – ${formatDate(filtros.endDate)}`);
    if (filtros.nome) parts.push(`Nome: ${filtros.nome}`);
    if (filtros.banco) parts.push(`Banco: ${filtros.banco}`);
    if (filtros.tipoPagamento) parts.push(`Tipo: ${filtros.tipoPagamento}`);
    if (filtros.valorMin ?? filtros.valorMax)
      parts.push(`Valor:${filtros.valorMin ? ' mín R$ ' + filtros.valorMin : ''}${filtros.valorMax ? ' máx R$ ' + filtros.valorMax : ''}`);

    doc.fillColor('#555').fontSize(9).font('Helvetica')
      .text(parts.length ? parts.join('  |  ') : 'Nenhum filtro', margin, y);
    y += 14;

    const totalValue = receipts.reduce((s, r) => s + parseFloat(String(r.valor ?? 0)), 0);
    doc.fillColor('#222').font('Helvetica-Bold')
      .text(`Total: ${receipts.length} registro(s)   Valor total: ${formatCurrency(totalValue)}`, margin, y);
    y += 22;

    // ── Table columns ────────────────────────────────────────────────────
    const cols = [
      { label: '#',            width: 28,  align: 'left'  as const },
      { label: 'Data',         width: 68,  align: 'left'  as const },
      { label: 'Beneficiário', width: 162, align: 'left'  as const },
      { label: 'Banco',        width: 90,  align: 'left'  as const },
      { label: 'Tipo',         width: 82,  align: 'left'  as const },
      { label: 'Valor',        width: 65,  align: 'right' as const },
    ];

    function drawTableHeader(yPos: number): number {
      doc.rect(margin, yPos, contentWidth, 20).fill('#16a34a');
      let x = margin;
      doc.fillColor('white').fontSize(8).font('Helvetica-Bold');
      cols.forEach(col => {
        doc.text(col.label, x + 4, yPos + 6, { width: col.width - 8, align: col.align, lineBreak: false });
        x += col.width;
      });
      return yPos + 20;
    }

    let currentY = drawTableHeader(y);

    receipts.forEach((r, idx) => {
      const rowH = 18;
      if (currentY + rowH > pageHeight - 45) {
        doc.addPage();
        currentY = drawTableHeader(40);
      }

      doc.rect(margin, currentY, contentWidth, rowH).fill(idx % 2 === 0 ? 'white' : '#f5f5f5');

      const cells = [
        { val: String(idx + 1),              bold: false },
        { val: formatDate(r.data_pagamento), bold: false },
        { val: r.nome           ?? '-',      bold: false },
        { val: r.banco          ?? '-',      bold: false },
        { val: r.tipo_pagamento ?? '-',      bold: false },
        { val: formatCurrency(r.valor),      bold: true  },
      ];

      let x = margin;
      doc.fillColor('#222').fontSize(8);
      cols.forEach((col, i) => {
        doc.font(cells[i].bold ? 'Helvetica-Bold' : 'Helvetica')
          .text(cells[i].val, x + 4, currentY + 5, { width: col.width - 8, align: col.align, lineBreak: false });
        x += col.width;
      });

      currentY += rowH;
    });

    // ── Footers ───────────────────────────────────────────────────────────
    const range = doc.bufferedPageRange();
    const totalPages = range.count;
    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(range.start + i);
      doc.page.margins.bottom = 0;
      doc.fillColor('#999').fontSize(8).font('Helvetica')
        .text(`Gerado em ${nowStr}`, margin, pageHeight - 28, { width: contentWidth - 60, lineBreak: false });
      doc.fillColor('#999').fontSize(8).font('Helvetica')
        .text(`Pág ${i + 1} / ${totalPages}`, margin, pageHeight - 28, { width: contentWidth, align: 'right', lineBreak: false });
    }

    doc.end();
  });
}
