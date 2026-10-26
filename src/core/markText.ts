/**
 * Marks in the way the school writes them: halves are "1/2" and "1 1/2", never 0.5. Marks are kept as numbers
 * (multiples of a half), only the words change.
 */
export function fmtMark(n: number): string {
  const whole = Math.trunc(n);
  const half = Math.abs(n - whole) >= 0.25;
  if (!half) return String(whole);
  return whole === 0 ? '1/2' : `${whole} 1/2`;
}
/** "1/2 mark", "1 mark", "2 marks", "1 1/2 marks". */
export const markText = (n: number): string => `${fmtMark(n)} ${n <= 1 ? 'mark' : 'marks'}`;
