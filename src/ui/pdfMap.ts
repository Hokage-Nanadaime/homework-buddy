import type { jsPDF } from 'jspdf';
import { mapHeightMm, mapTaskWord, mapWidthMm, placeOnKey, type MapSpec } from '../core/mapQuestion';

interface Pic {
  data: string;
  cw: number;
  ch: number;
}

/** The real empty map of India with the places listed beside it. Pass `key` to number the places as on the answer map (for the grown-up). */
export function drawMap(pdf: jsPDF, pic: Pic | null | undefined, spec: MapSpec, x: number, y: number, textW: number, text: (s: string) => string, ink: [number, number, number], muted: [number, number, number], key = false): number {
  const w = mapWidthMm(textW);
  const h = (w * 9) / 8;
  pdf.setDrawColor(190, 190, 190).setLineWidth(0.3).rect(x, y, w, h);
  if (pic) pdf.addImage(pic.data, 'PNG', x + 1, y + 1, w - 2, h - 2);
  const x2 = x + w + 8;
  pdf.setFont('helvetica', 'italic').setFontSize(9.5).setTextColor(...muted);
  pdf.text(text(key ? 'Look for:' : `${mapTaskWord(spec.task)} ${spec.places.length === 1 ? 'this place' : 'these places'} on the map.`), x2, y + 4);
  pdf.setFont('helvetica', 'normal').setFontSize(11.5).setTextColor(...ink);
  spec.places.forEach((p, k) => pdf.text(text(key ? placeOnKey(p.name) : `${k + 1}. ${p.name}`), x2, y + 12 + k * 6.5));
  return mapHeightMm(spec, textW);
}
