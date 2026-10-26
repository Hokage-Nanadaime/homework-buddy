import type { jsPDF } from 'jspdf';
import { matchColMm, matchRowMm, type MatchSpec } from '../core/match';

/**
 * The printed match on a PDF page: two real columns, the left items numbered, a box beside each to write the letter in,
 * the right items lettered. Returns the height used, the same as matchHeightMm says (the paper pages are split with that sum).
 */
export function drawMatch(pdf: jsPDF, spec: MatchSpec, x: number, y: number, textW: number, text: (s: string) => string, ink: [number, number, number], muted: [number, number, number]): number {
  const colW = matchColMm(textW);
  const boxX = x + colW + 3;
  const rx = boxX + 13 + 5;
  pdf.setFont('helvetica', 'italic').setFontSize(9).setTextColor(...muted);
  pdf.text('Write the letter of the match in the box.', x, y + 3.5);
  let top = y + 6;
  spec.rights.forEach((r, k) => {
    const h = matchRowMm(spec, k, textW);
    const l = spec.lefts[k];
    pdf.setFont('helvetica', 'normal').setFontSize(11).setTextColor(...ink);
    if (l) {
      pdf.text(pdf.splitTextToSize(text(`${l.n}. ${l.text}`), colW) as string[], x, top + 5.2);
      pdf.setDrawColor(...ink).setLineWidth(0.3).roundedRect(boxX, top + 0.5, 11, 7.5, 1, 1);
    }
    pdf.text(pdf.splitTextToSize(text(`(${r.letter}) ${r.text}`), colW) as string[], rx, top + 5.2);
    top += h;
  });
  return top - y;
}
