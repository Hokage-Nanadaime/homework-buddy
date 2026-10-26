import { useState } from 'preact/hooks';
import type { Kid } from '../core/profiles';
import type { SubjectId } from '../core/question';
import { THEME_LABEL, type ThemeMode } from './theme';

interface Props {
  kids: Kid[];
  activeId?: string;
  page: string;
  onPick(id: string): void;
  onHome(): void;
  onProgress(): void;
  onKids(): void;
  /** the book the kid is in: shown as a word so colour is never the only sign */
  subject?: SubjectId;
  theme: ThemeMode;
  onTheme(): void;
  calm: boolean;
  onCalm(): void;
  onBooks(): void;
}

/** More than two kids, or a long name, would not fit one row: they go into one dropdown. */
const shouldCollapse = (kids: Kid[]): boolean => kids.length > 2 || kids.some((k) => k.name.length > 10);

export function TopBar({ kids, activeId, page, onPick, onHome, onProgress, onKids, subject, theme, onTheme, calm, onCalm, onBooks }: Props) {
  const collapse = shouldCollapse(kids);
  const [open, setOpen] = useState(false);
  return (
    <header class="topbar no-print">
      <div class="topbar-in">
        <button class="brand" onClick={onHome} aria-label="Homework Buddy, go to the home page">
          <span class="brand-mark" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 22c-5 0-8-3.4-8-7.6C4 9 8.4 5.4 14.5 3c.4 3.4-.1 5-1.4 6.6C16 9.6 20 11.2 20 14.8 20 18.8 16.7 22 12 22z" /></svg>
          </span>
          Homework Buddy
        </button>
        {subject && <span class="subjectpill">{subject === 'english' ? 'English' : subject === 'evs' ? 'EVS' : 'Maths'}</span>}
        <div class="tb-tools">
          <button class="themebtn calm" aria-pressed={calm} onClick={onCalm} aria-label={`Calm mode: ${calm ? 'on' : 'off'}. Press to switch it ${calm ? 'off' : 'on'}.`} title={`Calm mode is ${calm ? 'on' : 'off'}: plainer colours and nothing moves`}>
            <span class={`calm-dot${calm ? ' on' : ''}`} aria-hidden="true" />
            <span class="themelab">Calm</span>
          </button>
          <button class="themebtn" onClick={onTheme} aria-label={`Colour theme: ${THEME_LABEL[theme]}${theme === 'auto' ? ' (follows your device)' : ''}. Press to change.`} title={`Theme: ${THEME_LABEL[theme]}`}>
            <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              {theme === 'light' && (
                <>
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
                </>
              )}
              {theme === 'dark' && <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />}
              {theme === 'auto' && (
                <>
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 3v18" />
                  <path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" />
                </>
              )}
            </svg>
            <span class="themelab">{THEME_LABEL[theme]}</span>
          </button>
          <button class="chip tb-menu" aria-expanded={open} aria-controls="tb-links" onClick={() => setOpen(!open)}>
            Menu
          </button>
        </div>
        <nav id="tb-links" class={`tb-links${open ? ' open' : ''}`} aria-label="Kids and pages">
          {kids.length > 0 && <span class="chip-label">Practising:</span>}
          {collapse ? (
            <label class="kidsel">
              <span class="sr">Practising</span>
              <select aria-label="Practising: pick a kid" value={activeId ?? ''} onChange={(e) => onPick((e.target as HTMLSelectElement).value)}>
                {kids.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            kids.map((k) => (
              <button key={k.id} class="chip" aria-pressed={k.id === activeId} onClick={() => onPick(k.id)}>
                {k.name}
              </button>
            ))
          )}
          <button class="chip" aria-current={page === 'home' ? 'page' : undefined} onClick={onHome}>
            Home
          </button>
          <button class="chip" aria-current={page === 'index' || page === 'english' ? 'page' : undefined} onClick={onBooks}>
            Books
          </button>
          <button class="chip" aria-current={page === 'progress' ? 'page' : undefined} onClick={onProgress}>
            My progress
          </button>
          <button class="chip" aria-current={page === 'kids' ? 'page' : undefined} onClick={onKids}>
            {kids.length === 0 ? 'Add a kid' : 'Kids'}
          </button>
        </nav>
      </div>
    </header>
  );
}
