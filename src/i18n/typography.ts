/**
 * French typography for UI strings: the spaces around high punctuation, guillemets,
 * units and separators become non-breaking, so a line never starts with ":", "?", "»",
 * "%" or "·". A regular space there would let the punctuation wrap alone onto the next
 * line. Applied once to every message, including the ones built by functions.
 */
const NBSP = ' ';
/** Narrow no-break space: the usual French spacing before ; ! ? and inside « ». */
const NNBSP = ' ';

export function frenchSpacing(text: string): string {
  return (
    text
      .replace(/ :/g, `${NBSP}:`)
      .replace(/ ([;!?])/g, `${NNBSP}$1`)
      .replace(/« /g, `«${NNBSP}`)
      .replace(/ »/g, `${NNBSP}»`)
      // Separators stay at the end of the line, with the word before them.
      .replace(/ ·/g, `${NBSP}·`)
      // A number keeps its unit: "36 s", "9 h 30", "90 %".
      .replace(/(\d h) (\d)/g, `$1${NBSP}$2`)
      .replace(/(\d) (s|h|%)(?=$|[\s.,;:!?)])/g, `$1${NBSP}$2`)
  );
}

type Messages = Record<string, unknown>;

/** Applies `frenchSpacing` to every string of a message tree, and to what its functions return. */
export function withFrenchSpacing<T extends Messages>(messages: T): T {
  const convert = (value: unknown): unknown => {
    if (typeof value === 'string') return frenchSpacing(value);
    if (typeof value === 'function') {
      const fn = value as (...args: unknown[]) => unknown;
      return (...args: unknown[]) => convert(fn(...args));
    }
    if (value !== null && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, convert(item)]));
    }
    return value;
  };
  return convert(messages) as T;
}
