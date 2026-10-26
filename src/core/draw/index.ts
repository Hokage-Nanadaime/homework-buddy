import type { DiagramSpec } from '../question';
import { abacusSvg } from './abacus';
import { circledNumberSvg } from './circled';

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

/** One entry point: any diagram spec to SVG/HTML text. */
export function renderDiagram(d: DiagramSpec): string {
  switch (d.kind) {
    case 'abacus':
      return abacusSvg({ rods: d.rods, labels: d.labels, blank: d.blank });
    case 'circledNumber':
      return circledNumberSvg(d.digits, d.indexes);
    case 'html':
      return d.html;
    case 'columnSum': {
      const cell = 'style="width:34px;height:34px;text-align:center;font:700 22px sans-serif"';
      const head = `<tr><td></td>${d.headers.map((h) => `<td ${cell}><small>${esc(h)}</small></td>`).join('')}</tr>`;
      const carry = d.carryRow ? `<tr><td></td>${d.headers.map(() => `<td ${cell}><span style="display:inline-block;width:22px;height:22px;border:1px dashed var(--dash)"></span></td>`).join('')}</tr>` : '';
      const row = (digits: number[], lead: string) => `<tr><td ${cell}>${lead}</td>${d.headers.map((_, i) => `<td ${cell}>${digits[i] === undefined || digits[i]! < 0 ? '' : digits[i]}</td>`).join('')}</tr>`;
      return `<table style="border-collapse:collapse">${head}${carry}${row(d.top, '')}${row(d.bottom, esc(d.op))}<tr><td colspan="${d.headers.length + 1}" style="border-top:3px solid var(--ink)"></td></tr></table>`;
    }
    case 'numberGrid': {
      const rows: string[] = [];
      for (let i = 0; i < d.numbers.length; i += d.columns) {
        rows.push(`<tr>${d.numbers.slice(i, i + d.columns).map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`);
      }
      return `<table border="1" cellpadding="8" style="border-collapse:collapse;text-align:center">${rows.join('')}</table>`;
    }
    case 'table':
      return `<table border="1" cellpadding="6" style="border-collapse:collapse"><tr>${d.head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr>${d.rows
        .map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`)
        .join('')}</table>`;
  }
}
