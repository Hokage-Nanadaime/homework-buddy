/** A number with one digit circled, as SVG text. */
export function circledNumberSvg(digits: string, indexes: number[]): string {
  const step = 34;
  const w = digits.length * step + 16;
  const parts = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} 56" width="${w}" height="56" role="img">`];
  [...digits].forEach((d, i) => {
    const x = 8 + step * i + step / 2;
    parts.push(`<text x="${x}" y="38" text-anchor="middle" font-family="sans-serif" font-size="30" font-weight="700" style="fill:var(--ink)">${d}</text>`);
    if (indexes.includes(i)) parts.push(`<circle cx="${x}" cy="28" r="18" style="fill:none;stroke:var(--english)" stroke-width="3"/>`);
  });
  parts.push('</svg>');
  return parts.join('');
}
