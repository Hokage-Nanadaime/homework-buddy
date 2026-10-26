/** Light / dark choice. "auto" leaves the page as it is (the device, or the viewer's own setting). */
export type ThemeMode = 'auto' | 'light' | 'dark';
export const THEME_ORDER: ThemeMode[] = ['auto', 'light', 'dark'];
const KEY = 'homework-buddy-theme';

/** What the page started with: nothing, or the viewer's own explicit choice. Auto goes back to this. */
let startAttr: string | null | undefined;

export const nextTheme = (m: ThemeMode): ThemeMode => THEME_ORDER[(THEME_ORDER.indexOf(m) + 1) % THEME_ORDER.length]!;

export function readTheme(): ThemeMode {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'auto';
  } catch {
    return 'auto';
  }
}

export function applyTheme(mode: ThemeMode, root: HTMLElement = document.documentElement): void {
  if (startAttr === undefined) startAttr = root.getAttribute('data-theme');
  if (mode === 'auto') {
    if (startAttr) root.setAttribute('data-theme', startAttr);
    else root.removeAttribute('data-theme');
  } else root.setAttribute('data-theme', mode);
  try {
    if (mode === 'auto') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, mode);
  } catch {
    /* the choice just is not remembered */
  }
}

export const THEME_LABEL: Record<ThemeMode, string> = { auto: 'Auto', light: 'Light', dark: 'Dark' };

const CALM_KEY = 'homework-buddy-calm';
/** Calm: plainer colours and nothing moves. A per-viewer choice, kept in this browser. */
export function readCalm(): boolean {
  try {
    return localStorage.getItem(CALM_KEY) === '1';
  } catch {
    return false;
  }
}
export function applyCalm(on: boolean, remember = true, root: HTMLElement = document.documentElement): void {
  if (on) root.setAttribute('data-calm', '1');
  else root.removeAttribute('data-calm');
  if (!remember) return;
  try {
    localStorage.setItem(CALM_KEY, on ? '1' : '0');
  } catch {
    /* the choice just is not remembered */
  }
}
