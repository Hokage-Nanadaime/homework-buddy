import { Back } from './Back';
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import type { Printable } from './printable';
import tokensCss from './tokens.css?raw';
import { saveFile } from './save';

const SHEET_PX = 794; // 210mm at 96 dpi

interface Props {
  doc: Printable;
  backLabel: string;
  onBack(): void;
  onPrinted(): void;
  onEnter(): void;
}

/** Shows exactly what will print, sheet by sheet, before anything is printed or saved. */
export function PrintPreview({ doc, backLabel, onBack, onPrinted, onEnter }: Props) {
  const [withKey, setWithKey] = useState(false);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [scale, setScale] = useState(1);
  const box = useRef<HTMLDivElement>(null);
  const { sheets, keySheets } = doc.pages(withKey);

  useLayoutEffect(() => {
    const fit = () => {
      const w = box.current?.clientWidth ?? SHEET_PX;
      setScale(Math.min(1, w / SHEET_PX));
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  useEffect(() => {
    document.title = `${doc.title} - Homework Buddy`;
  }, [doc.title]);

  const doPdf = async () => {
    setBusy(true);
    setStatus('Making the PDF…');
    try {
      const blob = await doc.pdf(withKey);
      const r = await saveFile(`${doc.slug}.pdf`, blob);
      setStatus(r.message);
      if (r.ok) onPrinted();
    } catch {
      setStatus('The PDF could not be made. Try Save as HTML file instead.');
    }
    setBusy(false);
  };
  const doHtml = async () => {
    const r = await saveFile(`${doc.slug}.html`, new Blob([doc.standalone(withKey, tokensCss)], { type: 'text/html' }));
    setStatus(r.message);
    if (r.ok) onPrinted();
  };

  const html = doc.html(withKey);
  return (
    <>
      <div class="no-print">
        <Back onClick={onBack}>{backLabel}</Back>
      </div>
      <section class="card preview-bar no-print" aria-labelledby="pv-h">
        <h1 id="pv-h" class="page" style={{ fontSize: '30px' }}>
          {doc.heading ?? 'Print preview'}
        </h1>
        {doc.intro && <p class="lede">{doc.intro}</p>}
        <p class="lede">
          This is exactly what the PDF and the HTML file will contain: {doc.summary} on {sheets} sheet{sheets === 1 ? '' : 's'} of A4
          {withKey ? `, plus ${keySheets} answer key page${keySheets === 1 ? '' : 's'}` : ''}. Nothing is saved until you press a button.
        </p>
        <label class="check">
          <input id="pv-key" type="checkbox" checked={withKey} onChange={(e) => setWithKey((e.target as HTMLInputElement).checked)} />
          Add the answer key page (for parents)
        </label>
        <div class="actions">
          <button class="btn primary" onClick={doPdf} disabled={busy}>
            Save as PDF
          </button>
          <button class="btn" onClick={doHtml}>
            Save as HTML file
          </button>
        </div>
        <p class="live" role="status">
          {status}
        </p>
        {doc.code && (
          <p>
            Worksheet code <b>{doc.code}</b> is printed at the bottom of every page.
          </p>
        )}
        {!doc.intro && <p class="note">To print, open the saved PDF and print it.</p>}
        <p class="note">
          Did it on paper? Type your answers into the app.{' '}
          <button class="btn" onClick={onEnter}>
            Enter answers from paper
          </button>
        </p>
      </section>
      <div class="sheets" ref={box}>
        <style dangerouslySetInnerHTML={{ __html: doc.css }} />
        <div class="hb-zoom" style={{ zoom: scale }}>
          <div class="hb-print-area" dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      </div>
    </>
  );
}
