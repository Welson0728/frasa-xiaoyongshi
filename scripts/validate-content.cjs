/* eslint-disable @typescript-eslint/no-require-imports */

const { curriculumUnits } = require("/tmp/jom-main-audio/content.js");
const { audioManifest, generatedBankStats, questionBank } = require("/tmp/jom-main-audio/questions.js");

const errors = [];
const questionIds = new Set();
const audioFiles = new Set();
const protectedSentenceTerms = ["Guan Hong", "Zhi Ying", "Cikgu Wong", "Pulau Redang"];

if (curriculumUnits.length !== 24) errors.push(`Expected 24 units, found ${curriculumUnits.length}.`);
if (generatedBankStats.total !== 336) errors.push(`Expected 336 activities, found ${generatedBankStats.total}.`);
if (audioManifest.length !== 144) errors.push(`Expected 144 audio files, found ${audioManifest.length}.`);

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
  if (question.kind === "order" && question.words.join(" ") !== question.answer) {
    errors.push(`${question.id} cannot be reconstructed from its word tokens.`);
  }
  if (question.kind === "order") {
    for (const term of protectedSentenceTerms) {
      if (question.answer.includes(term) && !question.words.some((word) => word.includes(term))) {
        errors.push(`${question.id} splits the protected term “${term}”.`);
      }
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
