import { fmtMark } from './markText';
import { mapOf, mapKeyHtml, mapPrintHtml, MAP_PRINT_CSS } from './mapQuestion';
import { keyHtml, matchOf, matchPrintHtml, MATCH_PRINT_CSS } from './match';
import { answerLines } from './practice';
import { renderDiagram } from './draw';
import { pictureNaturalPx, pictureSizeMm } from './picture';
import { paperWords, tapWordsOf } from './kinds';
import type { Passage, Question } from './question';

/** One thing to print: a question, optionally starting a new section. */
export interface PrintItem {
  section?: string;
  question: Question;
}

export interface PrintDoc {
  /** e.g. "Maths · Class 3 · Easy" */
  kicker: string;
  title: string;
  subtitle?: string;
  /** e.g. "Time allowed: 30 minutes" */
  note?: string;
  items: PrintItem[];
  totalMarks: number;
  /** Used for file names. */
  slug: string;
  /** Worksheet code printed in every page footer. */
  code?: string;
  /** English: the lesson's reading texts; a question's `passage` points into these. */
  texts?: Passage[];
}

export const PER_SHEET = 10;
/** Room for questions on one A4 sheet, in CSS px, after the heading and footer. */
export const BUDGET = 820;
const SECTION_HEIGHT = 40;

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** On paper the abacus wording changes from "set" to "draw". */
export function printPrompt(q: Question): string {
  if (q.typeId?.startsWith('E')) return paperWords(q.prompt); // English: nothing is tapped on paper
  if (q.inputs.some((i) => i.mode === 'abacus')) {
    return q.prompt.replace(/set the number of beads on each rod/i, 'draw the beads on each rod').replace(/type the beads on each rod/i, 'draw the beads on each rod');
  }
  return q.prompt;
}

function pictureHeight(q: Question): number {
  const nat = pictureNaturalPx(q);
  if (!q.diagram || !nat) return 0;
  const mm = pictureSizeMm(nat.w, nat.h, q.diagram.kind, 170).h;
  // abacus and SVG pictures are drawn 110 px high on the sheet; other pictures keep the same scale as the PDF
  return q.diagram.kind === 'abacus' || (q.diagram.kind === 'html' && q.diagram.html.trim().startsWith('<svg')) ? Math.min(115, mm / 0.2646) : mm / 0.2646;
}

/** A cautious guess of how tall a question is on paper, so a sheet never overflows. */
export function estimateHeight(q: Question): number {
  let h = 18 + Math.ceil(printPrompt(q).length / 75) * 22 + pictureHeight(q);
  const match = matchOf(q);
  if (match) return h + 28 + match.rights.length * 36;
  if (mapOf(q)) return h + 640;
  for (const i of q.inputs) {
    if (i.mode === 'abacus') continue;
    if (i.mode === 'open') h += q.together ? 34 : 110;
    else if (i.mode === 'sentence') h += 110;
    else if (i.mode === 'choice' || i.mode === 'multi') h += Math.ceil((i.choices ?? []).length / 4) * 32 + 8;
    else h += 34;
  }
  return h;
}

/** A reading text (or part of one) printed on a sheet before the questions about it. */
export interface PassageBlock {
  kind: 'passage';
  passage: Passage;
  /** what is printed: paragraphs (or parts of a long one); empty for a summary text or a reference */
  paragraphs: string[];
  /** 'full' text, 'summary' (read it in the book), or 'ref' (the text is on an earlier sheet) */
  show: 'full' | 'summary' | 'ref';
  /** true when this block carries on a text started on the sheet before */
  continued?: boolean;
  /** 'ref' only: the sheet number where the text starts */
  page?: number;
}
export interface QuestionBlock {
  kind: 'question';
  item: PrintItem;
  /** question number, from 1 */
  n: number;
}
export type SheetBlock = PassageBlock | QuestionBlock;

/** Text sizes on paper (14px, 1.45 line height), with cautious characters per line so a sheet never overflows. */
const TEXT_LINE = 21;
const TEXT_CPL = 78;
const TEXT_HEAD = 34;
const TEXT_PAD = 22;
const PARA_GAP = 8;
const SHORT_BLOCK = 46;

const textLines = (p: string): number => p.split('\n').reduce((n, l) => n + Math.max(1, Math.ceil(l.length / TEXT_CPL)), 0);
const paraHeight = (p: string): number => textLines(p) * TEXT_LINE + PARA_GAP;

/** How tall a passage block is on paper. */
export function passageHeight(b: PassageBlock): number {
  if (b.show !== 'full') return SHORT_BLOCK;
  return TEXT_HEAD + TEXT_PAD + b.paragraphs.reduce((h, p) => h + paraHeight(p), 0);
}

/** Cut a paragraph that is taller than a whole sheet into pieces: poem lines, else sentences. */
function pieces(p: string, room: number): string[] {
  if (paraHeight(p) <= room) return [p];
  const bits = p.includes('\n') ? p.split('\n') : p.split(/(?<=[.!?”"])\s+/);
  const join = p.includes('\n') ? '\n' : ' ';
  const out: string[] = [];
  let cur = '';
  for (const b of bits) {
    const next = cur ? cur + join + b : b;
    if (cur && paraHeight(next) > room) {
      out.push(cur);
      cur = b;
    } else cur = next;
  }
  if (cur) out.push(cur);
  return out;
}

/**
 * Lay out a document on A4 sheets: at most `perSheet` questions each, fewer when they would not fit.
 * Each reading text is printed before the first question that uses it on every sheet. A text too long to share a sheet
 * with its question is printed once (over several sheets if needed); later sheets point back to it.
 * A summary text prints only "Read this in your book, page N".
 */
export function layoutDoc(doc: Pick<PrintDoc, 'items' | 'texts'>, perSheet = PER_SHEET): SheetBlock[][] {
  const pages: SheetBlock[][] = [];
  let page: SheetBlock[] = [];
  let used = 0;
  let count = 0;
  const startedOn = new Map<string, number>();
  const newPage = () => {
    pages.push(page);
    page = [];
    used = 0;
    count = 0;
  };
  const add = (b: SheetBlock, h: number) => {
    page.push(b);
    used += h;
    if (b.kind === 'question') count++;
  };
  const onPage = (id: string) => page.some((b) => b.kind === 'passage' && b.passage.id === id);
  /** The blocks needed before a question on the current sheet. */
  const before = (passage: Passage | undefined): PassageBlock | undefined => {
    if (!passage || onPage(passage.id)) return undefined;
    if (passage.stored === 'summary') return { kind: 'passage', passage, paragraphs: [], show: 'summary' };
    const full: PassageBlock = { kind: 'passage', passage, paragraphs: passage.paragraphs, show: 'full' };
    const start = startedOn.get(passage.id);
    if (start === undefined || passageHeight(full) <= BUDGET * 0.45) return full;
    return { kind: 'passage', passage, paragraphs: [], show: 'ref', page: start };
  };
  /** Print a long text from here on, over as many sheets as it needs. */
  const printLong = (passage: Passage) => {
    if (page.length > 0 && BUDGET - used < 160) newPage();
    startedOn.set(passage.id, pages.length + 1);
    let block: PassageBlock = { kind: 'passage', passage, paragraphs: [], show: 'full' };
    for (const para of passage.paragraphs) {
      for (const part of pieces(para, BUDGET - TEXT_HEAD - TEXT_PAD)) {
        const h = paraHeight(part);
        if (used + passageHeight(block) + h > BUDGET && block.paragraphs.length > 0) {
          add(block, passageHeight(block));
          newPage();
          block = { kind: 'passage', passage, paragraphs: [], show: 'full', continued: true };
        }
        block = { ...block, paragraphs: [...block.paragraphs, part] };
      }
    }
    add(block, passageHeight(block));
  };
  doc.items.forEach((item, i) => {
    const q = item.question;
    const passage = q.passage ? doc.texts?.find((t) => t.id === q.passage) : undefined;
    const qh = estimateHeight(q) + (item.section ? SECTION_HEIGHT : 0);
    const block = { kind: 'question', item, n: i + 1 } as const;
    for (let attempt = 0; attempt < 3; attempt++) {
      const pre = before(passage);
      const ph = pre ? passageHeight(pre) : 0;
      if (count < perSheet && used + ph + qh <= BUDGET) {
        if (pre) {
          if (pre.show === 'full' && !startedOn.has(pre.passage.id)) startedOn.set(pre.passage.id, pages.length + 1);
          add(pre, ph);
        }
        return add(block, qh);
      }
      if (page.length > 0 && attempt === 0) {
        newPage();
        continue;
      }
      if (pre?.show === 'full' && !startedOn.has(pre.passage.id)) {
        printLong(pre.passage);
        continue;
      }
      if (page.length > 0) newPage();
      const again = before(passage);
      if (again) add(again, passageHeight(again));
      return add(block, qh);
    }
    if (page.length > 0) newPage();
    add(block, qh);
  });
  if (page.length > 0) pages.push(page);
  return pages;
}

/** Split into sheets: at most 10 questions each, and fewer when they would not fit. */
export function paginate(items: PrintItem[], perSheet = PER_SHEET, texts?: Passage[]): PrintItem[][] {
  return layoutDoc({ items, texts }, perSheet).map((p) => p.flatMap((b) => (b.kind === 'question' ? [b.item] : [])));
}

function answerSpace(q: Question): string {
  // underline / circle the words: the child marks the printed sentence, and writes the words on a line as well
  if (tapWordsOf(q)) return '<div class="hb-line"><span class="hb-lab">Words I marked:</span><i></i></div>';
  const match = matchOf(q);
  if (match) return matchPrintHtml(match, esc);
  const map = mapOf(q);
  if (map) return mapPrintHtml(map);
  return q.inputs
    .map((i) => {
      const label = i.label ? `<span class="hb-lab">${esc(i.label)}</span>` : '';
      switch (i.mode) {
        case 'abacus':
          return '';
        case 'open':
          return q.together ? '<p class="hb-tog">Do this together with a grown-up. It is not marked.</p>' : '<div class="hb-ruled"><i></i><i></i><i></i></div>';
        case 'sentence':
          return '<div class="hb-ruled"><i></i><i></i><i></i></div>';
        case 'choice':
        case 'multi':
          return `<div class="hb-opts">${i.label ? `${label}<span class="hb-lab">:</span>` : ''}${i.mode === 'multi' ? '<span class="hb-hint">Tick all that apply.</span>' : ''}${(i.choices ?? []).map((c) => `<span class="hb-opt"><b class="hb-box"></b>${esc(c)}</span>`).join('')}</div>`;
        case 'ordered':
          return `<div class="hb-line">${label}<span class="hb-lab">Write in order:</span><i></i></div>`;
        default:
          return `<div class="hb-line">${i.label ? label : '<span class="hb-lab">Answer:</span>'}<i></i></div>`;
      }
    })
    .join('');
}

/** Non-SVG pictures (tables, calendars) are scaled like the PDF does, so a tall year calendar still fits a sheet. */
function sheetPicture(q: Question): string {
  const html = renderDiagram(q.diagram!);
  if (html.trim().startsWith('<svg')) return html;
  const nat = pictureNaturalPx(q);
  if (!nat) return html;
  const sz = pictureSizeMm(nat.w, nat.h, q.diagram!.kind, 170);
  const k = sz.h / (nat.h * 0.2646);
  return k < 0.98 ? `<div style="zoom:${k.toFixed(3)}">${html}</div>` : html;
}

function itemHtml(item: PrintItem, n: number): string {
  const q = item.question;
  const pic = q.diagram ? `<div class="hb-pic">${sheetPicture(q)}</div>` : '';
  const marks = q.together ? '<span class="hb-m">Do together</span>' : `<span class="hb-m">[${fmtMark(q.marks)}]</span>`;
  return (
    (item.section ? `<h3 class="hb-sec">${esc(item.section)}</h3>` : '') +
    `<div class="hb-q"><span class="hb-n">${n}.</span><div class="hb-b"><p class="hb-p">${esc(printPrompt(q))} ${marks}</p>${pic}${answerSpace(q)}</div></div>`
  );
}

/** Book pages of a text, e.g. "page 3" or "pages 3 to 4". */
export const bookPages = (p: Passage): string => (p.pages[0] === p.pages[1] ? `page ${p.pages[0]}` : `pages ${p.pages[0]} to ${p.pages[1]}`);

/** The words printed for a passage block (shared by the sheets and the PDF). */
export function passageWords(b: PassageBlock): { title: string; line?: string } {
  const t = b.passage.title;
  if (b.show === 'summary') return { title: t, line: `Read this in your book, page ${b.passage.pages[0]}.` };
  if (b.show === 'ref') return { title: t, line: `Read the text “${t}” on sheet ${b.page} again for these questions.` };
  return { title: b.continued ? `${t} (continued)` : `Read: ${t}` };
}

function passageHtml(b: PassageBlock): string {
  const w = passageWords(b);
  if (b.show === 'ref') return `<p class="hb-textref">${esc(w.line!)}</p>`;
  const body = b.show === 'summary' ? `<p class="hb-para">${esc(w.line!)}</p>` : b.paragraphs.map((p) => `<p class="hb-para">${esc(p)}</p>`).join('');
  return `<div class="hb-text"><p class="hb-text-t">${esc(w.title)}${b.continued ? '' : ` <small>(book ${bookPages(b.passage)})</small>`}</p>${body}</div>`;
}

const head = (doc: PrintDoc, withName: boolean): string =>
  `<header class="hb-head"><div><p class="hb-kick">${esc(doc.kicker)} · ${doc.totalMarks} marks</p><h2>${esc(doc.title)}</h2>${doc.subtitle ? `<p class="hb-sub">${esc(doc.subtitle)}</p>` : ''}${doc.note ? `<p class="hb-sub">${esc(doc.note)}</p>` : ''}</div>${withName ? '<p class="hb-name">Name: <i></i></p><p class="hb-name">Date: <i></i></p>' : ''}</header>`;

/** All question sheets, then (if asked) the answer key sheet(s). One markup used for the preview, printing and the HTML file. */
export function sheetsHtml(doc: PrintDoc, withKey: boolean): string {
  const pages = layoutDoc(doc);
  const maps = withKey ? doc.items.map((it) => mapOf(it.question)).filter((m): m is NonNullable<typeof m> => m !== null) : [];
  const total = pages.length + (withKey ? keyPages(doc).length + (maps.length ? 1 : 0) : 0);
  const sheets = pages.map((page, pi) => {
    const body = page.map((b) => (b.kind === 'question' ? itemHtml(b.item, b.n) : passageHtml(b))).join('');
    return `<section class="hb-sheet" aria-label="Page ${pi + 1} of ${total}">${head(doc, true)}<div class="hb-qs">${body}</div><footer class="hb-foot"><span>Made with Homework Buddy${doc.code ? ` · Worksheet code ${doc.code}` : ''}</span><span>Page ${pi + 1} of ${total}</span></footer></section>`;
  });
  if (withKey) {
    keyPages(doc).forEach((rows, ki) => {
      const pg = pages.length + ki + 1;
      sheets.push(
        `<section class="hb-sheet hb-key" aria-label="Answer key, page ${pg} of ${total}">${head({ ...doc, title: `${doc.title}: answer key`, subtitle: 'For the grown-up. Cut this page off before the sheet goes to the child.', note: undefined }, false)}<ol class="hb-keylist">${rows
          .map((r) => `<li value="${r.n}"><span>${keyHtml(r.answers, esc)}</span><small>${r.marks} mark${r.marks === 1 ? '' : 's'}</small></li>`)
          .join('')}</ol><footer class="hb-foot"><span>Made with Homework Buddy${doc.code ? ` · Worksheet code ${doc.code}` : ''}</span><span>Page ${pg} of ${total}</span></footer></section>`,
      );
    });
  }
  if (maps.length) {
    const pg = total;
    const all = { task: 'label' as const, places: maps.flatMap((m) => m.places) };
    sheets.push(`<section class="hb-sheet hb-key" aria-label="Answer map, page ${pg} of ${total}">${head({ ...doc, title: `${doc.title}: answer map`, subtitle: 'For the grown-up. The numbers are the states and union territories; the places to look for are listed beside the map.', note: undefined }, false)}${mapKeyHtml(all)}<footer class="hb-foot"><span>Made with Homework Buddy${doc.code ? ` · Worksheet code ${doc.code}` : ''}</span><span>Page ${pg} of ${total}</span></footer></section>`);
  }
  return sheets.join('');
}

export interface KeyRow {
  n: number;
  answers: string[];
  marks: number;
}

export function keyPages(doc: PrintDoc): KeyRow[][] {
  const rows = doc.items.map((it, i) => ({ n: i + 1, answers: answerLines(it.question), marks: it.question.marks }));
  const out: KeyRow[][] = [];
  for (let i = 0; i < rows.length; i += 25) out.push(rows.slice(i, i + 25));
  return out;
}

/** Paper look, shared by preview, print and the saved HTML file. Colours are fixed: this is paper. */
export const SHEET_CSS = `
.hb-sheet{box-sizing:border-box;width:210mm;min-height:297mm;margin:0 auto;padding:14mm 14mm 16mm;color-scheme:light;background:var(--paper-white);color:var(--paper-ink);font:15px/1.4 'Nunito',system-ui,sans-serif;position:relative;display:flex;flex-direction:column;gap:10px}
.hb-head{display:flex;flex-wrap:wrap;justify-content:space-between;gap:6px 24px;border-bottom:3px solid var(--paper-blue);padding-bottom:8px}
.hb-head h2{margin:0;font:700 24px/1.15 'Fredoka',system-ui,sans-serif}
.hb-head p{margin:0}
.hb-kick{font-weight:800;color:var(--paper-blue);font-size:13px;letter-spacing:.04em;text-transform:uppercase}
.hb-sub{color:var(--paper-ink);font-size:14px}
.hb-name{display:flex;align-items:flex-end;gap:6px;font-weight:700;min-width:220px}
.hb-name i,.hb-line i{display:inline-block;flex:1;border-bottom:1.5px solid var(--paper-ink);min-width:90px;height:1.2em}
.hb-qs{display:flex;flex-direction:column;gap:12px;flex:1}
.hb-sec{margin:6px 0 0;font:600 16px 'Fredoka',system-ui,sans-serif;color:var(--paper-blue);border-bottom:1px solid var(--paper-grey);padding-bottom:3px}
.hb-q{display:flex;gap:8px;break-inside:avoid;page-break-inside:avoid}
.hb-n{font-weight:800;min-width:26px}
.hb-b{flex:1;min-width:0}
.hb-p{margin:0 0 4px;white-space:pre-line}
.hb-m{float:right;font-weight:700;color:var(--paper-ink);font-size:13px;margin-left:10px}
.hb-pic{margin:4px 0 6px;overflow:hidden}
.hb-pic svg{height:110px;width:auto;max-width:100%}
.hb-pic table{max-width:100%}
.hb-line{display:flex;align-items:flex-end;gap:8px;margin:6px 0 0}
.hb-lab{font-weight:700;color:var(--paper-ink);font-size:14px}
.hb-opts{display:flex;flex-wrap:wrap;gap:6px 18px;margin:4px 0 0;align-items:center}
.hb-opt{display:inline-flex;align-items:center;gap:6px}
.hb-box{display:inline-block;width:14px;height:14px;border:1.5px solid var(--paper-ink);border-radius:3px}
.hb-hint{font-size:13px;color:var(--paper-ink);font-style:italic}
.hb-ruled{display:flex;flex-direction:column;gap:20px;margin-top:14px}
.hb-ruled i{border-bottom:1.5px solid var(--paper-ink);height:0}
.hb-text{border:1.5px solid var(--paper-grey);border-radius:6px;padding:8px 12px 4px;font-size:14px;line-height:1.45}
.hb-text-t{margin:0 0 4px;font:600 15px 'Fredoka',system-ui,sans-serif;color:var(--paper-blue)}
.hb-text-t small{font:600 12px 'Nunito',system-ui,sans-serif;color:var(--paper-ink)}
.hb-para{margin:0 0 8px;white-space:pre-line}
.hb-textref{margin:0;font-style:italic;font-size:14px}
.hb-tog{margin:4px 0 0;font-style:italic;font-size:14px}
.hb-foot{display:flex;justify-content:space-between;color:var(--paper-ink);font-size:12px;border-top:1px solid var(--paper-grey);padding-top:6px}
.hb-keylist{margin:0;padding:0;list-style:decimal inside;display:flex;flex-direction:column;gap:6px;flex:1}
.hb-keylist li{border-bottom:1px dotted var(--paper-grey);padding-bottom:4px;display:flex;gap:10px;justify-content:space-between}
.hb-keylist li span{flex:1}
.hb-keylist small{color:var(--paper-ink)}
`+MATCH_PRINT_CSS+MAP_PRINT_CSS;

export const PRINT_CSS = `
@page{size:A4;margin:0}
@media print{
  html,body{background:var(--paper-white)!important}
  .hb-sheet{width:auto;min-height:0;height:auto;margin:0;box-shadow:none!important;border:0!important;break-after:page;page-break-after:always;padding:12mm 14mm}
  .hb-sheet:last-child{break-after:auto;page-break-after:auto}
  .hb-zoom{zoom:1!important}
  .no-print{display:none!important}
}`;

/** A stand-alone page around ready-made sheets. */
export function standalonePage(title: string, css: string, body: string, tokens = ''): string {
  return `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Nunito:wght@600;700;800&display=swap"><style>${tokens}:root{color-scheme:light}body{margin:0;background:var(--paper-grey)}.hb-sheet{margin:16px auto;box-shadow:0 2px 12px var(--paper-dash)}${css}</style></head><body><div class="hb-print-area">${body}</div></body></html>`;
}

/** A complete, stand-alone web page of the sheets, for "Save as HTML file". */
export function standaloneHtml(doc: PrintDoc, withKey: boolean, tokens = ''): string {
  return `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(doc.title)}</title><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Nunito:wght@600;700;800&display=swap"><style>${tokens}:root{color-scheme:light}body{margin:0;background:var(--paper-grey)}.hb-sheet{margin:16px auto;box-shadow:0 2px 12px var(--paper-dash)}${SHEET_CSS}${PRINT_CSS}</style></head><body><div class="hb-print-area">${sheetsHtml(doc, withKey)}</div></body></html>`;
}

export const fileSlug = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
