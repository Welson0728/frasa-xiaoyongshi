import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { mkdir, open, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const require = createRequire(import.meta.url);
const { audioManifest } = require("/tmp/jom-main-audio/questions.js");

const VOICE = "ms-MY-YasminNeural";
const RATE = "-15%";
const OUTPUT_ROOT = resolve(process.cwd(), "public/audio/lessons");
const WORKERS = 3;
const RETRIES = 3;

async function isComplete(file) {
  try {
    if ((await stat(file)).size <= 2000) return false;
    const handle = await open(file, "r");
    const header = Buffer.alloc(3);
    await handle.read(header, 0, 3, 0);
    await handle.close();
    const hasId3 = header.toString("ascii") === "ID3";
    const hasFrameSync = header[0] === 0xff && (header[1] & 0xe0) === 0xe0;
    return hasId3 || hasFrameSync;
  } catch {
    return false;
  }
}

function runTts(text, output) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(
      "edge-tts",
      ["--voice", VOICE, `--rate=${RATE}`, "--text", text, "--write-media", output],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    let error = "";
    child.stderr.on("data", (chunk) => { error += chunk.toString(); });
    child.on("error", rejectRun);
    child.on("close", (code) => {
      if (code === 0) resolveRun();
      else rejectRun(new Error(error.trim() || `edge-tts exited with code ${code}`));
    });
  });
}

async function generate(item) {
  if (!item.file.startsWith("/audio/lessons/") || item.file.includes("..")) {
    throw new Error(`Unsafe audio path: ${item.file}`);
  }
  const output = resolve(process.cwd(), "public", item.file.slice(1));
  if (!output.startsWith(OUTPUT_ROOT)) throw new Error(`Audio escaped output folder: ${output}`);
  if (await isComplete(output)) return;
  await mkdir(dirname(output), { recursive: true });

  let lastError;
  for (let attempt = 1; attempt <= RETRIES; attempt += 1) {
    try {
      await runTts(item.text, output);
      if (!(await isComplete(output))) throw new Error("Generated audio file is empty or incomplete");
      return;
    } catch (error) {
      lastError = error;
      if (attempt < RETRIES) await new Promise((resolveWait) => setTimeout(resolveWait, 1200 * attempt));
    }
  }
  throw lastError;
}

let cursor = 0;
let completed = 0;

async function worker() {
  while (cursor < audioManifest.length) {
    const item = audioManifest[cursor];
    cursor += 1;
    await generate(item);
    completed += 1;
    if (completed % 12 === 0 || completed === audioManifest.length) {
      process.stdout.write(`Generated or verified ${completed}/${audioManifest.length} fixed-voice files.\n`);
    }
  }
}

if (!Array.isArray(audioManifest) || audioManifest.length === 0) {
  throw new Error("Audio manifest is empty; refusing to build a listening game without fixed audio.");
}

const uniqueFiles = new Set(audioManifest.map((item) => item.file));
if (uniqueFiles.size !== audioManifest.length) {
  throw new Error("Audio manifest contains duplicate output paths.");
}

await mkdir(OUTPUT_ROOT, { recursive: true });
await Promise.all(Array.from({ length: WORKERS }, () => worker()));

const missing = [];
for (const item of audioManifest) {
  const output = resolve(process.cwd(), "public", item.file.slice(1));
  if (!(await isComplete(output))) missing.push(item.file);
}

if (missing.length > 0) {
  throw new Error(`Audio validation failed for ${missing.length} files: ${missing.slice(0, 5).join(", ")}`);
}

process.stdout.write(`Audio gate passed: ${audioManifest.length} files, voice ${VOICE}, rate ${RATE}.\n`);
