import { useMemo, useState } from 'preact/hooks';
import type { ActivityLog } from '../core/activity';
import type { Kid } from '../core/profiles';
import type { KidProgress } from '../core/progress';
import type { UnitDef } from '../core/question';
import { buildReport } from '../core/report';
import type { RewardsDoc } from '../core/rewards';
import { reportCss } from './reportCss';
import { reportHtml } from './reportHtml';
import { buildReportPdf } from './reportPdf';
import { saveFile } from './save';
import appCss from './app.css?raw';
import tokensCss from './tokens.css?raw';

interface Props {
  kid?: Kid;
  kids: Kid[];
  progress?: KidProgress;
  log?: ActivityLog;
  rewards: RewardsDoc;
  units: UnitDef[];
  goalMinutes: number;
  onBackup(): void;
  backupMsg: string;
  onPick(id: string): void;
  onAddKid(): void;
  onAlbum?(): void;
  onPip?(): void;
  /** open a chapter from "what to practise next" */
  onOpenChapter(key: string): void;
}

/** The light-only file: tokens without the dark rules, the same styles as the page, no controls. */
function standalone(body: string, title: string): string {
  const light = tokensCss.split('@media (prefers-color-scheme: dark)')[0]!;
  return `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Andika:wght@400;700&family=Fredoka:wght@400;500;600&display=swap"><style>${light}:root{color-scheme:light}body{margin:0;background:var(--ground);color:var(--ink);font:18px/1.5 var(--body);padding:24px 16px}h1,h2,h3{font-family:var(--display);font-weight:500;margin:0}p{margin:0}.page{max-width:980px;margin:0 auto}.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}.label{font-size:13px;letter-spacing:.09em;text-transform:uppercase;color:var(--muted);font-weight:700}.muted{color:var(--muted)}.small{font-size:15px}${reportCss}@media print{body{background:#fff}}</style><style>${appCss.split('/* ===== Pip and stamps')[1] ? '/* ===== Pip and stamps' + appCss.split('/* ===== Pip and stamps')[1]!.split('/* ===== Popups')[0] : ''}</style></head><body><div class="page"><div class="rep show-both">${body}</div></div></body></html>`;
}

/** "My progress": one page for a grown-up, worked out from the child's own history. */
export function ProgressView({ kid, kids, progress, log, rewards, units, goalMinutes, onBackup, backupMsg, onPick, onAddKid, onAlbum, onPip, onOpenChapter }: Props) {
  const [tables, setTables] = useState(false);
  const [portion, setPortion] = useState('maths');
  const [marks, setMarks] = useState<25 | 50>(25);
  const [msg, setMsg] = useState('');
  const model = useMemo(() => (kid && log ? buildReport({ name: kid.name, log, progress, rewards, units, goalMinutes, now: new Date() }) : undefined), [kid, log, progress, rewards, units, goalMinutes]);
  if (!kid || !model) {
    return (
      <>
        <h1 class="page" tabIndex={-1} id="page-h">
          My progress
        </h1>
        <p class="note">Pick a kid at the top, or add one, to see how they are doing.</p>
        <button class="btn primary" onClick={onAddKid}>
          Add or pick a kid
        </button>
      </>
    );
  }
  const html = reportHtml(model, { interactive: true, portion, marks });
  const save = async (kind: 'html' | 'pdf') => {
    const flat = reportHtml(model, { interactive: false, portion, marks });
    const name = `homework-buddy-progress-${kid.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${new Date().toISOString().slice(0, 10)}`;
    const r = kind === 'html' ? await saveFile(`${name}.html`, new Blob([standalone(flat, `${kid.name}'s progress`)], { type: 'text/html' })) : await saveFile(`${name}.pdf`, await buildReportPdf(flat, `${kid.name}'s progress`));
    setMsg(r.message);
  };
  return (
    <>
      <style>{reportCss}</style>
      <div class="rep-bar no-print">
        <div class="who" role="group" aria-label="Child">
          <span class="label">Child</span>
          {kids.map((k) => (
            <button key={k.id} type="button" class="chip" aria-pressed={k.id === kid.id} onClick={() => onPick(k.id)}>
              {k.name}
            </button>
          ))}
          <button type="button" class="chip" onClick={onAddKid}>
            Add
          </button>
        </div>
        <div class="row">
          <button class="btn" aria-pressed={tables} onClick={() => setTables(!tables)}>
            {tables ? 'Show charts' : 'Show charts as tables'}
          </button>
        </div>
      </div>
      <div
        class={`rep${tables ? ' tables-on' : ''}`}
        id="page-h"
        tabIndex={-1}
        onChange={(e) => {
          const t = e.target as HTMLSelectElement;
          if (t.dataset.act === 'portion') setPortion(t.value);
          if (t.dataset.act === 'marks') setMarks(t.value === '50' ? 50 : 25);
        }}
        onClick={(e) => {
          const b = (e.target as HTMLElement).closest('[data-open]') as HTMLElement | null;
          if (b) onOpenChapter(b.dataset.open!);
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <section class="card no-print" aria-labelledby="out-h">
        <h2 id="out-h" style={{ fontSize: '22px', marginBottom: '8px' }}>
          Keep a copy
        </h2>
        <div class="actions">
          <button class="btn primary" onClick={() => save('pdf')}>
            Save the report as PDF
          </button>
          <button class="btn" onClick={() => save('html')}>
            Save the report as an HTML file
          </button>
          <button class="btn" onClick={onBackup}>
            Back up all data
          </button>
          {onAlbum && (
            <button class="btn quiet" onClick={onAlbum}>
              Stamp album
            </button>
          )}
          {onPip && (
            <button class="btn quiet" onClick={onPip}>
              Pip's ladder
            </button>
          )}
        </div>
        {(msg || backupMsg) && (
          <p class="live" role="status">
            {msg || backupMsg}
          </p>
        )}
        <p class="muted small">The saved report is always on light paper and has the tables as well as the charts. It holds counts only.</p>
      </section>
    </>
  );
}
