import type { ComponentChildren } from 'preact';
import { useEffect, useRef } from 'preact/hooks';

interface Props {
  title: string;
  /** says exactly what is removed and what stays */
  children: ComponentChildren;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm(): void;
  onCancel(): void;
}

/**
 * A question with two answers, in the same dialog style as the popups: focus goes to the safe button (never the destructive one),
 * Tab stays inside, Escape and a tap outside both mean "keep it", and focus returns to where it was.
 */
export function ConfirmDialog({ title, children, confirmLabel, cancelLabel, onConfirm, onCancel }: Props) {
  const keep = useRef<HTMLButtonElement>(null);
  const confirm = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const was = document.activeElement;
    keep.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      } else if (e.key === 'Tab') {
        const els = [keep.current, confirm.current].filter(Boolean) as HTMLElement[];
        const i = els.indexOf(document.activeElement as HTMLElement);
        e.preventDefault();
        els[(i + (e.shiftKey ? els.length - 1 : 1)) % els.length]!.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (was instanceof HTMLElement) was.focus({ preventScroll: true });
    };
  }, []);
  return (
    <div class="pop-layer" data-mode="light" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div class="pop confirm" role="dialog" aria-modal="true" aria-labelledby="cf-t" aria-describedby="cf-d">
        <h2 id="cf-t">{title}</h2>
        <div id="cf-d" class="cf-body">
          {children}
        </div>
        <div class="cf-actions">
          <button class="btn primary" type="button" ref={keep} onClick={onCancel}>
            {cancelLabel}
          </button>
          <button class="btn danger" type="button" ref={confirm} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
