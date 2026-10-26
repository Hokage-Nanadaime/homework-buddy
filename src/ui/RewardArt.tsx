import type { StampDef } from '../core/stamps';
import { SA, orchardSVG, pipSVG } from './art';

/** A stamp, drawn by the one generator in art.ts. `locked` is the flat silhouette; `deco` hides it from screen readers. */
export function StampArt({ def, locked, deco }: { def: StampDef; locked?: boolean; deco?: boolean }) {
  return <span class="art" dangerouslySetInnerHTML={{ __html: SA.stamp(def, { locked, deco }) }} />;
}

/** Pip at a stage (0 to 9), with up to five gold leaves. `sil` is the locked silhouette. */
export function PipArt({ stage, title, cls, leaves, sil }: { stage: number; title?: string; cls?: string; leaves?: number; sil?: boolean }) {
  return <span class="pipart" dangerouslySetInnerHTML={{ __html: pipSVG(stage, title, cls, { leaves, sil }) }} />;
}

/** Pip's orchard: the small trees and garden friends planted after the Fruit Tree (the last eight are drawn). */
export function OrchardArt({ count, title }: { count: number; title?: string }) {
  return <span class="orchard" style={{ width: `min(100%, ${Math.min(Math.max(count, 1), 8) * 56}px)` }} dangerouslySetInnerHTML={{ __html: orchardSVG(count, title) }} />;
}
