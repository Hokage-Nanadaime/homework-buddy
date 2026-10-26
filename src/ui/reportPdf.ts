import { jsPDF } from 'jspdf';
import { pdfText } from './pdf';

const INK: [number, number, number] = [26, 26, 26];
const GREY: [number, number, number] = [90, 90, 90];
const M = 16;
const W = 210;
const BOTTOM = 297 - 18;

const clean = (s: string | null): string => (s ?? '').replace(/\s+/g, ' ').trim();

/**
 * The report as a PDF on light paper: headings, sentences, tables and the practice list, read from the same HTML as the page.
 * Charts are left out: every chart has a table, and the tables are in the file.
 */
export async function buildReportPdf(html: string, title: string): Promise<Blob> {
  const doc = new DOMParser().parseFromString(`<div id="r">${html}</div>`, 'text/html');
  const root = doc.getElementById('r')!;
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  let y = M;
  let pageNo = 1;
  const footer = () => {
    pdf.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...GREY);
    pdf.text(pdfText('Made with Homework Buddy - progress report'), M, 297 - 9);
    pdf.text(`Page ${pageNo}`, W - M, 297 - 9, { align: 'right' });
  };
  const ensure = (h: number) => {
    if (y + h > BOTTOM) {
      footer();
      pdf.addPage();
      pageNo++;
      y = M;
    }
  };
  const para = (text: string, size: number, bold: boolean, gap: number, indent = 0) => {
    pdf.setFont('helvetica', bold ? 'bold' : 'normal').setFontSize(size).setTextColor(...INK);
    for (const line of pdf.splitTextToSize(pdfText(text), W - 2 * M - indent) as string[]) {
      ensure(size * 0.45);
      pdf.text(line, M + indent, y);
      y += size * 0.45;
    }
    y += gap;
  };
  const inViz = (el: Element): boolean => Boolean(el.closest('.viz, .legend2, .legend3, .rep-bar'));
  for (const el of Array.from(root.querySelectorAll('h1, h2, h3, p, table.t, ol.nx li, .tile, .callout'))) {
    if (inViz(el) && !el.closest('.tbl')) continue;
    const tag = el.tagName.toLowerCase();
    if (tag === 'h1') para(clean(el.textContent), 20, true, 3);
    else if (tag === 'h2') {
      y += 3;
      para(clean(el.textContent), 14, true, 2);
    } else if (tag === 'h3') para(clean(el.textContent), 11, true, 1);
    else if (tag === 'table') {
      const rows = Array.from(el.querySelectorAll('tr')).map((r) => Array.from(r.children).map((c) => clean(c.textContent)));
      const cw = (W - 2 * M) / (rows[0]?.length ?? 1);
      rows.forEach((r, ri) => {
        const lines = r.map((c) => pdf.setFont('helvetica', ri === 0 ? 'bold' : 'normal').setFontSize(9).splitTextToSize(pdfText(c), cw - 2) as string[]);
        const h = Math.max(...lines.map((l) => l.length)) * 4 + 2;
        ensure(h);
        lines.forEach((l, ci) => pdf.text(l, M + ci * cw, y));
        y += h;
        pdf.setDrawColor(200, 200, 200).line(M, y - 3, W - M, y - 3);
      });
      y += 3;
    } else if (tag === 'li') para(`- ${clean(el.textContent)}`, 10, false, 1);
    else if (tag === 'div') para(clean(el.textContent), 10, false, 2);
    else if (!el.closest('.callout, .tile, ol.nx, table')) para(clean(el.textContent), el.classList.contains('small') ? 9 : 10, false, 2);
  }
  footer();
  pdf.setProperties({ title });
  return pdf.output('blob');
}
