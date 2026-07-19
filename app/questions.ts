import { curriculumUnits } from "./content";

export type GameMode = "listen" | "read" | "language" | "order" | "write" | "oral";

type QuestionSource = {
  unit: number;
  theme: number;
  textbookPages: string;
  standards: string[];
  tpMax: 4;
};

type BaseQuestion = QuestionSource & {
  id: string;
  mode: GameMode;
};

export type ChoiceQuestion = BaseQuestion & {
  kind: "choice";
  prompt: string;
  answer: string;
  options: string[];
  passage?: string;
  audio?: string;
};

export type OrderQuestion = BaseQuestion & {
  kind: "order";
  prompt: string;
  answer: string;
  words: string[];
};

export type ListenOrderQuestion = BaseQuestion & {
  kind: "listen-order";
  prompt: string;
  answer: string;
  words: string[];
  audio: string;
};

export type ListenFillQuestion = BaseQuestion & {
  kind: "listen-fill";
  prompt: string;
  answer: string;
  before: string;
  after: string;
  audio: string;
};

export type ListenMatchPair = {
  id: string;
  label: string;
  audio: string;
};

export type ListenMatchQuestion = BaseQuestion & {
  kind: "listen-match";
  prompt: string;
  pairs: ListenMatchPair[];
};

export type WriteQuestion = BaseQuestion & {
  kind: "write";
  prompt: string;
  target: string;
};

export type OralQuestion = BaseQuestion & {
  kind: "oral";
  prompt: string;
  target: string;
  modelAudio: string;
};

export type GameQuestion =
  | ChoiceQuestion
  | OrderQuestion
  | ListenOrderQuestion
  | ListenFillQuestion
  | ListenMatchQuestion
  | WriteQuestion
  | OralQuestion;

const audioPath = (id: string) => `/audio/lessons/${id}.mp3`;

const protectedSentenceTerms = [
  "Guan Hong",
  "Zhi Ying",
  "Cikgu Wong",
  "Zulkifli Haron",
  "Pulau Redang",
  "Pulau Pinang",
  "Bukit Bendera",
  "Jalur Gemilang",
] as const;

function cleanToken(value: string): string {
  return value.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}-]+$/gu, "");
}

function sentenceTokens(sentence: string): string[] {
  const words = sentence.split(/\s+/);
  const tokens: string[] = [];
  for (let index = 0; index < words.length;) {
    const protectedTerm = protectedSentenceTerms.find((term) => {
      const parts = term.split(" ");
      return parts.every((part, offset) => cleanToken(words[index + offset] ?? "") === part);
    });
    if (protectedTerm) {
      const length = protectedTerm.split(" ").length;
      tokens.push(words.slice(index, index + length).join(" "));
      index += length;
    } else {
      tokens.push(words[index]);
      index += 1;
    }
  }
  return tokens;
}

function fillParts(sentence: string, seed: number): { answer: string; before: string; after: string } {
  const tokens = sentenceTokens(sentence);
  const cleanCandidates = tokens
    .map((token, index) => ({ token, index }))
    .filter(({ token }) => token === cleanToken(token) && cleanToken(token).length > 1);
  const candidates = cleanCandidates.length > 0
    ? cleanCandidates
    : tokens.map((token, index) => ({ token, index }));
  const selected = candidates[seed % candidates.length];
  return {
    answer: cleanToken(selected.token),
    before: tokens.slice(0, selected.index).join(" "),
    after: tokens.slice(selected.index + 1).join(" "),
  };
}

const sourceFor = (unit: (typeof curriculumUnits)[number]): QuestionSource => ({
  unit: unit.unit,
  theme: unit.theme,
  textbookPages: unit.textbookPages,
  standards: unit.standards,
  tpMax: 4,
});

const bank: GameQuestion[] = [];

for (const unit of curriculumUnits) {
  const source = sourceFor(unit);
  const unitId = `u${String(unit.unit).padStart(2, "0")}`;

  unit.listen.forEach((answer, index) => {
    const id = `${unitId}-listen-${String(index + 1).padStart(2, "0")}`;
    const audio = audioPath(id);
    bank.push({
      ...source,
      id,
      mode: "listen",
      kind: "choice",
      prompt: "Dengar dengan teliti. Pilih yang kamu dengar.",
      answer,
      options: unit.listen,
      audio,
    });
    bank.push({
      ...source,
      id: `${id}-order`,
      mode: "listen",
      kind: "listen-order",
      prompt: "Dengar, kemudian susun perkataan menjadi ayat yang betul.",
      answer,
      words: sentenceTokens(answer),
      audio,
    });
    bank.push({
      ...source,
      id: `${id}-fill`,
      mode: "listen",
      kind: "listen-fill",
      prompt: "Dengar, kemudian isi perkataan yang hilang.",
      ...fillParts(answer, unit.unit + index),
      audio,
    });
  });

  bank.push({
    ...source,
    id: `${unitId}-listen-match`,
    mode: "listen",
    kind: "listen-match",
    prompt: "Dengar setiap suara dan padankan dengan ayat yang betul.",
    pairs: unit.listen.map((label, index) => {
      const audioId = `${unitId}-listen-${String(index + 1).padStart(2, "0")}`;
      return { id: audioId, label, audio: audioPath(audioId) };
    }),
  });

  unit.reading.questions.forEach((question, index) => {
    bank.push({
      ...source,
      id: `${unitId}-read-${String(index + 1).padStart(2, "0")}`,
      mode: "read",
      kind: "choice",
      passage: unit.reading.passage,
      ...question,
    });
  });

  unit.language.forEach((question, index) => {
    bank.push({
      ...source,
      id: `${unitId}-language-${String(index + 1).padStart(2, "0")}`,
      mode: "language",
      kind: "choice",
      ...question,
    });
  });

  unit.order.forEach((answer, index) => {
    bank.push({
      ...source,
      id: `${unitId}-order-${String(index + 1).padStart(2, "0")}`,
      mode: "order",
      kind: "order",
      prompt: "Tekan perkataan mengikut susunan ayat yang betul.",
      answer,
      words: sentenceTokens(answer),
    });
  });

  unit.write.forEach((target, index) => {
    bank.push({
      ...source,
      id: `${unitId}-write-${String(index + 1).padStart(2, "0")}`,
      mode: "write",
      kind: "write",
      prompt: "Ikut bayang huruf dan tulis perkataan ini pada skrin.",
      target,
    });
  });

  unit.oral.forEach((target, index) => {
    const id = `${unitId}-oral-${String(index + 1).padStart(2, "0")}`;
    bank.push({
      ...source,
      id,
      mode: "oral",
      kind: "oral",
      prompt: "Baca ayat ini dengan jelas, kemudian rakam suara kamu.",
      target,
      modelAudio: audioPath(id),
    });
  });
}

export const questionBank = bank;

export const modeLabels: Record<GameMode, { eyebrow: string; title: string; accent: string }> = {
  listen: { eyebrow: "Dengar", title: "Dengar & Pilih", accent: "cyan" },
  read: { eyebrow: "Baca", title: "Baca & Faham", accent: "violet" },
  language: { eyebrow: "Bahasa", title: "Pilih Jawapan", accent: "amber" },
  order: { eyebrow: "Susun", title: "Bina Ayat", accent: "lime" },
  write: { eyebrow: "Tulis", title: "Tulis di Skrin", accent: "rose" },
  oral: { eyebrow: "Sebut", title: "Baca dengan Jelas", accent: "blue" },
};

export function shuffled<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const other = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[other]] = [copy[other], copy[index]];
  }
  return copy;
}

export function pickQuestion(recentIds: readonly string[] = []): GameQuestion {
  const recent = new Set(recentIds);
  const candidates = questionBank.filter((question) => !recent.has(question.id));
  const pool = candidates.length > 0 ? candidates : questionBank;
  return pool[Math.floor(Math.random() * pool.length)];
}

export const generatedBankStats = questionBank.reduce<Record<GameMode | "total", number>>(
  (totals, question) => {
    totals[question.mode] += 1;
    totals.total += 1;
    return totals;
  },
  { listen: 0, read: 0, language: 0, order: 0, write: 0, oral: 0, total: 0 },
);

const collectedAudio = questionBank.flatMap((question) => {
  if (question.kind === "choice" && question.audio) {
    return [{ id: question.id, text: question.answer, file: question.audio }];
  }
  if (question.kind === "oral") {
    return [{ id: question.id, text: question.target, file: question.modelAudio }];
  }
  if (question.kind === "listen-order" || question.kind === "listen-fill") {
    return [{ id: question.id, text: question.answer, file: question.audio }];
  }
  if (question.kind === "listen-match") {
    return question.pairs.map((pair) => ({ id: pair.id, text: pair.label, file: pair.audio }));
  }
  return [];
});

export const audioManifest = [...new Map(collectedAudio.map((item) => [item.file, item])).values()];
