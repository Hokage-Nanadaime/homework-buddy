import { fmtMark } from '../core/markText';
import { mapOf } from '../core/mapQuestion';
import { INDIA_BLANK, INDIA_KEY } from './mapSvg';
import { drawMap } from './pdfMap';
import { isPairLines, matchOf } from '../core/match';
import { drawMatch } from './pdfMatch';
import { jsPDF } from 'jspdf';
import { renderDiagram } from '../core/draw';
import type { Exam, PaperQuestion, PaperSection } from '../core/exam';
import { paperAnswer, paperWords, tapWordsOf } from '../core/kinds';
import { examKeyPageCount, optionLabel, paginateExam } from '../core/examPrint';
import { pictureSizeMm } from '../core/picture';
import { pdfText, rasterise } from './pdf';

const INK: [number, number, number] = [26, 26, 26];
const GREY: [number, number, number] = [90, 90, 90];
const M = 14;
const W = 210;
const BOTTOM = 297 - 18;

const marksText = (s: string): string => s.replace(/x/g, ' x ').replace(/=/g, ' = ');

/** The school-style paper as a PDF, page by page like the preview. */
export async function buildExamPdf(exam: Exam, withKey: boolean): Promise<Blob> {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const pages = paginateExam(exam);
  const total = pages.length + (withKey ? examKeyPageCount(exam) : 0);
  const pics = new Map<string, Awaited<ReturnType<typeof rasterise>>>();
  await Promise.all(exam.sections.flatMap((s) => s.questions).map(async (q) => q.diagram && pics.set(q.id, await rasterise(renderDiagram(q.diagram)))));
  const maps = exam.sections.flatMap((s) => s.questions).map((q) => mapOf(q)).filter((m): m is NonNullable<typeof m> => m !== null);
  const mapPic = maps.length ? await rasterise(INDIA_BLANK) : null;
  const keyPic = withKey && maps.length ? await rasterise(INDIA_KEY) : null;
  let pageNo = 0;
  let y = 0;
  const footer = () => {
    pdf.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...GREY);
    pdf.text(pdfText(`Made with Homework Buddy - Exam code ${exam.code}`), M, 297 - 9);
    pdf.text(`Page ${pageNo} of ${total}`, W - M, 297 - 9, { align: 'right' });
  };
  const newPage = () => {
    if (pageNo > 0) pdf.addPage();
    pageNo++;
  };
  const idLines = () => {
    pdf.setFont('helvetica', 'bold').setFontSize(11).setTextColor(...INK).setDrawColor(...INK).setLineWidth(0.3);
    pdf.text('Name:', M, y);
    pdf.line(M + 14, y + 0.6, 112, y + 0.6);
    pdf.text('Roll no.:', 120, y);
    pdf.line(138, y + 0.6, W - M, y + 0.6);
    y += 7;
  };
  const header = (first: boolean) => {
    newPage();
    y = M + 4;
    pdf.setTextColor(...INK);
    if (first) {
      if (exam.header.school) {
        pdf.setFont('helvetica', 'bold').setFontSize(13).text(pdfText(exam.header.school.toUpperCase()), W / 2, y, { align: 'center' });
        y += 7;
      }
      pdf.setFont('helvetica', 'bold').setFontSize(16).text(pdfText(`Name of Examination : ${exam.header.examination}`), W / 2, y, { align: 'center' });
      y += 6;
      pdf.setFont('helvetica', 'normal').setFontSize(11).text(pdfText(`Session ${exam.header.session}`), W / 2, y, { align: 'center' });
      y += 5;
      pdf.setDrawColor(...INK).setLineWidth(0.3).line(M, y, W - M, y);
      y += 5;
      pdf.setFont('helvetica', 'bold').setFontSize(10);
      pdf.text(pdfText(`Subject: ${exam.header.subject}`), M, y);
      pdf.text(pdfText(`Class : ${exam.header.className}`), 70, y);
      pdf.text(`Time : ${exam.minutes} min.`, 120, y);
      pdf.text(`MM: ${exam.totalMarks}`, W - M, y, { align: 'right' });
      y += 3;
      pdf.line(M, y, W - M, y);
      y += 8;
      idLines();
      y += 1;
      pdf.setFont('helvetica', 'bold').setFontSize(10).text('General Instructions:-', M, y);
      y += 5;
      pdf.setFont('helvetica', 'normal');
      exam.instructions.forEach((t, i) => {
        pdf.text(pdfText(`${i + 1}. ${t}`), M + 3, y);
        y += 5;
      });
      pdf.setLineWidth(0.6).line(M, y, W - M, y);
      y += 6;
    } else {
      pdf.setFont('helvetica', 'bold').setFontSize(10).text(pdfText(`${exam.header.examination} · Class ${exam.header.className} · ${exam.header.subject}`.replace('·', '-').replace('·', '-')), M, y);
      y += 8;
      idLines();
      pdf.setLineWidth(0.4).line(M, y, W - M, y);
      y += 6;
    }
  };
  const partAndPassage = (sec: PaperSection) => {
    if (sec.part) {
      pdf.setFont('helvetica', 'bold').setFontSize(12).setTextColor(...INK);
      pdf.text(pdfText(`Section ${sec.part.label}: ${sec.part.title}`), M, y);
      pdf.text(`${fmtMark(sec.part.marks)} marks`, W - M, y, { align: 'right' });
      pdf.setDrawColor(...INK).setLineWidth(0.6).line(M, y + 1.5, W - M, y + 1.5);
      y += 8;
    }
  };
  const passageBlock = (sec: PaperSection) => {
    if (!sec.passage) return;
    pdf.setFont('helvetica', 'bold').setFontSize(10.5).setTextColor(...INK).text(pdfText(sec.passage.title), M + 2, y);
    y += 5;
    pdf.setFont('helvetica', 'normal').setFontSize(10.5);
    for (const para of sec.passage.paragraphs) {
      const ls = pdf.splitTextToSize(pdfText(para), W - 2 * M - 4) as string[];
      pdf.text(ls, M + 2, y);
      y += ls.length * 4.6 + 1.5;
    }
    y += 3;
  };
  const bar = (n: number, title: string, instr: string, marks: string, contd: boolean) => {
    pdf.setDrawColor(...INK).setLineWidth(0.4).rect(M, y - 5, W - 2 * M, 8);
    pdf.setFont('helvetica', 'bold').setFontSize(10.5).setTextColor(...INK);
    pdf.text(pdfText(`Q${n}. ${title}${contd ? ' (contd.)' : ''}`), M + 2, y);
    const tw = pdf.getTextWidth(pdfText(`Q${n}. ${title}${contd ? ' (contd.)' : ''}`));
    pdf.setFont('helvetica', 'normal').setFontSize(9).text(pdfText(instr), M + 5 + tw, y);
    pdf.setFont('helvetica', 'bold').setFontSize(10.5).text(pdfText(marksText(marks)), W - M - 2, y, { align: 'right' });
    y += 9;
  };

  const drawQuestion = (q: PaperQuestion, multi: boolean) => {
    if (q.lead) {
      pdf.setFont('helvetica', 'bold').setFontSize(10.5).setTextColor(...INK);
      if (q.alt) pdf.text(pdfText(q.lead), W / 2, y, { align: 'center' });
      else pdf.text(pdfText(q.lead), M + 2, y);
      y += 7;
    }
    const x0 = M + (multi ? 9 : 2);
    const inline = (q.form === 'blank' || q.form === 'oneword') && q.inputs.length === 1 && q.inputs[0]!.mode !== 'choice' && q.inputs[0]!.mode !== 'multi' && q.inputs[0]!.mode !== 'abacus' && !q.diagram;
    const textW = W - M - x0 - (inline ? 58 : 0);
    pdf.setFont('helvetica', 'normal').setFontSize(10.5).setTextColor(...INK);
    const tap = tapWordsOf(q);
    const lines = pdf.splitTextToSize(pdfText(paperWords(tap ? `${tap.instruction}\n${tap.sentence}` : q.prompt)), textW) as string[];
    if (multi) pdf.setFont('helvetica', 'bold').text(`(${q.label})`, M + 1, y);
    pdf.setFont('helvetica', 'normal').text(lines, x0, y);
    if (inline) {
      const inp = q.inputs[0]!;
      const label = pdfText(`${inp.label ? `${inp.label}  ` : ''}Ans.`);
      pdf.setDrawColor(...INK).setLineWidth(0.3).setFontSize(9).setTextColor(...GREY).text(label, W - M - 38 - pdf.getTextWidth(label), y);
      pdf.setTextColor(...INK).rect(W - M - 36, y - 5, 36, 8);
      y += Math.max(lines.length * 4.6 + 1, 8) + 2;
      return;
    }
    y += lines.length * 4.6 + 1;
    const pic = pics.get(q.id);
    if (q.diagram) {
      if (pic) {
        const sz = pictureSizeMm(pic.cw, pic.ch, q.diagram.kind, textW);
        pdf.addImage(pic.data, 'PNG', x0, y, (sz.w * pic.w) / pic.cw, (sz.h * pic.h) / pic.ch);
        y += (sz.h * pic.h) / pic.ch + 3;
      } else {
        pdf.setFont('helvetica', 'italic').setFontSize(9).setTextColor(...GREY).text(pdfText(`(Picture: ${q.diagram.alt})`), x0, y + 3);
        pdf.setTextColor(...INK).setFontSize(11);
        y += 6;
      }
    }
    const match = q.form === 'mcq' ? null : matchOf(q);
    const map = q.form === 'mcq' ? null : mapOf(q);
    if (map) {
      y += drawMap(pdf, mapPic, map, x0, y - 1, textW, pdfText, INK, GREY) + 2;
      pdf.setTextColor(...INK);
      return;
    }
    if (match) {
      y += drawMatch(pdf, match, x0, y - 1, textW, pdfText, INK, GREY) + 2;
      pdf.setTextColor(...INK);
      return;
    }
    pdf.setDrawColor(...INK).setLineWidth(0.3).setFont('helvetica', 'normal').setFontSize(10.5);
    const optionRow = (labels: string[]) => {
      let x = x0;
      for (const l of labels) {
        const cw = pdf.getTextWidth(l) + 13;
        if (x + cw > W - M) {
          x = x0;
          y += 7;
        }
        pdf.rect(x, y - 3, 3.6, 3.6);
        pdf.text(l, x + 5.5, y);
        x += cw + 5;
      }
      y += 8;
    };
    if (q.form === 'mcq') {
      optionRow((q.options ?? []).map((o, i) => pdfText(`(${optionLabel(i)}) ${o}`)));
    } else {
      const how = paperAnswer(q);
      const space = how === 'sentence' ? 0 : how === 'boxes' && q.form === 'short' && q.inputs.some((i) => i.label?.startsWith('Word ')) ? 0 : q.form === 'short' ? 12 : q.form === 'long' ? (q.lines ? q.lines * 7 : 28) : q.form === 'word' ? 40 : 0;
      if (space) {
        pdf.setDrawColor(190, 190, 190);
        for (let k = 1; k <= Math.floor(space / 7); k++) pdf.line(x0, y + k * 7 - 3, W - M, y + k * 7 - 3);
        pdf.setDrawColor(...INK);
        y += space;
      }
      for (const inp of q.inputs) {
        if (paperAnswer(q) === 'sentence') continue;
        if (inp.mode === 'choice' || inp.mode === 'multi') optionRow((inp.choices ?? []).map(pdfText));
        else if (inp.mode !== 'abacus' && paperAnswer(q) === 'boxes') {
          const label = pdfText(`${inp.label ? `${inp.label}  ` : ''}Ans.`);
          pdf.setTextColor(...GREY).text(label, W - M - 52 - pdf.getTextWidth(label), y + 4);
          pdf.setTextColor(...INK).rect(W - M - 50, y - 2, 50, 8);
          y += 11;
        }
      }
    }
    y += 2;
  };

  pages.forEach((items, pi) => {
    header(pi === 0);
    let over = false;
    for (const it of items) {
      if (over) {
        footer();
        header(false);
        over = false;
      }
      if (it.head && !it.contd) partAndPassage(it.section);
      if (it.head) bar(it.section.number, it.section.title, it.section.instruction, it.section.marksLabel, it.contd);
      if (it.head && !it.contd) passageBlock(it.section);
      drawQuestion(it.q, it.section.questions.length > 1);
      if (y > BOTTOM) over = true;
    }
    footer();
  });

  if (withKey) {
    const per = 7;
    for (let i = 0; i < exam.key.length; i += per) {
      newPage();
      y = M + 4;
      pdf.setTextColor(...INK).setFont('helvetica', 'bold').setFontSize(i === 0 ? 15 : 11);
      pdf.text(pdfText(i === 0 ? `${exam.header.examination}: answer key and marking points` : `${exam.header.examination}: answer key`), M, y);
      y += 6;
      pdf.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...GREY).text(pdfText(`For the grown-up. ${exam.code} - ${exam.totalMarks} marks`), M, y);
      y += 7;
      if (i === 0) {
        for (const r of exam.marksTable) {
          pdf.setTextColor(...INK).setFontSize(10).text(pdfText(`${r.question}  ${r.title}`), M, y);
          pdf.text(pdfText(marksText(r.label)), W - M, y, { align: 'right' });
          y += 5;
        }
        y += 4;
      }
      for (const k of exam.key.slice(i, i + per)) {
        pdf.setFont('helvetica', 'bold').setFontSize(10).setTextColor(...INK);
        const head = pdf.splitTextToSize(pdfText(`${k.number} [${fmtMark(k.marks)}]  ${k.prompt}`), W - 2 * M) as string[];
        pdf.text(head.slice(0, 3), M, y);
        y += Math.min(3, head.length) * 4.5;
        const ans = pdf.setFont('helvetica', 'normal').splitTextToSize(pdfText(`Answer: ${isPairLines(k.answers) ? k.answers.join('\n') : k.answers.join(' | ')}`), W - 2 * M - 6) as string[];
        pdf.text(ans, M + 3, y);
        y += ans.length * 4.5;
        pdf.setTextColor(...GREY).setFontSize(9);
        for (const m of k.markingPoints) {
          const l = pdf.splitTextToSize(pdfText(`- ${m.text} (${fmtMark(m.marks)})`), W - 2 * M - 6) as string[];
          pdf.text(l, M + 5, y);
          y += l.length * 4;
        }
        y += 3;
        if (y > BOTTOM - 22) {
          footer();
          newPage();
          y = M + 4;
        }
      }
      footer();
    }
    if (maps.length) {
      newPage();
      y = M + 4;
      pdf.setTextColor(...INK).setFont('helvetica', 'bold').setFontSize(15).text(pdfText(`${exam.header.examination}: answer map`), M, y);
      y += 8;
      pdf.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...GREY).text(pdfText('For the grown-up. The numbers are the states and union territories listed beside the map.'), M, y);
      y += 6;
      drawMap(pdf, keyPic, { task: 'label', places: maps.flatMap((m) => m.places) }, M, y, W - 2 * M, pdfText, INK, GREY, true);
      footer();
    }
  }
  return pdf.output('blob');
}
