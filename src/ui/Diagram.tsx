import { renderDiagram } from '../core/draw';
import type { DiagramSpec } from '../core/question';

/** A picture from the shared drawing helpers. The alt text is read out by screen readers. */
export function Diagram({ spec }: { spec: DiagramSpec }) {
  return <div class="pic" role="img" aria-label={spec.alt} dangerouslySetInnerHTML={{ __html: renderDiagram(spec) }} />;
}
