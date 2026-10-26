import { jsPDF } from 'jspdf';
import { renderDiagram } from '../core/draw';
import { mapHeightMm, mapOf } from '../core/mapQuestion';
import { isPairLines, matchHeightMm, matchOf } from '../core/match';
import { INDIA_BLANK, INDIA_KEY } from './mapSvg';
import { drawMap } from './pdfMap';
import { answerLines } from '../core/practice';
import { drawMatch } from './pdfMatch';
import { pictureSizeMm } from '../core/picture';
import { tapWordsOf } from '../core/kinds';
import { bookPages, keyPages, layoutDoc, passageWords, printPrompt, type PassageBlock, type PrintDoc } from '../core/print';
import type { Question } from '../core/question';

/** The built-in PDF fonts cover Latin-1 only, so the rupee sign becomes "Rs" and other odd characters are replaced. */
export function pdfText(s: string): string {
  return s
    .replace(/₹\s*/g, 'Rs ')
    .replace(/[→⟶]/g, '->')
    .replace(/−/g, '-')
    .replace(/≠/g, '!=')
    .replace(/≈/g, '~')
    .replace(/≤/g, '<=')
    .replace(/≥/g, '>=')
    .replace(/[–—]/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^\x09\x0a\x20-\x7e -ÿ]/g, '?');
}

interface Picture {
  data: string;
  /** image size in px (includes spare room) */
  w: number;
  h: number;
  /** size of the picture itself in px */
  cw: number;
  ch: number;
}

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image failed'));
    img.src = src;
  });

/** Turn the picture markup (SVG, or a table etc.) into a PNG so the PDF can carry it. Null when the browser refuses. */
export async function rasterise(html: string): Promise<Picture | null> {
  try {
    const probe0 = document.createElement('div');
    probe0.className = 'pic';
    probe0.style.display = 'none';
    document.body.appendChild(probe0);
    const cs = getComputedStyle(probe0);
    html = html.replace(/var\((--[a-z-]+)(?:,[^)]*)?\)/g, (_m, name: string) => cs.getPropertyValue(name).trim() || 'currentColor');
    probe0.remove();
    const isSvg = html.trim().startsWith('<svg');
    let svg = html.trim();
    let w: number;
    let h: number;
    let cw = 0;
    let ch = 0;
    if (isSvg) {
      const vb = svg.match(/viewBox="[\d.\-]+ [\d.\-]+ ([\d.]+) ([\d.]+)"/);
      const ww = svg.match(/<svg[^>]*\swidth="([\d.]+)"/);
      const hh = svg.match(/<svg[^>]*\sheight="([\d.]+)"/);
      w = Number(ww?.[1] ?? vb?.[1] ?? 300);
      h = Number(hh?.[1] ?? vb?.[2] ?? 150);
      if (vb && ww && !hh) h = (w * Number(vb[2])) / Number(vb[1]);
      if (!svg.includes('xmlns=')) svg = svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
      svg = svg.replace(/^<svg([^>]*?)\swidth="[^"]*"/, '<svg$1').replace(/^<svg([^>]*?)\sheight="[^"]*"/, '<svg$1');
      svg = svg.replace('<svg', `<svg width="${w}" height="${h}"`);
      cw = w;
      ch = h;
    } else {
      const probe = document.createElement('div');
      probe.style.cssText = 'position:fixed;left:-9999px;top:0;display:inline-block;padding:4px;background:#fff;font-family:sans-serif';
      probe.innerHTML = html;
      document.body.appendChild(probe);
      const r = probe.getBoundingClientRect();
      probe.remove();
      // the picture is drawn with the browser's fallback fonts, which can be wider: leave room
      cw = Math.ceil(r.width);
      ch = Math.ceil(r.height);
      w = Math.ceil(r.width * 1.2) + 24;
      h = Math.ceil(r.height * 1.1) + 12;
      svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml" style="padding:4px;font-family:sans-serif;background:#fff">${html}</div></foreignObject></svg>`;
    }
    const img = await loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
    const scale = cw > 500 || ch > 500 ? 3 : 2;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return { data: canvas.toDataURL('image/png'), w, h, cw, ch };
  } catch {
    return null;
  }
}

const INK: [number, number, number] = [27, 33, 80];
const BLUE: [number, number, number] = [22, 57, 184];
const MUTED: [number, number, number] = [86, 92, 138];
const M = 14; // margin, mm
const W = 210;
const BOTTOM = 297 - 16;

/** Build the PDF with the same sheets and question numbers as the print preview. */
export async function buildPdf(doc: PrintDoc, withKey: boolean): Promise<Blob> {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const pages = layoutDoc(doc);
  const keys = withKey ? keyPages(doc) : [];
  const maps = doc.items.map((it) => mapOf(it.question)).filter((m): m is NonNullable<typeof m> => m !== null);
  const totalPages = pages.length + keys.length + (withKey && maps.length ? 1 : 0);
  const mapPic = maps.length ? await rasterise(INDIA_BLANK) : null;
  const keyPic = withKey && maps.length ? await rasterise(INDIA_KEY) : null;
  const pics = new Map<Question, Picture | null>();
  await Promise.all(doc.items.map(async (it) => it.question.diagram && pics.set(it.question, await rasterise(renderDiagram(it.question.diagram)))));

  let pageNo = 0;
  let y = 0;
  const header = (title: string, sub: string | undefined, name: boolean) => {
    pageNo++;
    if (pageNo > 1) pdf.addPage();
    pdf.setTextColor(...BLUE).setFont('helvetica', 'bold').setFontSize(9);
    pdf.text(pdfText(`${doc.kicker} - ${doc.totalMarks} marks`).toUpperCase(), M, M + 2);
    pdf.setTextColor(...INK).setFontSize(17);
    pdf.text(pdfText(title), M, M + 10);
    let yy = M + 10;
    pdf.setFont('helvetica', 'normal').setFontSize(10).setTextColor(...MUTED);
    for (const line of [sub, doc.note && !title.includes('answer key') ? doc.note : undefined]) {
      if (!line) continue;
      for (const part of pdf.splitTextToSize(pdfText(line), name ? 98 : W - 2 * M) as string[]) {
        yy += 5;
        pdf.text(part, M, yy);
      }
    }
    if (name) {
      pdf.setTextColor(...INK).setFont('helvetica', 'bold').setFontSize(11);
      pdf.text('Name:', 118, M + 6);
      pdf.text('Date:', 118, M + 14);
      pdf.setDrawColor(...INK).setLineWidth(0.3);
      pdf.line(132, M + 6.5, W - M, M + 6.5);
      pdf.line(132, M + 14.5, W - M, M + 14.5);
    }
    pdf.setDrawColor(46, 91, 255).setLineWidth(0.8).line(M, yy + 3, W - M, yy + 3);
    y = yy + 10;
  };
  const footer = (i: number) => {
    pdf.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...MUTED);
    pdf.text(pdfText(`Made with Homework Buddy${doc.code ? ` - Worksheet code ${doc.code}` : ''}`), M, 297 - 9);
    pdf.text(`Page ${i} of ${totalPages}`, W - M, 297 - 9, { align: 'right' });
  };

  /** A reading text: a framed box with its title, then the paragraphs (poems keep their lines). */
  const passage = (b: PassageBlock) => {
    const w = passageWords(b);
    const textW = W - 2 * M - 8;
    pdf.setFont('helvetica', 'normal').setFontSize(10.5);
    if (b.show === 'ref') {
      pdf.setFont('helvetica', 'italic').setTextColor(...INK);
      const lines = pdf.splitTextToSize(pdfText(w.line!), W - 2 * M) as string[];
      pdf.text(lines, M, y);
      y += lines.length * 4.6 + 3;
      return;
    }
    const paras = (b.show === 'summary' ? [w.line!] : b.paragraphs).map((p) => p.split('\n').flatMap((l) => pdf.splitTextToSize(pdfText(l), textW) as string[]));
    const title = pdfText(`${w.title}${b.continued ? '' : ` (book ${bookPages(b.passage)})`}`);
    let top = y - 4;
    let started = false;
    const box = (bottom: number) => pdf.setDrawColor(216, 220, 238).setLineWidth(0.4).roundedRect(M, top, W - 2 * M, bottom - top, 1.5, 1.5);
    const head = () => {
      pdf.setFont('helvetica', 'bold').setFontSize(11).setTextColor(...BLUE);
      pdf.text(started ? pdfText(`${b.passage.title} (continued)`) : title, M + 4, y + 1);
      y += 6.5;
      pdf.setFont('helvetica', 'normal').setFontSize(10.5).setTextColor(...INK);
      started = true;
    };
    head();
    for (const lines of paras) {
      for (const line of lines) {
        if (y + 4.6 > BOTTOM) {
          box(y);
          footer(pageNo);
          header(doc.title, doc.subtitle, true);
          top = y - 4;
          head();
        }
        pdf.text(line, M + 4, y);
        y += 4.6;
      }
      y += 2;
    }
    box(y);
    y += 7;
  };

  pages.forEach((page) => {
    header(doc.title, doc.subtitle, true);
    for (const block of page) {
      if (block.kind === 'passage') {
        passage(block);
        continue;
      }
      const it = block.item;
      const q = it.question;
      const n = block.n;
      const textW = W - 2 * M - 10;
      const lines = pdf.setFont('helvetica', 'normal').setFontSize(11).splitTextToSize(pdfText(printPrompt(q)), textW - 12) as string[];
      const pic = pics.get(q);
      const sz = pic && q.diagram ? pictureSizeMm(pic.cw, pic.ch, q.diagram.kind, textW - 12) : { w: 0, h: 0 };
      const picH = sz.h;
      const picW = sz.w;
      const opts = q.inputs.filter((i) => i.mode === 'choice' || i.mode === 'multi');
      let need = lines.length * 5 + 4 + (it.section ? 9 : 0) + (pic ? (picH * pic.h) / pic.ch + 3 : q.diagram ? 6 : 0);
      const match = matchOf(q);
      const matchW = W - 2 * M - 9;
      const map = mapOf(q);
      if (match) need += matchHeightMm(match, matchW) + 2;
      else if (map) need += mapHeightMm(map, matchW) + 2;
      else for (const i of q.inputs) need += i.mode === 'abacus' ? 0 : i.mode === 'open' ? (q.together ? 8 : 27) : i.mode === 'sentence' ? 27 : i.mode === 'choice' || i.mode === 'multi' ? 10 : 11;
      need += opts.length * 0;
      if (y + need > BOTTOM && y > 60) {
        footer(pageNo);
        header(doc.title, doc.subtitle, true);
      }
      if (it.section) {
        pdf.setFont('helvetica', 'bold').setFontSize(12).setTextColor(...BLUE);
        pdf.text(pdfText(it.section), M, y);
        pdf.setDrawColor(221, 225, 245).setLineWidth(0.3).line(M, y + 1.5, W - M, y + 1.5);
        y += 8;
      }
      pdf.setFont('helvetica', 'bold').setFontSize(11).setTextColor(...INK);
      pdf.text(`${n}.`, M, y);
      pdf.setFont('helvetica', 'normal');
      pdf.text(lines, M + 9, y);
      pdf.setTextColor(...MUTED).setFontSize(10);
      pdf.text(q.together ? 'Do together' : `[${q.marks}]`, W - M, y, { align: 'right' });
      pdf.setTextColor(...INK).setFontSize(11);
      y += lines.length * 5 + 1;
      if (q.diagram) {
        if (pic) {
          pdf.addImage(pic.data, 'PNG', M + 9, y, (picW * pic.w) / pic.cw, (picH * pic.h) / pic.ch);
          y += (picH * pic.h) / pic.ch + 3;
        } else {
          pdf.setFont('helvetica', 'italic').setFontSize(9).setTextColor(...MUTED);
          pdf.text(pdfText(`(Picture: ${q.diagram.alt})`), M + 9, y + 3);
          y += 6;
          pdf.setTextColor(...INK).setFontSize(11);
        }
      }
      if (match) {
        y += drawMatch(pdf, match, M + 9, y, matchW, pdfText, INK, MUTED) + 2;
        pdf.setTextColor(...INK);
      }
      if (map) {
        y += drawMap(pdf, mapPic, map, M + 9, y, matchW, pdfText, INK, MUTED) + 2;
        pdf.setTextColor(...INK);
      }
      for (const i of match || map ? [] : q.inputs) {
        if (i.mode === 'abacus') continue;
        if (tapWordsOf(q)) {
          pdf.setTextColor(...MUTED).setFontSize(10).text('Words I marked:', M + 9, y + 6);
          pdf.setDrawColor(...INK).line(M + 9 + pdf.getTextWidth('Words I marked:') + 3, y + 6.5, W - M, y + 6.5);
          pdf.setTextColor(...INK);
          y += 11;
          continue;
        }
        pdf.setDrawColor(...INK).setLineWidth(0.3).setFont('helvetica', 'normal').setFontSize(10);
        if (i.mode === 'open' && q.together) {
          pdf.setFont('helvetica', 'italic').setTextColor(...MUTED).text('Do this together with a grown-up. It is not marked.', M + 9, y + 4);
          pdf.setFont('helvetica', 'normal').setTextColor(...INK);
          y += 8;
        } else if (i.mode === 'open' || i.mode === 'sentence') {
          for (let k = 0; k < 3; k++) pdf.line(M + 9, y + 7 + k * 8, W - M, y + 7 + k * 8);
          y += 27;
        } else if (i.mode === 'choice' || i.mode === 'multi') {
          let x = M + 9;
          const rowH = 7;
          if (i.mode === 'multi') {
            pdf.setTextColor(...MUTED);
            pdf.text('Tick all that apply.', x, y + 4);
            y += rowH;
            pdf.setTextColor(...INK);
          }
          if (i.label) {
            pdf.setFont('helvetica', 'bold');
            const lab = `${pdfText(i.label)}:`;
            pdf.text(lab, x, y + 3.7);
            x += pdf.getTextWidth(lab) + 5;
            pdf.setFont('helvetica', 'normal');
          }
          for (const c of i.choices ?? []) {
            const label = pdfText(c);
            const cw = pdf.getTextWidth(label) + 12;
            if (x + cw > W - M) {
              x = M + 9;
              y += rowH;
            }
            pdf.rect(x, y + 0.5, 3.6, 3.6);
            pdf.text(label, x + 5.5, y + 3.7);
            x += cw + 6;
          }
          y += rowH + 2;
        } else {
          const label = `${i.label ? `${pdfText(i.label)}  ` : ''}${i.mode === 'ordered' ? 'Write in order:' : 'Answer:'}`;
          pdf.setTextColor(...MUTED).text(label, M + 9, y + 6);
          pdf.setTextColor(...INK);
          const lx = M + 9 + pdf.getTextWidth(label) + 3;
          pdf.line(lx, y + 6.5, Math.min(W - M, lx + 90), y + 6.5);
          y += 11;
        }
      }
      y += 4;
    }
    footer(pageNo);
  });

  keys.forEach((rows) => {
    header(`${doc.title} - answer key`, 'For the grown-up. Keep this page back from the child.', false);
    pdf.setFontSize(11);
    for (const r of rows) {
      const text = pdfText(isPairLines(r.answers) ? r.answers.join('\n') : r.answers.join('   |   '));
      const lines = pdf.setFont('helvetica', 'normal').splitTextToSize(text, W - 2 * M - 30) as string[];
      if (y + lines.length * 5 > BOTTOM) {
        footer(pageNo);
        header(`${doc.title} - answer key`, undefined, false);
      }
      pdf.setFont('helvetica', 'bold').setTextColor(...INK).text(`${r.n}.`, M, y);
      pdf.setFont('helvetica', 'normal').text(lines, M + 9, y);
      pdf.setTextColor(...MUTED).text(`${r.marks} mark${r.marks === 1 ? '' : 's'}`, W - M, y, { align: 'right' });
      y += lines.length * 5 + 3;
    }
    footer(pageNo);
  });

  if (withKey && maps.length) {
    header(`${doc.title} - answer map`, 'For the grown-up. The numbers are the states and union territories listed beside the map.', false);
    y = drawMap(pdf, keyPic, { task: 'label', places: maps.flatMap((m) => m.places) }, M, y, W - 2 * M, pdfText, INK, MUTED, true) + y;
    footer(pageNo);
  }

  return pdf.output('blob');
}

export { answerLines };
