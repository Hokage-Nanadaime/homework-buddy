import { MIN_SAMPLE } from '../core/activity';
import { BOOKS } from '../core/books';
import { STAGES, TOTAL_CHAPTERS } from '../core/pip';
import { STAMP_DEFS } from '../core/stamps';
import { PORTIONS, examReadiness, type Compare, type HeatCell, type ReportModel } from '../core/report';
import { pipSVG, SA } from './art';

const esc = (s: unknown): string => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
export const fmtDay = (iso: string): string => new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const fmtDayYear = (iso: string): string => new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const BAND: Record<number, string> = { [-1]: 'Not enough data yet', 0: 'Not tried', 1: 'Practise first', 2: 'Practise', 3: 'Building', 4: 'Good', 5: 'Secure' };
const BANDR: Record<number, string> = { 1: 'under 50', 2: '50 to 64', 3: '65 to 79', 4: '80 to 89', 5: '90 and over' };
const bandOf = (c: HeatCell): number => (c.answers === 0 ? 0 : !c.enough ? -1 : c.pct! >= 90 ? 5 : c.pct! >= 80 ? 4 : c.pct! >= 65 ? 3 : c.pct! >= 50 ? 2 : 1);

export interface ReportOptions {
  /** a saved file has no controls */
  interactive: boolean;
  /** portion and paper size chosen for exam readiness */
  portion: string;
  marks: 25 | 50;
}

const table = (head: string[], rows: (string | number)[][], caption: string): string =>
  `<div class="tbl"><table class="t"><caption class="sr">${esc(caption)}</caption><thead><tr>${head.map((h) => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr><th scope="row" style="text-transform:none;letter-spacing:0;font-size:16px;color:var(--ink)">${esc(r[0]!)}</th>${r.slice(1).map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const thin = (txt: string): string => `<div class="callout"><b>Not enough data yet.</b> ${esc(txt)} A week needs at least ${MIN_SAMPLE} answers before a percentage is shown.</div>`;

interface Series {
  name: string;
  /** the label at the end of the line, when the name is long */
  short?: string;
  vals: (number | null)[];
  cls: 'c1' | 'c2' | 'c3';
  dash?: boolean;
  shape?: 'sq';
}
/** A line chart as SVG text: weeks along the bottom, gaps where a week had too few answers, a shape and a label for each line. */
export function lineChart(weeks: string[], series: Series[], o: { min: number; max: number; step: number; unit?: string; label: string }): string {
  const W = 520;
  const H = 260;
  const m = { l: 44, r: 118, t: 14, b: 34 };
  const iw = W - m.l - m.r;
  const ih = H - m.t - m.b;
  const n = weeks.length;
  const x = (i: number): number => m.l + (n === 1 ? iw / 2 : (iw * i) / (n - 1));
  const y = (v: number): number => m.t + ih * (1 - (v - o.min) / (o.max - o.min));
  const u = o.unit ?? '';
  let s = `<svg class="ax" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.label)}">`;
  for (let v = o.min; v <= o.max; v += o.step) s += `<line class="gl" x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}"/><text x="${m.l - 8}" y="${y(v) + 4}" text-anchor="end">${v}${u}</text>`;
  s += `<line class="al" x1="${m.l}" x2="${W - m.r}" y1="${m.t + ih}" y2="${m.t + ih}"/>`;
  weeks.forEach((w, i) => (s += i % 2 === (n - 1) % 2 || n <= 4 ? `<text x="${x(i)}" y="${H - 10}" text-anchor="middle">${esc(w)}</text>` : ''));
  // end-of-line labels: keep them apart when two lines finish close together
  const ends = series.map((se) => {
    let last = se.vals.length - 1;
    while (last > 0 && se.vals[last] === null) last--;
    const lv = se.vals[last];
    return { last, lv, y: lv === null || lv === undefined ? 0 : y(Math.min(o.max, Math.max(o.min, lv))) + 4 };
  });
  const order = ends.map((e, i) => i).sort((a, b) => ends[a]!.y - ends[b]!.y);
  for (let k = 1; k < order.length; k++) if (ends[order[k]!]!.y - ends[order[k - 1]!]!.y < 18) ends[order[k]!]!.y = ends[order[k - 1]!]!.y + 18;
  for (const se of series) {
    let d = '';
    let pen = false;
    se.vals.forEach((v, i) => {
      if (v === null) pen = false;
      else {
        d += `${pen ? 'L' : 'M'}${x(i)} ${y(Math.min(o.max, Math.max(o.min, v)))}`;
        pen = true;
      }
    });
    s += `<path class="ln ${se.cls}" d="${d}"${se.dash ? ' stroke-dasharray="7 5"' : ''}/>`;
    se.vals.forEach((v, i) => {
      if (v === null) return;
      const yy = y(Math.min(o.max, Math.max(o.min, v)));
      s += se.shape === 'sq' ? `<rect class="mkr ${se.cls}" x="${x(i) - 5}" y="${yy - 5}" width="10" height="10" rx="1.5"/>` : `<circle class="mkr ${se.cls}" cx="${x(i)}" cy="${yy}" r="5.5"/>`;
    });
    const e = ends[series.indexOf(se)]!;
    if (e.lv !== null && e.lv !== undefined) s += `<text class="lb" x="${x(e.last) + 12}" y="${e.y}">${se.name.length <= 9 ? `${esc(se.name)} ` : ''}${e.lv}${u}</text>`;
  }
  s += '</svg>';
  const legend = `<div class="legend2">${series.map((se) => `<span><svg viewBox="0 0 30 14" aria-hidden="true"><path class="ln ${se.cls}" d="M2 7H28"${se.dash ? ' stroke-dasharray="6 4"' : ''}/>${se.shape === 'sq' ? `<rect class="mkr ${se.cls}" x="10" y="2" width="10" height="10" rx="1.5"/>` : `<circle class="mkr ${se.cls}" cx="15" cy="7" r="5.5"/>`}</svg>${esc(se.name)}${se.dash ? ' (dashed)' : ''}</span>`).join('')}</div>`;
  return legend + s;
}

/** A small bar chart as SVG text, one bar a week with its number above. */
export function barChart(weeks: string[], vals: number[], o: { fill: string; label: string }): string {
  const W = 300;
  const H = 190;
  const m = { l: 8, r: 8, t: 24, b: 30 };
  const iw = W - m.l - m.r;
  const ih = H - m.t - m.b;
  const n = weeks.length;
  const bw = Math.min(40, iw / n - 6);
  const max = Math.max(1, ...vals) * 1.1;
  let s = `<svg class="ax" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.label)}"><line class="al" x1="${m.l}" x2="${W - m.r}" y1="${m.t + ih}" y2="${m.t + ih}"/>`;
  weeks.forEach((w, i) => {
    const cx = m.l + (iw * (i + 0.5)) / n;
    const v = vals[i] ?? 0;
    s += `<text x="${cx}" y="${H - 10}" text-anchor="middle">${esc(w)}</text>`;
    const hh = v === 0 ? 0 : Math.max(3, (ih * v) / max);
    s += `<rect x="${cx - bw / 2}" y="${m.t + ih - hh}" width="${bw}" height="${hh}" rx="4" fill="${o.fill}"/>`;
    s += `<text class="lbv" x="${cx}" y="${m.t + ih - hh - 6}" text-anchor="middle">${v}</text>`;
  });
  return `${s}</svg>`;
}

const cmpRow = (label: string, c: Compare, cls: string): string => {
  if (c.base === null || c.now === null) return `<div class="cmp-r ${cls}"><b>${label}</b><span class="muted">${c.base === null ? `Only ${c.baseAnswers} first answers` : 'No recent weeks yet'}</span><span class="muted">Not enough data yet</span></div>`;
  const left = Math.min(c.base, c.now);
  const w = Math.abs(c.now - c.base);
  const diff = c.now - c.base;
  return `<div class="cmp-r ${cls}"><b>${label}</b><div class="track" aria-hidden="true"><span class="sg" style="left:${left}%;width:${w}%"></span><span class="d" style="left:${c.base}%"></span><span class="d now" style="left:${c.now}%"></span></div><div><b class="num">${c.base}% → ${c.now}%</b><br>${diff >= 0 ? `up ${diff}` : `down ${-diff}`} points</div></div>`;
};

/** A short name for the end of a line: the part before a colon or bracket, at most 16 letters. */
const shortName = (t: string): string => { const b = t.split(/[:(]/)[0]!.trim(); return b.length > 16 ? `${b.slice(0, 15).trim()}…` : b; };
const pctText = (v: number | null): string => (v === null ? 'not enough data yet' : `${v}%`);

/** The whole report as HTML text: the same text for the page and for the saved file. */
export function reportHtml(m: ReportModel, o: ReportOptions): string {
  const nm = esc(m.name);
  let h = '';
  const startText = fmtDayYear(m.historyStart);
  h += `<header><p class="label">Homework Buddy · progress report for a grown-up</p><h1>${nm}'s progress</h1><div class="meta"><span>Week of ${fmtDay(m.weeks.at(-1)!)}</span><span><b>History starts on ${startText}.</b> ${m.before ? `Before logging: ${m.before.answers} answers in ${m.before.sets} sets${m.before.pct !== null ? `, ${m.before.pct}% right` : ''} (counted before logging, not dated).` : 'Before logging: nothing counted.'}</span></div><p class="muted small">Compared only with ${nm}'s own past. No ranking, no comparison with other children. History only grows when sets are finished.</p></header>`;

  if (m.empty) {
    h += `<section class="sec"><div class="callout"><b>No sets finished yet.</b> The story starts when ${nm} finishes a first set: this page then fills in with real numbers. Until then, nothing is guessed.</div></section>`;
  }

  // 1 baseline
  const b = m.baseline;
  h += `<section class="sec" id="baseline" aria-labelledby="s1"><h2 id="s1"><span class="nm">1</span>Where ${nm} started and where ${nm} is now</h2>`;
  if (b.overall.base !== null && b.overall.now !== null) {
    h += `<p class="lede">Right answers went from <b>${b.overall.base}%</b> in the first ${b.overall.baseAnswers} answers${b.from ? ` (${fmtDay(b.from)}${b.to && b.to !== b.from ? ` to ${fmtDay(b.to)}` : ''})` : ''} to <b>${b.overall.now}%</b> in the last two weeks (${b.overall.nowAnswers} answers). The baseline is the first 20 answers of every topic and level, kept for ever.</p>`;
    h += `<div class="viz">${cmpRow('Overall', b.overall, 'c4')}${cmpRow('Maths', b.maths, 'c1')}${cmpRow('English', b.english, 'c2')}${b.evs ? cmpRow('EVS', b.evs, 'c3') : ''}<div class="axisrow" aria-hidden="true"><span></span><div><span>0%</span><span>50%</span><span>100%</span></div><span></span></div><p class="small muted">Hollow dot: baseline. Solid dot: now.</p></div>`;
    h += table(['Area', 'Baseline', 'Now', 'Change'], [['Overall', b.overall], ['Maths', b.maths], ['English', b.english]].map(([l, c]) => { const cc = c as Compare; return [l as string, pctText(cc.base), pctText(cc.now), cc.base !== null && cc.now !== null ? `${cc.now - cc.base >= 0 ? '+' : ''}${cc.now - cc.base} points` : 'not enough data yet']; }), 'Baseline against now');
  } else if (b.overall.base === null) {
    h += thin(`${nm} has ${b.overall.baseAnswers} first answers so far.`);
  } else {
    h += `<p class="lede">Baseline: the first ${b.overall.baseAnswers} answers were <b>${b.overall.base}%</b> right. There is no "now" yet.</p>${thin(`The last two weeks have ${b.overall.nowAnswers} answers.`)}`;
  }
  h += '</section>';

  // 2 weekly
  h += `<section class="sec" id="weekly" aria-labelledby="s2"><h2 id="s2"><span class="nm">2</span>Weekly growth by subject</h2>`;
  const anyWeek = m.subject.overall.some((v) => v !== null);
  if (anyWeek) {
    h += `<p class="lede">Percentage of answers right each week. A week with fewer than ${MIN_SAMPLE} answers is left as a gap.</p><div class="viz">${lineChart(m.weeks.map(fmtDay), [{ name: 'Maths', vals: m.subject.maths, cls: 'c1' }, { name: 'English', vals: m.subject.english, cls: 'c2', shape: 'sq' }, ...(m.subject.evs ? [{ name: 'EVS', vals: m.subject.evs, cls: 'c3' as const, dash: true }] : [])], { min: 0, max: 100, step: 25, unit: '%', label: 'Weekly accuracy by subject' })}</div>`;
    h += table(['Week of', 'Maths', 'English', ...(m.subject.evs ? ['EVS'] : []), 'Overall'], m.weeks.map((w, i) => [fmtDay(w), pctText(m.subject.maths[i]!), pctText(m.subject.english[i]!), ...(m.subject.evs ? [pctText(m.subject.evs[i]!)] : []), pctText(m.subject.overall[i]!)]), 'Weekly accuracy by subject');
  } else h += thin('Weekly growth appears after the first week with 10 answers.');
  h += '</section>';

  // 3 topics
  h += `<section class="sec" id="topics" aria-labelledby="s3"><h2 id="s3"><span class="nm">3</span>Real growth and a plateau</h2>`;
  if (m.topics.length > 0) {
    const [t1, t2] = m.topics;
    const sentence = m.topics.map((t) => `${esc(t.title)}: ${t.from}% to ${t.to}%`).join('. ');
    h += `<p class="lede">The topics with the most weeks of real data, side by side. ${sentence}.</p><div class="viz">${lineChart(m.weeks.map(fmtDay), [{ name: t1!.title, short: shortName(t1!.title), vals: t1!.series, cls: 'c1' }, ...(t2 ? [{ name: t2.title, short: shortName(t2.title), vals: t2.series, cls: 'c3' as const, dash: true }] : [])], { min: 0, max: 100, step: 25, unit: '%', label: 'Weekly accuracy, two topics' })}</div>`;
    h += table(['Week of', ...m.topics.map((t) => t.title)], m.weeks.map((w, i) => [fmtDay(w), ...m.topics.map((t) => pctText(t.series[i]!))]), 'Weekly accuracy, two topics');
    h += `<div class="notes">${m.topics.map((t) => `<p><span class="pill2">${t.kind === 'growing' ? 'Growing' : t.kind === 'plateau' ? 'Plateau' : 'Steady'}</span><span>${esc(t.title)}: ${t.from}% to ${t.to}% (${t.to! - t.from! >= 0 ? '+' : ''}${t.to! - t.from!} points)${t.kind === 'plateau' ? `, flat across ${t.weeksWithData} weeks. A different kind of practice may help (see section 9).` : '.'}</span></p>`).join('')}</div>`;
  } else h += thin('Topic trends need at least 10 answers in a topic in two different weeks.');
  h += '</section>';

  // 4 heat
  h += `<section class="sec" id="heat" aria-labelledby="s4"><h2 id="s4"><span class="nm">4</span>Chapter heat map</h2><p class="lede">Every cell shows its percentage as a number and a word. The key names each shade, from Secure (most answers right) to Practise first. Chapters with fewer than ${MIN_SAMPLE} answers show a question mark.</p>`;
  h += `<div class="legend3 viz" aria-label="Key">${[5, 4, 3, 2, 1, 0].map((k) => `<span class="sw"><i class="b${k}"></i>${BAND[k]}${k ? ` (${BANDR[k]})` : ''}</span>`).join('')}</div><div class="hm viz" role="list">`;
  for (const { id: book, title } of BOOKS) {
    h += `<div class="hbook" role="presentation">${title}</div>`;
    for (const c of m.heat.filter((x) => x.book === book)) {
      const k = bandOf(c);
      const val = c.answers === 0 ? '–' : !c.enough ? '?' : `${c.pct}%`;
      h += `<div class="hc b${k < 0 ? 0 : k}" role="listitem" aria-label="${esc(`${c.label}: ${c.answers === 0 ? 'not tried' : !c.enough ? 'not enough data yet' : `${c.pct} per cent, ${BAND[k]}`}`)}"><small>${esc(c.label)}</small><b class="num">${val}</b><em>${BAND[k]}</em></div>`;
    }
  }
  h += '</div>' + table(['Chapter', 'Answers', 'Right', 'Band'], m.heat.map((c) => [c.label, c.answers, c.answers === 0 ? '–' : !c.enough ? 'not enough data yet' : `${c.pct}%`, BAND[bandOf(c)]!]), 'Accuracy by chapter') + '</section>';

  // 5 levels
  h += `<section class="sec" id="levels" aria-labelledby="s5"><h2 id="s5"><span class="nm">5</span>Level progress</h2><p class="lede">A level counts as passed in a chapter when every topic has a set at that level with at least 3 answers and 70% right.</p><div class="viz" style="display:grid;gap:12px">`;
  for (const l of m.levels) h += `<div class="lvrow"><b>${l.level === 'easy' ? 'Easy' : l.level === 'medium' ? 'Medium' : 'Challenge'}</b><div class="bar" role="img" aria-label="${l.passed} of ${l.of} chapters passed"><i style="width:${(l.passed / l.of) * 100}%"></i></div><span>Passed in ${l.passed} of ${l.of} chapters · tried in ${l.tried}</span></div>`;
  h += '</div>' + table(['Level', 'Passed', 'Tried', 'Of'], m.levels.map((l) => [l.level, l.passed, l.tried, l.of]), 'Level progress') + '</section>';

  // 6 habit
  const hw = m.weeks.slice(-m.habit.days.length).map(fmtDay);
  /** bar labels: the day number, with the month where it changes, so six labels fit in a small chart */
  const short = hw.map((w, i) => (i === 0 || w.split(' ')[1] !== hw[i - 1]!.split(' ')[1] ? w : w.split(' ')[0]!));
  const noPractice = m.habit.days.every((d) => d === 0);
  h += `<section class="sec" id="habit" aria-labelledby="s6"><h2 id="s6"><span class="nm">6</span>Habit: days, minutes and sets</h2><div class="tiles"><div class="tile"><b class="num">${m.habit.thisWeek.days}</b><span>days practised this week</span></div><div class="tile"><b class="num">${m.habit.thisWeek.mins}</b><span>minutes this week</span></div><div class="tile"><b class="num">${m.habit.thisWeek.sets}</b><span>sets finished this week</span></div></div>`;
  h += noPractice ? `<p class="viz lede">No practice in these weeks yet. The charts start when the first set is finished.</p>` : `<div class="cols viz"><div><h3>Days a week</h3>${barChart(short, m.habit.days, { fill: 'var(--accent)', label: 'Days practised each week' })}</div><div><h3>Minutes a week</h3>${barChart(short, m.habit.mins, { fill: 'var(--accent)', label: 'Minutes practised each week' })}</div><div><h3>Sets a week</h3>${barChart(short, m.habit.sets, { fill: 'var(--accent)', label: 'Sets finished each week' })}</div></div>`;
  h += table(['Week of', 'Days', 'Minutes', 'Sets'], hw.map((w, i) => [w, m.habit.days[i]!, m.habit.mins[i]!, m.habit.sets[i]!]), 'Weekly habit') + `<p class="small muted">Daily goal set for ${nm}: ${m.habit.goal} minutes. A missed day never breaks a streak.</p></section>`;

  // 7 typing
  h += `<section class="sec" id="typing" aria-labelledby="s7"><h2 id="s7"><span class="nm">7</span>Typing growth</h2>`;
  if (m.typing.wpm.some((v) => v !== null)) {
    const helpWords = m.typing.helpOff === 0 ? 'Keyboard help was on in every session.' : m.typing.helpOff === m.typing.sessions ? 'Keyboard help was off in every session.' : `Keyboard help was off in ${m.typing.helpOff} of ${m.typing.sessions} sessions: growth with help off is the real growth.`;
    h += `<p class="lede">From Word Quest: words a minute and how many letters were right. ${helpWords}</p><div class="cols viz"><div><h3>Words a minute</h3>${lineChart(m.typing.weeks.map(fmtDay), [{ name: 'Words a minute', vals: m.typing.wpm, cls: 'c1' }], { min: 0, max: Math.max(20, Math.ceil(Math.max(...(m.typing.wpm.filter((v) => v !== null) as number[])) / 5) * 5), step: 5, label: 'Words a minute each week' })}</div><div><h3>Right letters</h3>${lineChart(m.typing.weeks.map(fmtDay), [{ name: 'Right letters', vals: m.typing.acc, cls: 'c3' }], { min: 50, max: 100, step: 10, unit: '%', label: 'Right letters each week' })}</div></div>`;
    h += table(['Week of', 'Words a minute', 'Right letters', 'Keyboard help'], m.typing.weeks.map((w, i) => [fmtDay(w), m.typing.wpm[i] ?? 'not enough data yet', m.typing.acc[i] === null ? 'not enough data yet' : `${m.typing.acc[i]}%`, m.typing.help[i] ?? '–']), 'Typing growth');
  } else h += thin(m.typing.sessions > 0 ? `${nm} has played Word Quest ${m.typing.sessions} ${m.typing.sessions === 1 ? 'time' : 'times'}; a week needs about a minute of typing and 50 letters.` : `${nm} has not played Word Quest yet.`);
  h += '</section>';

  // 8 exam
  const portion = PORTIONS.find((p) => p.key === o.portion) ?? PORTIONS[0]!;
  const r = examReadiness(m, portion, o.marks);
  h += `<section class="sec" id="exam" aria-labelledby="s8"><h2 id="s8"><span class="nm">8</span>Exam readiness</h2>`;
  h += o.interactive
    ? `<div class="rep-bar"><label class="label" for="exsel">Portion</label><select id="exsel" data-act="portion" class="txt" style="min-width:240px;max-width:100%">${PORTIONS.map((p) => `<option value="${p.key}"${p.key === portion.key ? ' selected' : ''}>${esc(p.title)}</option>`).join('')}</select><label class="label" for="exmarks">Paper</label><select id="exmarks" data-act="marks" class="txt" style="min-width:200px;max-width:100%"><option value="25"${o.marks === 25 ? ' selected' : ''}>Periodic Test, 25 marks</option><option value="50"${o.marks === 50 ? ' selected' : ''}>Term Exam, 50 marks</option></select></div>`
    : `<p><b>${esc(r.title)}</b></p>`;
  h += `<div class="exbig"><div style="display:grid;gap:10px;align-content:start"><p class="ready">${r.word}</p><p><span class="label">Likely mark</span><br><b style="font-size:22px;font-family:var(--display);font-weight:500">${r.range ? `${r.range[0]} to ${r.range[1]} of ${r.marks}` : 'Not enough data yet'}</b>${r.range ? `<br><span class="small"><b>A rough guide, not a prediction; real papers differ.</b></span><br><span class="small muted">Average accuracy on the chosen chapters, minus 10 to plus 5 points; untried chapters count as zero.</span>` : ''}</p>${r.weakest ? `<p><span class="label">Weakest</span><br>${esc(r.weakest)}</p>` : ''}<p class="muted">${esc(r.say)}</p></div><div class="viz" style="display:grid;gap:8px">${r.chapters.map((c) => `<div class="lvrow" style="grid-template-columns:minmax(0,1.4fr) minmax(0,1fr) 90px"><span>${esc(c.label)}</span><div class="bar" role="img" aria-label="${c.pct === null ? 'not enough data yet' : `${c.pct} per cent`}"><i style="width:${c.pct ?? 0}%"></i></div><b class="num">${c.pct === null ? (c.enough ? 'Not tried' : '?') : `${c.pct}%`}</b></div>`).join('')}</div></div>`;
  h += table(['Chapter', 'Right'], r.chapters.map((c) => [c.label, c.pct === null ? 'not enough data yet' : `${c.pct}%`]), 'Chapters in the portion');
  if (r.recent.length > 0) h += `<p class="small muted">Recent practice exams: ${r.recent.map((e) => `${esc(e.label)} ${e.got} of ${e.of} (${fmtDay(e.at)})`).join('; ')}.</p>`;
  h += '</section>';

  // 9 next
  h += `<section class="sec" id="next" aria-labelledby="s9"><h2 id="s9"><span class="nm">9</span>What to practise next</h2>`;
  h += m.next.length > 0
    ? `<ol class="nx">${m.next.map((t, i) => `<li><span class="no" aria-hidden="true">${i + 1}</span><span class="tx">${esc(t.text)}</span>${o.interactive && t.chapterKey ? `<button class="btn quiet" data-open="${t.chapterKey}">Open chapter</button>` : ''}</li>`).join('')}</ol><p class="small muted">Chosen by plain rules: the lowest accuracy with enough answers, chapters still being read, a Challenge not yet tried, and topics not practised for a while.</p>`
    : `<p class="lede">Nothing stands out yet. Keep going: a few sets in any chapter give the page something to say.</p>`;
  h += '</section>';

  // 10 rewards
  h += `<section class="sec" id="rewards" aria-labelledby="s10"><h2 id="s10"><span class="nm">10</span>Rewards at a glance</h2><div class="pipline"><div>${pipSVG(m.pip.stage, `Pip, ${STAGES[m.pip.stage]!.name}`, '', {})}</div><div style="display:grid;gap:6px"><p><b>Pip is a ${m.pip.stageName.toLowerCase()}</b> (stage ${m.pip.stage + 1} of ${STAGES.length}). ${m.pip.done} of ${TOTAL_CHAPTERS} chapters are Done${m.pip.nextName ? `, ${m.pip.toNext} more to a ${m.pip.nextName.toLowerCase()}.` : '.'}${m.pip.orchard ? ` Orchard ${m.pip.orchard}: that many small trees and garden friends planted after the Fruit Tree.` : ''}</p><p>Stamps: ${m.stamps.count} of ${STAMP_DEFS.length}.${m.stamps.recent.length ? ` Latest: ${m.stamps.recent.map((d) => esc(d.name)).join(', ')}.` : ''}</p><p class="small muted">It describes effort, never a score against anyone.</p></div>${m.stamps.recent.length ? `<div style="display:flex;gap:8px">${m.stamps.recent.slice(0, 3).map((d) => `<span style="width:64px;display:block">${SA.stamp(d, { deco: true })}</span>`).join('')}</div>` : ''}</div></section>`;

  // 11 marks
  if (m.marks) h += `<section class="sec" id="marks" aria-labelledby="s11"><h2 id="s11"><span class="nm">11</span>Written answers you marked</h2><p class="lede">In the last six weeks the AI suggested a mark for ${m.marks.total} written ${m.marks.total === 1 ? 'answer' : 'answers'}. You accepted ${m.marks.accepted} unchanged and changed ${m.marks.changed}. The mark that counts is always yours.</p></section>`;

  h += `<div class="foot"><span>Sets are marked by the app; written answers by a grown-up. Counts only, no questions or answers are stored.</span><span>Report made ${fmtDayYear(new Date().toISOString())}</span></div>`;
  return h;
}
