import type { DiagramSpec } from './question';

/** Tallest a picture may be on paper, by kind. Rulers, jugs and fraction figures get room to be read. */
export const PICTURE_MAX_MM = (kind: string, naturalPx = 0): number => (kind === 'abacus' ? 42 : naturalPx > 320 ? 170 : 62);

/** Natural size of a picture in millimetres (96 dpi), shrunk to fit the cap and the width. */
export function pictureSizeMm(w: number, h: number, kind: string, maxW: number): { w: number; h: number } {
  let ww = w * 0.2646;
  let hh = h * 0.2646;
  const k = Math.min(1, PICTURE_MAX_MM(kind, h) / hh, maxW / ww);
  ww *= k;
  hh *= k;
  return { w: ww, h: hh };
}

export function pictureNaturalPx(q: { diagram?: DiagramSpec }): { w: number; h: number } | undefined {
  const d = q.diagram;
  if (!d) return undefined;
  const html = d.kind === 'html' ? d.html : '';
  const m = html.match(/<svg[^>]*\sviewBox="[\d.\-]+ [\d.\-]+ ([\d.]+) ([\d.]+)"/);
  const wa = html.match(/<svg[^>]*\swidth="([\d.]+)"/);
  const ha = html.match(/<svg[^>]*\sheight="([\d.]+)"/);
  if (d.kind === 'abacus') return { w: d.rods.length * 56 + 24, h: 230 };
  if (d.kind === 'table') return { w: 420, h: (d.rows.length + 1) * 34 };
  if (d.kind === 'numberGrid') return { w: d.columns * 60, h: Math.ceil(d.numbers.length / d.columns) * 40 };
  if (d.kind === 'columnSum') return { w: 200, h: 150 };
  if (d.kind === 'circledNumber') return { w: d.digits.length * 34 + 16, h: 56 };
  if (m) {
    const w = Number(wa?.[1] ?? m[1]);
    return { w, h: ha ? Number(ha[1]) : (w * Number(m[2])) / Number(m[1]) };
  }
  const rows = (html.match(/<tr/g) ?? []).length;
  if (rows > 30) return { w: 682, h: rows * 10 + 15 };
  if (rows > 0) return { w: 400, h: rows * 34 + 5 };
  return { w: wa ? Number(wa[1]) : 400, h: ha ? Number(ha[1]) : 130 };
}

