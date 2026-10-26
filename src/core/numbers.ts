/** Number helpers shared by all Maths units. Words follow the book: no hyphens, no "and". */
const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

export const PLACES = ['ones', 'tens', 'hundreds', 'thousands'] as const;
export const PLACE_LABELS_4 = ['Th', 'H', 'T', 'O'];
export const PLACE_LABELS_3 = ['H', 'T', 'O'];

function below100(n: number): string {
  if (n < 20) return ONES[n]!;
  const t = TENS[Math.floor(n / 10)]!;
  return n % 10 === 0 ? t : `${t} ${ONES[n % 10]}`;
}

/** 0..99 999 in words, e.g. 4089 -> "four thousand eighty nine". */
export function numberToWords(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 99999) throw new RangeError(`numberToWords: ${n}`);
  if (n < 100) return below100(n);
  const parts: string[] = [];
  const th = Math.floor(n / 1000);
  const h = Math.floor((n % 1000) / 100);
  const rest = n % 100;
  if (th) parts.push(`${below100(th)} thousand`);
  if (h) parts.push(`${ONES[h]} hundred`);
  if (rest) parts.push(below100(rest));
  return parts.join(' ');
}

/** Inverse of numberToWords; ignores hyphens, "and" and case. Returns NaN if a word is unknown. */
export function wordsToNumber(text: string): number {
  const words = text.toLowerCase().replace(/-/g, ' ').split(/\s+/).filter((w) => w && w !== 'and');
  let total = 0;
  let current = 0;
  for (const w of words) {
    const one = ONES.indexOf(w);
    const ten = TENS.indexOf(w);
    if (one >= 0) current += one;
    else if (ten >= 2) current += ten * 10;
    else if (w === 'hundred') current *= 100;
    else if (w === 'thousand') {
      total += current * 1000;
      current = 0;
    } else return NaN;
  }
  return total + current;
}

/** Digits, most significant first, left-padded with zeros to `width`. */
export function digitsOf(n: number, width = String(n).length): number[] {
  return String(n).padStart(width, '0').split('').map(Number);
}

/** Value of each place: 4236 -> [4000, 200, 30, 6]. Zero places are kept as 0. */
export function placeValues(n: number): number[] {
  const d = digitsOf(n);
  return d.map((x, i) => x * 10 ** (d.length - 1 - i));
}

export function placeName(index: number, length: number): string {
  return PLACES[length - 1 - index]!;
}

export const inr = (n: number): string => `₹${n}`;
