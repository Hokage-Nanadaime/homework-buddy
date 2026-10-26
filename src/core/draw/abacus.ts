/** Abacus picture as SVG text (works on screen and in print). One rod per place; up to 9 beads each. */
export interface AbacusOptions {
  rods: number[];
  labels: string[];
  /** Empty rods only (kid places the beads). */
  blank?: boolean;
  colour?: string;
}

const BEAD_R = 8;
const GAP = 18;
const ROD_GAP = 56;

export function abacusSvg({ rods, labels, blank = false, colour = 'var(--maths)' }: AbacusOptions): string {
  const w = rods.length * ROD_GAP + 24;
  const wireTop = 28;
  const wireH = 9 * GAP + 12;
  const h = wireTop + wireH + 34;
  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img">`,
    `<rect x="4" y="${wireTop - 10}" width="${w - 8}" height="6" rx="3" style="fill:var(--ink)"/>`,
    `<rect x="4" y="${wireTop + wireH}" width="${w - 8}" height="8" rx="4" style="fill:var(--ink)"/>`,
  ];
  rods.forEach((count, i) => {
    const x = 12 + ROD_GAP * i + ROD_GAP / 2;
    parts.push(`<line x1="${x}" y1="${wireTop - 6}" x2="${x}" y2="${wireTop + wireH}" style="stroke:var(--muted)" stroke-width="3"/>`);
    parts.push(`<text x="${x}" y="${h - 8}" text-anchor="middle" font-family="sans-serif" font-size="14" font-weight="700" style="fill:var(--ink)">${labels[i] ?? ''}</text>`);
    if (blank) return;
    for (let b = 0; b < count; b++) {
      const y = wireTop + wireH - 8 - b * GAP - BEAD_R;
      // beads 6-9 are a second colour, so a tall rod is easy to count in fives
      const fill = b < 5 ? colour : 'var(--english)';
      parts.push(`<circle cx="${x}" cy="${y}" r="${BEAD_R}" style="fill:${fill};stroke:var(--ink)" stroke-width="1.5"/>`);
    }
  });
  parts.push('</svg>');
  return parts.join('');
}

/** Digits of a number as bead counts per rod. */
export const beadsFor = (digits: number[]): number[] => digits.slice();
