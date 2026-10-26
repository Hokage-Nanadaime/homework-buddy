import { fmtMark } from './markText';
import { renderDiagram } from './draw';
import type { Exam, PaperQuestion, PaperSection } from './exam';
import { paperAnswer, paperWords, tapWordsOf } from './kinds';
import { mapHeightMm, mapKeyHtml, mapOf, mapPrintHtml } from './mapQuestion';
import { keyHtml, matchHeightMm, matchOf, matchPrintHtml } from './match';
import { SHEET_CSS, PRINT_CSS } from './print';
import { pictureNaturalPx, pictureSizeMm } from './picture';

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export interface ExamItem {
  section: PaperSection;
  /** first question of its section on this page (print the section bar) */
  head: boolean;
  /** the section started on an earlier page */
  contd: boolean;
  q: PaperQuestion;
}

/** Room for questions in millimetres: the first page has the heading and instructions, later pages a short heading. */
const FIRST_MM = 195;
const NEXT_MM = 232;
const SECTION_BAR = 9;

/** (i) (ii) (iii) (iv) (v): a paper may carry five options (odd one out). */
export const optionLabel = (i: number): string => ['i', 'ii', 'iii', 'iv', 'v', 'vi'][i] ?? String(i + 1);

/** Lines a passage takes on paper (about 95 characters to a line at the passage size). */
export const passageLines = (s: PaperSection): number => (s.passage ? s.passage.paragraphs.reduce((n, p) => n + Math.max(1, Math.ceil(p.length / 95)), 0) : 0);

/** Height of a section's heading in mm: the part bar (Term Exam), the question bar and the unseen passage. A section carried on a new page has no part bar or passage. */
export function headMm(s: PaperSection, contd: boolean): number {
  if (contd) return SECTION_BAR;
  return SECTION_BAR + (s.part ? 10 : 0) + (s.passage ? passageLines(s) * 5 + 12 : 0);
}

const isInline = (q: PaperQuestion): boolean => (q.form === 'blank' || q.form === 'oneword') && q.inputs.length === 1 && !['choice', 'multi', 'abacus'].includes(q.inputs[0]!.mode) && !q.diagram;

/** The height of a question in the PDF, in mm. The preview splits pages with the same sum, so both give the same page count. */
export function examHeightMm(q: PaperQuestion, multi: boolean): number {
  return (q.lead ? 7 : 0) + examHeightBody(q, multi);
}

function examHeightBody(q: PaperQuestion, multi: boolean): number {
  const inline = isInline(q);
  const textW = 210 - 28 - (multi ? 9 : 2) - (inline ? 58 : 0);
  const lines = Math.max(1, Math.ceil((q.prompt.length * 2.15) / textW));
  let h = lines * 4.6 + 1;
  if (inline) return Math.max(h, 8) + 2;
  const nat = pictureNaturalPx(q);
  if (nat) h += pictureSizeMm(nat.w, nat.h, q.diagram!.kind, textW).h + 3;
  const optionRows = (labels: string[]): number => {
    let rows = 1;
    let x = 0;
    for (const l of labels) {
      const cw = l.length * 2.1 + 13;
      if (x + cw > textW) {
        rows++;
        x = 0;
      }
      x += cw + 5;
    }
    return (rows - 1) * 7 + 8;
  };
  const match = q.form === 'mcq' ? null : matchOf(q);
  if (match) return h + matchHeightMm(match, textW) + 2;
  const map = q.form === 'mcq' ? null : mapOf(q);
  if (map) return h + mapHeightMm(map, textW) + 2;
  if (q.form === 'mcq') h += optionRows((q.options ?? []).map((o, i) => `(${optionLabel(i)}) ${o}`));
  else {
    const how = paperAnswer(q);
    const wordsOnly = how === 'boxes' && q.form === 'short' && q.inputs.some((i) => i.label?.startsWith('Word '));
    h += how === 'sentence' ? 6 : wordsOnly ? 0 : q.form === 'short' ? 12 : q.form === 'long' ? (q.lines ? q.lines * 7 : 28) : q.form === 'word' ? 40 : 0;
    for (const inp of q.inputs) {
      if (how === 'sentence') continue;
      if (inp.mode === 'choice' || inp.mode === 'multi') h += optionRows(inp.choices ?? []);
      else if (inp.mode !== 'abacus' && how === 'boxes') h += 11;
    }
  }
  return h + 2;
}

/** Pages of the paper. A section that runs over a page break carries on with "(contd.)". */
export function paginateExam(exam: Exam): ExamItem[][] {
  const pages: ExamItem[][] = [];
  let page: ExamItem[] = [];
  let used = 0;
  let budget = FIRST_MM;
  for (const section of exam.sections) {
    let head = true;
    let contd = false;
    const multi = section.questions.length > 1;
    for (const q of section.questions) {
      const h = examHeightMm(q, multi) + (head ? headMm(section, contd) : 0);
      if (page.length > 0 && used + h > budget) {
        pages.push(page);
        page = [];
        used = 0;
        budget = NEXT_MM;
        if (!head) contd = true;
        head = true;
        page.push({ section, head, contd, q });
        used += examHeightMm(q, multi) + headMm(section, contd);
        head = false;
        continue;
      }
      page.push({ section, head, contd, q });
      used += h;
      head = false;
    }
  }
  if (page.length > 0) pages.push(page);
  return pages;
}

const meta = (exam: Exam): string =>
  [`Subject: ${esc(exam.header.subject)}`, `Class : ${esc(exam.header.className)}`, `Time : ${exam.minutes} min.`, `MM: ${exam.totalMarks}`].map((t) => `<span>${t}</span>`).join('');

function head1(exam: Exam): string {
  const h = exam.header;
  return `<header class="ex-head">${h.school ? `<p class="ex-school">${esc(h.school)}</p>` : ''}<h2><span class="ex-lbl">Name of Examination :</span> ${esc(h.examination)}</h2><p class="ex-session">Session ${esc(h.session)}</p><div class="ex-meta">${meta(exam)}</div><div class="ex-id"><p>Name: <i></i></p><p>Roll no.: <i></i></p></div><div class="ex-instr"><b>General Instructions:-</b><ol>${exam.instructions.map((i) => `<li>${esc(i)}</li>`).join('')}</ol></div></header>`;
}

const headN = (exam: Exam): string => `<header class="ex-head ex-small"><div class="ex-meta"><span>${esc(exam.header.examination)}</span><span>Class: ${esc(exam.header.className)}</span><span>${esc(exam.header.subject)}</span></div><div class="ex-id"><p>Name: <i></i></p><p>Roll no.: <i></i></p></div></header>`;

/** Tables and other non-SVG pictures are scaled with the same size rule as the PDF, so preview and PDF page alike. */
function zoomed(q: PaperQuestion): string {
  const html = renderDiagram(q.diagram!);
  if (html.trim().startsWith('<svg')) return html;
  const nat = pictureNaturalPx(q);
  if (!nat) return html;
  const sz = pictureSizeMm(nat.w, nat.h, q.diagram!.kind, 170);
  const k = sz.h / (nat.h * 0.2646);
  return k < 0.98 ? `<div style="zoom:${k.toFixed(3)}">${html}</div>` : html;
}

function questionHtml(q: PaperQuestion, multi: boolean): string {
  const pic = q.diagram ? `<div class="hb-pic">${zoomed(q)}</div>` : '';
  const lab = multi ? `<span class="ex-lab">(${esc(q.label)})</span>` : '';
  let answer = '';
  const match = q.form === 'mcq' ? null : matchOf(q);
  const map = q.form === 'mcq' ? null : mapOf(q);
  if (map) {
    answer = mapPrintHtml(map);
  } else if (match) {
    answer = matchPrintHtml(match, esc);
  } else if (q.form === 'mcq') {
    answer = `<div class="ex-opts">${(q.options ?? []).map((o, i) => `<span class="ex-opt"><b class="hb-box"></b>(${optionLabel(i)}) ${esc(o)}</span>`).join('')}</div>`;
  } else {
    const boxes = q.inputs
      .map((inp) => {
        const l = inp.label ? `<span class="hb-lab">${esc(inp.label)}</span>` : '';
        if (paperAnswer(q) === 'sentence') return '';
        if (inp.mode === 'choice' || inp.mode === 'multi') return `<div class="ex-opts">${(inp.choices ?? []).map((c) => `<span class="ex-opt"><b class="hb-box"></b>${esc(c)}</span>`).join('')}</div>`;
        if (inp.mode === 'abacus' || paperAnswer(q) !== 'boxes') return '';
        return `<div class="ex-ans">${l}<span class="hb-lab">Ans.</span><i class="ex-abox"></i></div>`;
      })
      .join('');
    const how = paperAnswer(q);
    const space = how === 'sentence' ? '' : how === 'boxes' && q.form === 'short' && q.inputs.some((i) => i.label?.startsWith('Word ')) ? '' : q.form === 'short' ? (how === 'lines' ? '<div class="ex-work ruled" style="height:14mm"></div>' : '<div class="ex-work" style="height:46px"></div>') : q.form === 'long' ? (q.lines ? `<div class="ex-work ruled" style="height:${q.lines * 7}mm"></div>` : '<div class="ex-work" style="height:90px"></div>') : q.form === 'word' ? '<div class="ex-work" style="height:130px"></div>' : '';
    answer = space + boxes;
  }
  const lead = q.lead ? `<p class="${q.alt ? 'ex-or' : 'ex-part-lead'}">${esc(q.lead)}</p>` : '';
  if (isInline(q)) return `${lead}<div class="ex-q">${lab}<div class="ex-qb ex-inline"><p class="hb-p">${esc(paperWords(q.prompt))}</p>${answer}</div></div>`;
  const tap = tapWordsOf(q);
  const text = tap ? `<p class="hb-p">${esc(paperWords(tap.instruction))}</p><p class="ex-sentence">${esc(tap.sentence)}</p>` : `<p class="hb-p">${esc(paperWords(q.prompt))}</p>`;
  return `${lead}<div class="ex-q">${lab}<div class="ex-qb">${text}${pic}${answer}</div></div>`;
}

function sectionBar(s: PaperSection, contd: boolean): string {
  const part = !contd && s.part ? `<div class="ex-part">Section ${esc(s.part.label)}: ${esc(s.part.title)}<span>${fmtMark(s.part.marks)} marks</span></div>` : '';
  const passage = !contd && s.passage ? `<div class="ex-passage"><b>${esc(s.passage.title)}</b>${s.passage.paragraphs.map((p) => `<p>${esc(p)}</p>`).join('')}</div>` : '';
  return part + sectionBarOnly(s, contd) + passage;
}

function sectionBarOnly(s: PaperSection, contd: boolean): string {
  return `<div class="ex-bar"><span><b>Q${s.number}.</b> ${esc(s.title)}${contd ? ' (contd.)' : ''}${s.instruction ? `<small> ${esc(s.instruction)}</small>` : ''}</span><span class="ex-marks">${esc(s.marksLabel.replace(/x/g, ' × ').replace(/=/g, ' = '))}</span></div>`;
}

const foot = (exam: Exam, n: number, total: number): string => `<footer class="hb-foot"><span>Made with Homework Buddy · Exam code ${esc(exam.code)}</span><span>Page ${n} of ${total}</span></footer>`;

export function keyEntryCount(exam: Exam): number {
  return exam.key.length;
}

function keyPagesHtml(exam: Exam, startPage: number, total: number): string[] {
  const pages: string[] = [];
  const per = 7;
  for (let i = 0; i < exam.key.length; i += per) {
    const rows = exam.key.slice(i, i + per);
    const body = rows
      .map(
        (k) =>
          `<li class="ex-keyq"><p><b>${esc(k.number)}</b> <span class="hb-marks">[${fmtMark(k.marks)}]</span> ${esc(k.prompt)}</p><p class="ex-keya">Answer: <b>${keyHtml(k.answers, esc).replace(/ &nbsp;\|&nbsp; /g, ' | ')}</b></p><ul class="ex-pts">${k.markingPoints.map((m) => `<li>${esc(m.text)} <small>(${fmtMark(m.marks)})</small></li>`).join('')}</ul></li>`,
      )
      .join('');
    const first = i === 0;
    pages.push(
      `<section class="hb-sheet hb-exam" aria-label="Answer key page ${pages.length + 1}">${first ? `<header class="ex-head"><h2>${esc(exam.header.examination)}: answer key and marking points</h2><p class="ex-session">For the grown-up. ${esc(exam.code)} · ${exam.totalMarks} marks</p><table class="ex-table"><thead><tr><th>Question</th><th>Section</th><th>Marks</th></tr></thead><tbody>${exam.marksTable.map((r) => `<tr><td>${esc(r.question)}</td><td>${esc(r.title)}</td><td>${esc(r.label.replace(/x/g, ' × ').replace(/=/g, ' = '))}</td></tr>`).join('')}</tbody></table></header>` : headN(exam)}<ol class="ex-keylist">${body}</ol>${foot(exam, startPage + pages.length, total)}</section>`,
    );
  }
  const maps = examMaps(exam);
  if (maps.length) pages.push(`<section class="hb-sheet hb-exam" aria-label="Answer map"><header class="ex-head"><h2>${esc(exam.header.examination)}: answer map</h2><p class="ex-session">For the grown-up. The numbers are the states and union territories; the places to look for are listed beside the map.</p></header>${mapKeyHtml({ task: 'label', places: maps.flatMap((m) => m.places) })}${foot(exam, startPage + pages.length, total)}</section>`);
  return pages;
}

/** Every map question's places, for the answer-map page. */
export const examMaps = (exam: Exam) => exam.sections.flatMap((s) => s.questions).map((q) => mapOf(q)).filter((m): m is NonNullable<typeof m> => m !== null);

export function examKeyPageCount(exam: Exam): number {
  return Math.ceil(exam.key.length / 7) + (examMaps(exam).length ? 1 : 0);
}

/** The school-style paper as pages, then the optional answer key pages. */
export function examSheetsHtml(exam: Exam, withKey: boolean): string {
  const pages = paginateExam(exam);
  const total = pages.length + (withKey ? examKeyPageCount(exam) : 0);
  const out = pages.map((items, pi) => {
    const multiOf = (s: PaperSection) => s.questions.length > 1;
    const body = items.map((it) => (it.head ? sectionBar(it.section, it.contd) : '') + questionHtml(it.q, multiOf(it.section))).join('');
    return `<section class="hb-sheet hb-exam" aria-label="Page ${pi + 1} of ${total}">${pi === 0 ? head1(exam) : headN(exam)}<div class="ex-qs">${body}</div>${foot(exam, pi + 1, total)}</section>`;
  });
  if (withKey) out.push(...keyPagesHtml(exam, pages.length + 1, total));
  return out.join('');
}

export const EXAM_CSS = `
.hb-exam .ex-head{border-bottom:2px solid var(--paper-ink);padding-bottom:8px;display:flex;flex-direction:column;gap:6px;text-align:center}
.hb-exam .ex-head h2{margin:0;font:700 24px/1.2 'Fredoka',system-ui,sans-serif;text-transform:none}
.hb-exam .ex-lbl{font-weight:600;font-size:16px}
.hb-exam .ex-school{margin:0;font-weight:800;font-size:17px;letter-spacing:.04em;text-transform:uppercase}
.hb-exam .ex-session{margin:0;font-weight:700}
.hb-exam .ex-meta{display:flex;flex-wrap:wrap;justify-content:space-between;gap:4px 16px;font-weight:700;border-top:1px solid var(--paper-grey);border-bottom:1px solid var(--paper-grey);padding:4px 0;font-size:14px}
.hb-exam .ex-id{display:flex;gap:24px;font-weight:700;text-align:left}
.hb-exam .ex-id p{display:flex;align-items:flex-end;gap:6px;flex:1;margin:0}
.hb-exam .ex-id i{flex:1;border-bottom:1.5px solid var(--paper-ink);height:1.2em}
.hb-exam .ex-instr{text-align:left;font-size:14px}
.hb-exam .ex-instr ol{margin:2px 0 0;padding-left:22px}
.hb-exam .ex-small h2{font-size:18px}
.hb-exam .ex-qs{display:flex;flex-direction:column;gap:10px;flex:1}
.hb-exam .ex-bar{display:flex;justify-content:space-between;gap:12px;border:1.5px solid var(--paper-ink);padding:5px 10px;font-weight:700;margin-top:6px;break-after:avoid}
.hb-exam .ex-bar small{font-weight:600;color:var(--paper-ink)}
.hb-exam .ex-part{display:flex;justify-content:space-between;font:600 17px 'Fredoka',system-ui,sans-serif;margin:8px 0 2px;border-bottom:2px solid var(--paper-ink)}
.hb-exam .ex-passage{border:1px solid var(--paper-grey);padding:6px 10px;margin:4px 0;font-size:14px}
.hb-exam .ex-passage p{margin:3px 0;white-space:pre-line}
.hb-exam .ex-sentence{font-size:17px;font-weight:700;margin:4px 0 2px;line-height:1.9}
.hb-exam .ex-work.ruled{background-image:repeating-linear-gradient(transparent,transparent 6.2mm,var(--paper-grey) 6.2mm,var(--paper-grey) 7mm)}
.hb-exam .ex-marks{white-space:nowrap}
.hb-exam .ex-or{margin:8px 0 2px;text-align:center;font-weight:800;letter-spacing:.2em;font-size:15px}
.hb-exam .ex-part-lead{margin:8px 0 2px;font-weight:800;font-size:15px}
.hb-exam .ex-q{display:flex;gap:8px;break-inside:avoid;padding:0 4px}
.hb-exam .ex-lab{font-weight:800;min-width:28px}
.hb-exam .ex-qb{flex:1;min-width:0}
.hb-exam .ex-opts{display:flex;flex-wrap:wrap;gap:6px 22px;margin:6px 0 0}
.hb-exam .ex-opt{display:inline-flex;align-items:center;gap:6px}
.hb-exam .ex-work{border-bottom:1px dotted var(--paper-grey)}
.hb-exam .ex-ans{display:flex;align-items:flex-end;gap:8px;margin:6px 0 0;justify-content:flex-end}
.hb-exam .hb-pic svg{height:auto;width:auto;max-width:100%;max-height:62mm}
.hb-exam .ex-inline{display:flex;justify-content:space-between;align-items:flex-end;gap:12px}
.hb-exam .ex-inline .ex-ans{margin:0;flex:none}
.hb-exam .ex-inline .hb-p{margin:0}
.hb-exam .ex-abox{display:inline-block;width:130px;height:28px;border:1.5px solid var(--paper-ink);border-radius:3px}
.hb-exam .ex-table{width:100%;border-collapse:collapse;text-align:left;font-size:14px}
.hb-exam .ex-table th,.hb-exam .ex-table td{border:1px solid var(--paper-ink);padding:3px 8px}
.hb-exam .ex-keylist{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:8px;flex:1}
.hb-exam .ex-keyq{border-bottom:1px dotted var(--paper-ink);padding-bottom:6px;font-size:14px}
.hb-exam .ex-keyq p{margin:0}
.hb-exam .ex-pts{margin:2px 0 0;padding-left:20px}
`;

export const EXAM_PAGE_CSS = SHEET_CSS + EXAM_CSS + PRINT_CSS;

export { pictureSizeMm };
