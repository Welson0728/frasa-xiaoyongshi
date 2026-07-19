/* eslint-disable @typescript-eslint/no-require-imports */

const { curriculumUnits } = require("/tmp/jom-main-audio/content.js");
const { audioManifest, generatedBankStats, questionBank } = require("/tmp/jom-main-audio/questions.js");
const { transcriptIsExact } = require("/tmp/jom-main-audio/speechAssessment.js");

const errors = [];
const questionIds = new Set();
const audioFiles = new Set();
const protectedSentenceTerms = ["Guan Hong", "Zhi Ying", "Cikgu Wong", "Pulau Redang"];

if (curriculumUnits.length !== 24) errors.push(`Expected 24 units, found ${curriculumUnits.length}.`);
if (generatedBankStats.total !== 552) errors.push(`Expected 552 activities, found ${generatedBankStats.total}.`);
if (generatedBankStats.listen !== 312) errors.push(`Expected 312 listening activities, found ${generatedBankStats.listen}.`);
if (audioManifest.length !== 144) errors.push(`Expected 144 audio files, found ${audioManifest.length}.`);
if (!transcriptIsExact("Saya membantu keluarga.", "saya membantu keluarga")) {
  errors.push("Exact speech assessment rejects a matching reading.");
}
if (transcriptIsExact("Saya membantu keluarga.", "Saya bantu keluarga.")) {
  errors.push("Exact speech assessment accepts a changed word.");
}
if (transcriptIsExact("Saya membantu keluarga.", "Saya membantu.")) {
  errors.push("Exact speech assessment accepts a missing word.");
}
if (transcriptIsExact("Saya membantu keluarga.", "Saya membantu keluarga hari ini.")) {
  errors.push("Exact speech assessment accepts extra words.");
}

for (const question of questionBank) {
  if (questionIds.has(question.id)) errors.push(`Duplicate activity id: ${question.id}`);
  questionIds.add(question.id);
  if (question.tpMax !== 4) errors.push(`${question.id} exceeds or omits the TP4 cap.`);
  if (!question.textbookPages || !Array.isArray(question.standards) || question.standards.length === 0) {
    errors.push(`${question.id} has no source mapping.`);
  }
  if (question.kind === "choice") {
    if (!question.options.includes(question.answer)) errors.push(`${question.id} answer is absent from its options.`);
    if (new Set(question.options).size !== question.options.length) errors.push(`${question.id} contains duplicate options.`);
  }
  if ((question.kind === "order" || question.kind === "listen-order") && question.words.join(" ") !== question.answer) {
    errors.push(`${question.id} cannot be reconstructed from its word tokens.`);
  }
  if (question.kind === "order" || question.kind === "listen-order") {
    for (const term of protectedSentenceTerms) {
      if (question.answer.includes(term) && !question.words.some((word) => word.includes(term))) {
        errors.push(`${question.id} splits the protected term “${term}”.`);
      }
    }
  }
  if (question.kind === "listen-fill" && !question.answer.trim()) {
    errors.push(`${question.id} has an empty listening blank.`);
  }
  if (question.kind === "listen-match") {
    if (question.pairs.length !== 4) errors.push(`${question.id} does not contain four matching pairs.`);
    if (new Set(question.pairs.map((pair) => pair.id)).size !== question.pairs.length) {
      errors.push(`${question.id} contains duplicate matching pairs.`);
    }
  }
}

for (const item of audioManifest) {
  if (audioFiles.has(item.file)) errors.push(`Duplicate audio path: ${item.file}`);
  audioFiles.add(item.file);
  if (!item.text.trim()) errors.push(`Empty audio text: ${item.file}`);
}

if (errors.length > 0) {
  process.stderr.write(`Content gate failed with ${errors.length} error(s):\n- ${errors.join("\n- ")}\n`);
  process.exit(1);
}

process.stdout.write(
  `Content gate passed: ${curriculumUnits.length} units, ${generatedBankStats.total} activities, ${audioManifest.length} fixed-audio files, TP4 maximum.\n`,
);
