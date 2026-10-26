import { useState } from 'preact/hooks';
import { Back } from './Back';

interface Props {
  title: string;
  detail: string;
  onContinue(): void;
  onReset(): void;
  onBack(): void;
}

/** An unfinished set or test was found: continue it, or (after confirming) start again. */
export function ResumeCard({ title, detail, onContinue, onReset, onBack }: Props) {
  const [sure, setSure] = useState(false);
  return (
    <>
      <Back onClick={onBack}>Back to unit</Back>
      <section class="card qcard" aria-labelledby="resume-h">
        <h1 id="resume-h" class="page" tabIndex={-1} style={{ fontSize: '30px' }}>
          {title}
        </h1>
        <p>{detail}</p>
        {!sure ? (
          <div class="actions">
            <button class="btn primary" onClick={onContinue}>
              Continue where you left off
            </button>
            <button class="btn" onClick={() => setSure(true)}>
              Start a new set
            </button>
          </div>
        ) : (
          <>
            <p role="alert">
              <b>Start again?</b> The questions and answers so far are thrown away. You will go back to the level choice.
            </p>
            <div class="actions">
              <button class="btn danger" onClick={onReset}>
                Yes, throw them away
              </button>
              <button class="btn" onClick={() => setSure(false)}>
                No, keep my set
              </button>
            </div>
          </>
        )}
      </section>
    </>
  );
}
