/**
 * Search utilities for Bulgarian transliteration and text normalization
 * Used for matching Cyrillic and Latin input
 */

const translitMap: Record<string, string> = {
  А: "A",
  а: "a",
  Б: "B",
  б: "b",
  В: "V",
  в: "v",
  Г: "G",
  г: "g",
  Д: "D",
  д: "d",
  Е: "E",
  е: "e",
  Ж: "Zh",
  ж: "zh",
  З: "Z",
  з: "z",
  И: "I",
  и: "i",
  Й: "Y",
  й: "y",
  К: "K",
  к: "k",
  Л: "L",
  л: "l",
  М: "M",
  м: "m",
  Н: "N",
  н: "n",
  О: "O",
  о: "o",
  П: "P",
  п: "p",
  Р: "R",
  р: "r",
  С: "S",
  с: "s",
  Т: "T",
  т: "t",
  У: "U",
  у: "u",
  Ф: "F",
  ф: "f",
  Х: "H",
  х: "h",
  Ц: "Ts",
  ц: "ts",
  Ч: "Ch",
  ч: "ch",
  Ш: "Sh",
  ш: "sh",
  Щ: "Sht",
  щ: "sht",
  Ъ: "A",
  ъ: "a",
  ь: "",
  Ю: "Yu",
  ю: "yu",
  Я: "Ya",
  я: "ya",
};

/**
 * Converts Cyrillic characters to ASCII transliteration
 */
export function toAscii(s: string): string {
  return Array.from(String(s))
    .map((ch) => translitMap[ch] ?? ch)
    .join("");
}

/**
 * Normalizes a string for search matching
 * Returns both the normalized base string and ASCII transliteration
 */
export function normalizePair(s: string): { base: string; ascii: string } {
  const base = String(s)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("bg")
    .replace(/["'`„""]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const ascii = toAscii(base).toLowerCase();
  return { base, ascii };
}

/**
 * Finds the position in original text that corresponds to a position in ASCII transliteration
 */
function findOriginalPosition(
  originalText: string,
  asciiText: string,
  asciiPosition: number,
  asciiLength: number,
): { start: number; length: number } | null {
  // Build mapping: for each character in original, track its ASCII representation
  // Use normalized version for transliteration, but track original positions
  const normalized = originalText
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("bg");
  
  let asciiIndex = 0;
  const positionMap: Array<{ originalStart: number; asciiStart: number }> = [];

  // Map each original character to its ASCII position
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];
    if (char === undefined) continue;
    const asciiChar = translitMap[char] ?? char;
    const asciiCharLower = asciiChar.toLowerCase();

    positionMap.push({
      originalStart: i,
      asciiStart: asciiIndex,
    });

    asciiIndex += asciiCharLower.length;
  }

  // Find the original position that corresponds to the ASCII match
  let originalStart = -1;
  let originalEnd = -1;
  const asciiEndPosition = asciiPosition + asciiLength;

  for (let i = 0; i < positionMap.length; i++) {
    const map = positionMap[i];
    if (!map) continue;
    const nextMap = positionMap[i + 1];
    const charAsciiEnd = nextMap ? nextMap.asciiStart : asciiText.length;

    // Check if the ASCII match starts within this character's ASCII range
    if (
      asciiPosition >= map.asciiStart &&
      asciiPosition < charAsciiEnd &&
      originalStart === -1
    ) {
      originalStart = map.originalStart;
    }

    // Check if the ASCII match ends within or at the end of this character's ASCII range
    if (
      originalStart !== -1 &&
      asciiEndPosition <= charAsciiEnd &&
      originalEnd === -1
    ) {
      originalEnd = nextMap ? nextMap.originalStart : originalText.length;
      break;
    }
  }

  // If we found start but not end, the match extends to the end of the text
  if (originalStart !== -1 && originalEnd === -1) {
    originalEnd = originalText.length;
  }

  if (originalStart === -1 || originalEnd === -1) {
    return null;
  }

  return { start: originalStart, length: originalEnd - originalStart };
}

/**
 * Highlights matched query terms in text
 * Returns an array of text segments with highlight markers
 */
export function highlightMatch(
  text: string,
  query: string,
): Array<{ text: string; highlight: boolean }> {
  if (!query.trim()) {
    return [{ text, highlight: false }];
  }

  const qp = normalizePair(query);
  const tp = normalizePair(text);

  // Find matches in both base and ascii versions
  const baseMatch = tp.base.includes(qp.base) ? qp.base : "";
  const asciiMatch = tp.ascii.includes(qp.ascii) ? qp.ascii : "";
  const matchTerm = baseMatch || asciiMatch;
  const isAsciiMatch = !baseMatch && !!asciiMatch;

  if (!matchTerm) {
    return [{ text, highlight: false }];
  }

  let index: number;
  let matchLength: number;

  if (isAsciiMatch) {
    // Match found in ASCII - need to map back to original text
    const asciiMatchIndex = tp.ascii.indexOf(asciiMatch);
    const mapped = findOriginalPosition(
      text,
      tp.ascii,
      asciiMatchIndex,
      asciiMatch.length,
    );

    if (!mapped) {
      return [{ text, highlight: false }];
    }

    index = mapped.start;
    matchLength = mapped.length;
  } else {
    // Match found in base - can use directly
    const lowerText = text.toLowerCase();
    const lowerMatch = matchTerm.toLowerCase();
    index = lowerText.indexOf(lowerMatch);

    if (index === -1) {
      return [{ text, highlight: false }];
    }

    matchLength = matchTerm.length;
  }

  const result: Array<{ text: string; highlight: boolean }> = [];

  if (index > 0) {
    result.push({ text: text.slice(0, index), highlight: false });
  }

  result.push({
    text: text.slice(index, index + matchLength),
    highlight: true,
  });

  if (index + matchLength < text.length) {
    result.push({
      text: text.slice(index + matchLength),
      highlight: false,
    });
  }

  return result;
}

