import type { ComponentChildren } from 'preact';

/** The one back link used on every page: muted, bold, arrow icon, 44px tall. */
export function Back({ onClick, children }: { onClick(): void; children: ComponentChildren }) {
  return (
    <button type="button" class="crumb" onClick={onClick}>
      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
        <path d="M19 12H5M11 6l-6 6 6 6" />
      </svg>
      {children}
    </button>
  );
}
