export function normalizedWords(value: string): string[] {
  return value
    .toLocaleLowerCase("ms-MY")
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function editDistance(left: readonly string[], right: readonly string[]): number {
  const row = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    let diagonal = row[0];
    row[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const previous = row[rightIndex];
      row[rightIndex] = left[leftIndex - 1] === right[rightIndex - 1]
        ? diagonal
        : Math.min(diagonal, row[rightIndex - 1], previous) + 1;
      diagonal = previous;
    }
  }
  return row[right.length];
}

export function transcriptScore(target: string, transcript: string): number {
  const expected = normalizedWords(target);
  const heard = normalizedWords(transcript);
  if (expected.length === 0 || heard.length === 0) return 0;
  const distanceScore = Math.max(0, 1 - editDistance(expected, heard) / Math.max(expected.length, heard.length));
  const remaining = [...heard];
  let matched = 0;
  expected.forEach((word) => {
    const index = remaining.indexOf(word);
    if (index >= 0) {
      matched += 1;
      remaining.splice(index, 1);
    }
  });
  const coverage = matched / expected.length;
  return Math.round((distanceScore * 0.72 + coverage * 0.28) * 100);
}

export function transcriptIsExact(target: string, transcript: string): boolean {
  const expected = normalizedWords(target);
  const heard = normalizedWords(transcript);
  return expected.length > 0
    && expected.length === heard.length
    && expected.every((word, index) => word === heard[index]);
}
