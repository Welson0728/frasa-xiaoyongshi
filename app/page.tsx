"use client";

import { useMemo, useRef, useState } from "react";
import HandwritingCanvas from "./HandwritingCanvas";
import OralRecorder from "./OralRecorder";
import {
  type ChoiceQuestion,
  type GameMode,
  type GameQuestion,
  type ListenFillQuestion,
  type ListenMatchPair,
  type ListenMatchQuestion,
  type ListenOrderQuestion,
  type OrderQuestion,
  modeLabels,
  questionBank,
  shuffled,
} from "./questions";
import {
  type ChallengeBreakdown,
  type ChallengeReport,
  REPORT_DASHBOARD_URL,
  REPORT_ENDPOINT,
  submitChallengeReport,
} from "./reporting";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

type Feedback = { kind: "correct" | "wrong"; text: string } | null;
type WordToken = { id: string; label: string };
type LearningPath = "listen" | "read" | "write";
type ChallengeLength = 10 | 15;
type PlaySession =
  | { kind: "practice"; path: LearningPath; nonce: number }
  | { kind: "challenge"; length: ChallengeLength; nonce: number };

const learningPaths: Array<{
  id: LearningPath;
  title: string;
  description: string;
  mode: GameMode;
}> = [
  {
    id: "listen",
    title: "Dengar",
    description: "Pilih, susun, isi dan padankan",
    mode: "listen",
  },
  {
    id: "read",
    title: "Baca",
    description: "Baca kuat, rakam dan semak setiap perkataan",
    mode: "oral",
  },
  {
    id: "write",
    title: "Tulis",
    description: "Tulis terus dengan jari atau pen",
    mode: "write",
  },
];

const practiceModes: Record<LearningPath, readonly GameMode[]> = {
  listen: ["listen"],
  read: ["oral"],
  write: ["write"],
};

const challengeModes: GameMode[] = ["listen", "read", "language", "order", "write", "oral"];

function pickPathQuestion(path: LearningPath, recentIds: readonly string[] = []): GameQuestion {
  const allowedModes = new Set(practiceModes[path]);
  const pathBank = questionBank.filter((item) => allowedModes.has(item.mode));
  const recent = new Set(recentIds);
  const unseen = pathBank.filter((item) => !recent.has(item.id));
  const pool = unseen.length > 0 ? unseen : pathBank;
  return pool[Math.floor(Math.random() * pool.length)];
}

function buildChallenge(length: ChallengeLength): GameQuestion[] {
  const buckets = Object.fromEntries(
    challengeModes.map((mode) => [mode, shuffled(questionBank.filter((question) => question.mode === mode))]),
  ) as Record<GameMode, GameQuestion[]>;
  const cursors = Object.fromEntries(challengeModes.map((mode) => [mode, 0])) as Record<GameMode, number>;
  const result: GameQuestion[] = [];
  while (result.length < length) {
    for (const mode of shuffled(challengeModes)) {
      if (result.length >= length) break;
      const bucket = buckets[mode];
      const question = bucket[cursors[mode] % bucket.length];
      cursors[mode] += 1;
      if (question && !result.some((item) => item.id === question.id)) result.push(question);
    }
  }
  return result;
}

function emptyBreakdown(): ChallengeBreakdown {
  return {
    listen: { attempted: 0, correct: 0 },
    read: { attempted: 0, correct: 0 },
    language: { attempted: 0, correct: 0 },
    order: { attempted: 0, correct: 0 },
    write: { attempted: 0, correct: 0 },
    oral: { attempted: 0, correct: 0 },
  };
}

function isOrderQuestion(question: GameQuestion): question is OrderQuestion | ListenOrderQuestion {
  return question.kind === "order" || question.kind === "listen-order";
}

function makeWordTokens(question: GameQuestion): WordToken[] {
  if (!isOrderQuestion(question)) return [];
  return shuffled(question.words.map((label, index) => ({ id: `${index}-${label}`, label })));
}

function labelsForQuestion(question: GameQuestion) {
  if (question.kind === "listen-order") return { ...modeLabels.listen, title: "Dengar & Susun" };
  if (question.kind === "listen-fill") return { ...modeLabels.listen, title: "Dengar & Isi" };
  if (question.kind === "listen-match") return { ...modeLabels.listen, title: "Dengar & Padankan" };
  if (question.mode === "oral") return { ...modeLabels.oral, eyebrow: "Baca" };
  return modeLabels[question.mode];
}

function normalizeAnswer(value: string): string {
  return value
    .toLocaleLowerCase("ms-MY")
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const dust = Array.from({ length: 18 }, (_, index) => index);
const confetti = Array.from({ length: 20 }, (_, index) => index);

function AmbientScene() {
  return (
    <div className="ambient-scene" aria-hidden="true">
      <div className="aurora aurora-one" />
      <div className="aurora aurora-two" />
      <div className="aurora aurora-three" />
      <div className="orbit orbit-one"><i /><i /><i /></div>
      <div className="orbit orbit-two"><i /><i /></div>
      <div className="prism prism-one"><i /><i /><i /></div>
      <div className="prism prism-two"><i /><i /><i /></div>
      <div className="pearl pearl-one" />
      <div className="pearl pearl-two" />
      <div className="pearl pearl-three" />
      <div className="dust-field">
        {dust.map((piece) => <i key={piece} style={{ "--dust": piece } as React.CSSProperties} />)}
      </div>
    </div>
  );
}

function MascotBuddy({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`mascot-stage ${compact ? "compact" : ""}`} aria-hidden="true">
      <span className="mascot-speech">Jom!</span>
      <span className="mascot-spark spark-a">✦</span>
      <span className="mascot-spark spark-b">✦</span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`${BASE_PATH}/mascot-buddy-v1.webp`} alt="" draggable={false} />
      <i className="mascot-shadow" />
    </div>
  );
}

function CartoonMark({ kind }: { kind: "listen" | "read" | "write" }) {
  if (kind === "listen") {
    return (
      <span className="cartoon-mark cartoon-listen" aria-hidden="true">
        <i className="headphone-band" />
        <i className="buddy-head">
          <b className="buddy-eye eye-left" />
          <b className="buddy-eye eye-right" />
          <b className="buddy-mouth" />
        </i>
        <i className="earpad earpad-left" />
        <i className="earpad earpad-right" />
        <i className="music-note">♪</i>
      </span>
    );
  }
  if (kind === "read") {
    return (
      <span className="cartoon-mark cartoon-book" aria-hidden="true">
        <i className="book-page book-left" />
        <i className="book-page book-right" />
        <i className="book-spine" />
        <b className="buddy-eye eye-left" />
        <b className="buddy-eye eye-right" />
        <b className="buddy-mouth" />
        <i className="book-spark">✦</i>
      </span>
    );
  }
  return (
    <span className="cartoon-mark cartoon-pencil" aria-hidden="true">
      <i className="pencil-eraser" />
      <i className="pencil-body">
        <b className="buddy-eye eye-left" />
        <b className="buddy-eye eye-right" />
        <b className="buddy-mouth" />
      </i>
      <i className="pencil-wood" />
      <i className="pencil-tip" />
      <i className="pencil-spark">✦</i>
    </span>
  );
}

function CartoonStickers() {
  return (
    <div className="cartoon-stickers" aria-hidden="true">
      <span className="sticker-star"><i className="sticker-eye eye-left" /><i className="sticker-eye eye-right" /><i className="sticker-smile" /></span>
      <span className="sticker-cloud"><i className="sticker-eye eye-left" /><i className="sticker-eye eye-right" /><i className="sticker-smile" /><b>✦</b></span>
      <span className="sticker-letter">Aa<i /><i /></span>
    </div>
  );
}

function cartoonKindForMode(mode: GameMode): "listen" | "read" | "write" {
  if (mode === "listen") return "listen";
  if (mode === "read" || mode === "oral") return "read";
  return "write";
}

function ConfettiBurst() {
  return (
    <div className="confetti-burst" aria-hidden="true">
      {confetti.map((piece) => <i key={piece} style={{ "--piece": piece } as React.CSSProperties} />)}
      <span className="success-halo" />
    </div>
  );
}

function HomeScreen({
  onStart,
  onChallenge,
}: {
  onStart: (path: LearningPath) => void;
  onChallenge: (length: ChallengeLength) => void;
}) {
  return (
    <main className="app-shell home-screen">
      <AmbientScene />
      <CartoonStickers />
      <div className="top-brand"><span className="brand-gem" />Bahasa Melayu <b>Tahun 2</b></div>

      <section className="hero-panel" aria-labelledby="hero-title">
        <div className="hero-kicker"><i /> Belajar sambil bermain <i /></div>
        <div className="hero-title-wrap">
          <span className="title-shadow" aria-hidden="true">Jom Main</span>
          <h1 id="hero-title">Jom Main<br /><strong>Bahasa!</strong></h1>
        </div>
        <MascotBuddy />
        <p className="hero-copy">Pilih cara kamu mahu belajar. Setiap pilihan membawa permainan baharu.</p>

        <div className="path-grid" aria-label="Pilih cara belajar">
          {learningPaths.map((path) => (
            <button className={`path-card path-${path.id}`} type="button" key={path.id} onClick={() => onStart(path.id)}>
              <span className="path-depth" aria-hidden="true" />
              <span className="path-face">
                <span className="path-icon"><CartoonMark kind={path.id} /></span>
                <span className="path-copy"><strong>{path.title}</strong><small>{path.description}</small></span>
                <span className="path-arrow" aria-hidden="true">›</span>
              </span>
            </button>
          ))}
        </div>

        <div className="challenge-launch">
          <span className="challenge-cup" aria-hidden="true">★</span>
          <span className="challenge-launch-copy"><strong>Cabaran Bintang</strong><small>Campur semua kemahiran · Kumpul markah</small></span>
          <span className="challenge-lengths" aria-label="Pilih jumlah soalan">
            <button type="button" onClick={() => onChallenge(10)}>10 soalan</button>
            <button type="button" onClick={() => onChallenge(15)}>15 soalan</button>
          </span>
        </div>
        <p className="no-account-note">Tekan dan terus bermain · Tiada akaun atau simpanan diperlukan</p>
      </section>

      <div className="floor-glow" aria-hidden="true"><i /><i /><i /></div>
    </main>
  );
}

function AudioPrompt({ source }: { source: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState("");

  const play = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      setError("");
      audio.currentTime = 0;
      await audio.play();
    } catch {
      setPlaying(false);
      setError("Audio belum dapat dimainkan. Cuba sekali lagi.");
    }
  };

  return (
    <div className="audio-prompt">
      <audio ref={audioRef} src={`${BASE_PATH}${source}`} preload="none" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} onError={() => setError("Audio belum dapat dimainkan. Cuba sekali lagi.")} />
      <button className={`speaker-button ${playing ? "playing" : ""}`} type="button" onClick={play} aria-label="Mainkan audio">
        <span className="speaker-face"><i className="speaker-box" /><i className="speaker-cone" /><i className="sound-wave wave-one" /><i className="sound-wave wave-two" /><i className="sound-wave wave-three" /></span>
        <span className="speaker-depth" aria-hidden="true" />
      </button>
      <div className={`audio-waveform ${playing ? "playing" : ""}`} aria-hidden="true">
        {Array.from({ length: 15 }, (_, index) => <i key={index} style={{ "--wave": index } as React.CSSProperties} />)}
      </div>
      <strong>{playing ? "Dengar…" : "Tekan untuk dengar"}</strong>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}

function ChoiceActivity({
  question,
  options,
  wrongAnswers,
  locked,
  onChoose,
}: {
  question: ChoiceQuestion;
  options: string[];
  wrongAnswers: string[];
  locked: boolean;
  onChoose: (answer: string) => void;
}) {
  return (
    <>
      {question.passage && <article className="reading-passage"><span className="passage-label">Baca petikan</span><p>{question.passage}</p></article>}
      {question.audio && <AudioPrompt source={question.audio} />}
      <h2 className="question-prompt">{question.prompt}</h2>
      <div className={`choice-grid ${options.some((option) => option.length > 34) ? "long-options" : ""}`}>
        {options.map((option, index) => {
          const wrong = wrongAnswers.includes(option);
          return (
            <button className={`answer-card ${wrong ? "wrong-choice" : ""}`} type="button" key={option} disabled={locked || wrong} onClick={() => onChoose(option)}>
              <span className="answer-letter">{String.fromCharCode(65 + index)}</span><span>{option}</span><i className="answer-shine" aria-hidden="true" />
            </button>
          );
        })}
      </div>
    </>
  );
}

function OrderActivity({
  question,
  tokens,
  selected,
  locked,
  onSelect,
  onRemove,
  onReset,
  onCheck,
}: {
  question: OrderQuestion | ListenOrderQuestion;
  tokens: WordToken[];
  selected: string[];
  locked: boolean;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onReset: () => void;
  onCheck: () => void;
}) {
  const chosen = selected.map((id) => tokens.find((token) => token.id === id)).filter(Boolean) as WordToken[];
  const available = tokens.filter((token) => !selected.includes(token.id));
  return (
    <div className="order-activity">
      {question.kind === "listen-order" && <AudioPrompt source={question.audio} />}
      <h2 className="question-prompt">{question.prompt}</h2>
      <div className={`sentence-track ${chosen.length === 0 ? "empty" : ""}`}>
        {chosen.length === 0 && <span>Ayat kamu akan muncul di sini</span>}
        {chosen.map((token) => <button type="button" key={token.id} onClick={() => onRemove(token.id)} disabled={locked}>{token.label}</button>)}
      </div>
      <div className="word-cloud">
        {available.map((token) => <button type="button" key={token.id} onClick={() => onSelect(token.id)} disabled={locked}>{token.label}</button>)}
      </div>
      <div className="order-actions">
        <button className="mini-button" type="button" onClick={onReset} disabled={selected.length === 0 || locked}>Susun semula</button>
        <button className="primary-action compact" type="button" onClick={onCheck} disabled={selected.length !== tokens.length || locked}>Semak ayat</button>
      </div>
    </div>
  );
}

function ListenFillActivity({
  question,
  locked,
  onCorrect,
  onWrong,
  onInteract,
}: {
  question: ListenFillQuestion;
  locked: boolean;
  onCorrect: () => void;
  onWrong: () => void;
  onInteract: () => void;
}) {
  const [answer, setAnswer] = useState("");
  const check = (event: React.FormEvent) => {
    event.preventDefault();
    if (!answer.trim() || locked) return;
    if (normalizeAnswer(answer) === normalizeAnswer(question.answer)) onCorrect();
    else onWrong();
  };
  return (
    <div className="listen-fill-activity">
      <AudioPrompt source={question.audio} />
      <h2 className="question-prompt">{question.prompt}</h2>
      <form onSubmit={check}>
        <div className="fill-sentence">
          {question.before && <span>{question.before}</span>}
          <label><span className="sr-only">Perkataan yang hilang</span><input value={answer} disabled={locked} autoComplete="off" autoCapitalize="none" spellCheck={false} onChange={(event) => { setAnswer(event.target.value); onInteract(); }} /></label>
          {question.after && <span>{question.after}</span>}
        </div>
        <button className="primary-action compact" type="submit" disabled={!answer.trim() || locked}>Semak jawapan</button>
      </form>
    </div>
  );
}

function MatchAudioButton({
  pair,
  number,
  selected,
  matched,
  onSelect,
}: {
  pair: ListenMatchPair;
  number: number;
  selected: boolean;
  matched: boolean;
  onSelect: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const play = async () => {
    if (matched) return;
    onSelect();
    const audio = audioRef.current;
    if (!audio) return;
    try {
      audio.currentTime = 0;
      await audio.play();
    } catch {
      setPlaying(false);
    }
  };
  return (
    <button className={`match-audio ${selected ? "selected" : ""} ${matched ? "matched" : ""}`} type="button" onClick={play} disabled={matched} aria-label={`Dengar suara ${number}`}>
      <audio ref={audioRef} src={`${BASE_PATH}${pair.audio}`} preload="none" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} />
      <span>{matched ? "✓" : playing ? "♪" : "▶"}</span><strong>Suara {number}</strong>
    </button>
  );
}

function ListenMatchActivity({
  question,
  locked,
  onComplete,
  onWrong,
  onInteract,
}: {
  question: ListenMatchQuestion;
  locked: boolean;
  onComplete: () => void;
  onWrong: () => void;
  onInteract: () => void;
}) {
  const [audioPairs] = useState(() => shuffled(question.pairs));
  const [labelPairs] = useState(() => shuffled(question.pairs));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [matchedIds, setMatchedIds] = useState<string[]>([]);

  const chooseLabel = (pair: ListenMatchPair) => {
    if (!selectedId || locked || matchedIds.includes(pair.id)) return;
    onInteract();
    if (selectedId === pair.id) {
      const next = [...matchedIds, pair.id];
      setMatchedIds(next);
      setSelectedId(null);
      if (next.length === question.pairs.length) onComplete();
    } else {
      onWrong();
    }
  };

  return (
    <div className="listen-match-activity">
      <h2 className="question-prompt">{question.prompt}</h2>
      <div className="match-board">
        <div className="match-audio-list">
          {audioPairs.map((pair, index) => <MatchAudioButton key={pair.id} pair={pair} number={index + 1} selected={selectedId === pair.id} matched={matchedIds.includes(pair.id)} onSelect={() => { setSelectedId(pair.id); onInteract(); }} />)}
        </div>
        <div className="match-link" aria-hidden="true"><i /><i /><i /></div>
        <div className="match-label-list">
          {labelPairs.map((pair) => <button className={matchedIds.includes(pair.id) ? "matched" : ""} type="button" key={pair.id} disabled={locked || matchedIds.includes(pair.id)} onClick={() => chooseLabel(pair)}>{matchedIds.includes(pair.id) && <span>✓</span>}{pair.label}</button>)}
        </div>
      </div>
      {!selectedId && matchedIds.length < question.pairs.length && <p className="match-hint">Tekan satu suara, kemudian pilih ayatnya.</p>}
    </div>
  );
}

function FeedbackPanel({
  feedback,
  onNext,
  onRetry,
  canContinueWrong,
  nextLabel,
}: {
  feedback: Feedback;
  onNext: () => void;
  onRetry: () => void;
  canContinueWrong: boolean;
  nextLabel: string;
}) {
  if (!feedback) return null;
  return (
    <div className={`feedback-panel ${feedback.kind}`} role="status">
      {feedback.kind === "correct" && <ConfettiBurst />}
      <div className="feedback-icon" aria-hidden="true">{feedback.kind === "correct" ? "✓" : "↻"}</div>
      <div><strong>{feedback.kind === "correct" ? "Hebat!" : "Belum tepat"}</strong><p>{feedback.text}</p></div>
      <div className="feedback-actions">
        {feedback.kind === "wrong" && <button className="retry-button" type="button" onClick={onRetry}>Cuba lagi</button>}
        {(feedback.kind === "correct" || canContinueWrong) && <button className="next-button" type="button" onClick={onNext}>{nextLabel} <span>›</span></button>}
      </div>
    </div>
  );
}

const breakdownLabels: Array<{ mode: GameMode; label: string; icon: string }> = [
  { mode: "listen", label: "Dengar", icon: "♪" },
  { mode: "read", label: "Faham", icon: "Aa" },
  { mode: "language", label: "Bahasa", icon: "✦" },
  { mode: "order", label: "Susun", icon: "↔" },
  { mode: "write", label: "Tulis", icon: "✎" },
  { mode: "oral", label: "Baca", icon: "●" },
];

function ChallengeResultScreen({
  score,
  length,
  breakdown,
  onAgain,
  onHome,
}: {
  score: number;
  length: ChallengeLength;
  breakdown: ChallengeBreakdown;
  onAgain: () => void;
  onHome: () => void;
}) {
  const percentage = Math.round((score / length) * 100);
  const [sessionId] = useState(() => `cabaran-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);
  const [reportStatus, setReportStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const report: ChallengeReport = useMemo(() => ({
    version: 1,
    sessionId,
    completedAt: new Date().toISOString(),
    questionCount: length,
    score,
    percentage,
    breakdown,
  }), [breakdown, length, percentage, score, sessionId]);

  const sendReport = async () => {
    setReportStatus("sending");
    try {
      await submitChallengeReport(report);
      setReportStatus("sent");
    } catch {
      setReportStatus("error");
    }
  };

  return (
    <main className="app-shell result-screen">
      <AmbientScene />
      <section className="result-card">
        <div className="result-confetti" aria-hidden="true"><i /><i /><i /><i /><i /></div>
        <MascotBuddy compact />
        <span className="result-kicker">Cabaran selesai!</span>
        <h1>Syabas!</h1>
        <div className="score-medal" aria-label={`Markah ${score} daripada ${length}`}><span><strong>{score}</strong><small>/ {length}</small></span><b>{percentage}%</b></div>
        <p>Markah berdasarkan jawapan pada cubaan pertama.</p>
        <div className="breakdown-grid">
          {breakdownLabels.filter(({ mode }) => breakdown[mode].attempted > 0).map(({ mode, label, icon }) => (
            <div key={mode}><span>{icon}</span><strong>{label}</strong><small>{breakdown[mode].correct}/{breakdown[mode].attempted}</small></div>
          ))}
        </div>
        <div className="result-actions">
          <button className="mini-button" type="button" onClick={onHome}>Pilih permainan</button>
          <button className="primary-action" type="button" onClick={onAgain}>Cabaran lagi</button>
        </div>
        {(REPORT_ENDPOINT || REPORT_DASHBOARD_URL) && (
          <div className="report-actions">
            {REPORT_ENDPOINT && <button type="button" onClick={sendReport} disabled={reportStatus === "sending" || reportStatus === "sent"}>{reportStatus === "sending" ? "Menghantar…" : reportStatus === "sent" ? "Sudah dihantar" : "Hantar keputusan"}</button>}
            {REPORT_DASHBOARD_URL && <a href={REPORT_DASHBOARD_URL} target="_blank" rel="noreferrer">Lihat laporan</a>}
            {reportStatus === "error" && <small>Belum dapat dihantar. Cuba lagi.</small>}
          </div>
        )}
      </section>
    </main>
  );
}

function GameScreen({
  session,
  onExit,
  onRestart,
}: {
  session: PlaySession;
  onExit: () => void;
  onRestart: () => void;
}) {
  const [challengeQuestions] = useState<GameQuestion[]>(() => session.kind === "challenge" ? buildChallenge(session.length) : []);
  const [question, setQuestion] = useState<GameQuestion>(() => session.kind === "challenge" ? challengeQuestions[0] : pickPathQuestion(session.path));
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [wrongAnswers, setWrongAnswers] = useState<string[]>([]);
  const [choiceOptions, setChoiceOptions] = useState<string[]>(() => question.kind === "choice" ? shuffled(question.options) : []);
  const [orderTokens, setOrderTokens] = useState<WordToken[]>(() => makeWordTokens(question));
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [activityKey, setActivityKey] = useState(0);
  const [challengeIndex, setChallengeIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [breakdown, setBreakdown] = useState<ChallengeBreakdown>(() => emptyBreakdown());
  const [finished, setFinished] = useState(false);
  const cardRef = useRef<HTMLElement>(null);
  const firstAttemptRecordedRef = useRef(false);
  const questionResolvedRef = useRef(false);
  const labels = labelsForQuestion(question);

  const showQuestion = (next: GameQuestion) => {
    setQuestion(next);
    setFeedback(null);
    setWrongAnswers([]);
    setSelectedWords([]);
    setChoiceOptions(next.kind === "choice" ? shuffled(next.options) : []);
    setOrderTokens(makeWordTokens(next));
    firstAttemptRecordedRef.current = false;
    questionResolvedRef.current = false;
    setActivityKey((key) => key + 1);
  };

  const recordFirstAttempt = (passed: boolean) => {
    if (session.kind !== "challenge" || firstAttemptRecordedRef.current) return;
    firstAttemptRecordedRef.current = true;
    setBreakdown((current) => ({
      ...current,
      [question.mode]: {
        attempted: current[question.mode].attempted + 1,
        correct: current[question.mode].correct + (passed ? 1 : 0),
      },
    }));
    if (passed) setScore((current) => current + 1);
  };

  const markCorrect = (text: string) => {
    if (questionResolvedRef.current) return;
    recordFirstAttempt(true);
    questionResolvedRef.current = true;
    setFeedback({ kind: "correct", text });
  };

  const markWrong = (text: string) => {
    if (questionResolvedRef.current) return;
    recordFirstAttempt(false);
    setFeedback({ kind: "wrong", text });
  };

  const resetCurrentActivity = () => {
    setFeedback(null);
    setWrongAnswers([]);
    setSelectedWords([]);
    setChoiceOptions(question.kind === "choice" ? shuffled(question.options) : []);
    setOrderTokens(makeWordTokens(question));
    setActivityKey((key) => key + 1);
  };

  const nextQuestion = () => {
    if (session.kind === "challenge") {
      const nextIndex = challengeIndex + 1;
      if (nextIndex >= challengeQuestions.length) {
        setFinished(true);
        return;
      }
      setChallengeIndex(nextIndex);
      showQuestion(challengeQuestions[nextIndex]);
      return;
    }
    const updatedRecent = [...recentIds, question.id].slice(-30);
    setRecentIds(updatedRecent);
    showQuestion(pickPathQuestion(session.path, updatedRecent));
  };

  const chooseAnswer = (answer: string) => {
    if (question.kind !== "choice" || feedback?.kind === "correct") return;
    if (answer === question.answer) markCorrect("Jawapan kamu tepat.");
    else {
      setWrongAnswers((answers) => [...answers, answer]);
      markWrong("Cuba lihat atau dengar sekali lagi.");
    }
  };

  const checkOrder = () => {
    if (!isOrderQuestion(question)) return;
    const sentence = selectedWords.map((id) => orderTokens.find((token) => token.id === id)?.label ?? "").join(" ");
    if (sentence === question.answer) markCorrect("Susunan ayat kamu tepat.");
    else markWrong("Tekan perkataan dalam ayat untuk mengubah susunan.");
  };

  const tiltCard = (event: React.PointerEvent<HTMLElement>) => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches || question.mode === "write") return;
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    card.style.setProperty("--tilt-x", `${(-y * 2.4).toFixed(2)}deg`);
    card.style.setProperty("--tilt-y", `${(x * 2.8).toFixed(2)}deg`);
  };

  const resetTilt = () => {
    cardRef.current?.style.setProperty("--tilt-x", "0deg");
    cardRef.current?.style.setProperty("--tilt-y", "0deg");
  };

  const instruction = useMemo(() => {
    if (question.kind === "write" || question.kind === "oral") return question.prompt;
    return "Pilih, cuba dan belajar.";
  }, [question]);

  if (finished && session.kind === "challenge") {
    return <ChallengeResultScreen score={score} length={session.length} breakdown={breakdown} onAgain={onRestart} onHome={onExit} />;
  }

  const lastChallengeQuestion = session.kind === "challenge" && challengeIndex === challengeQuestions.length - 1;

  return (
    <main className={`app-shell game-screen accent-${labels.accent}`}>
      <AmbientScene />
      <header className="game-header">
        <button className="home-button" type="button" onClick={onExit} aria-label="Tukar pilihan latihan"><span /><span /></button>
        <div className="game-brand"><span className="brand-gem" />Bahasa Melayu <b>Tahun 2</b></div>
        <div className="header-spark" aria-hidden="true"><i /><i /><i /></div>
      </header>

      <section ref={cardRef} className={`challenge-card mode-${question.mode}`} onPointerMove={tiltCard} onPointerLeave={resetTilt}>
        <div className="card-edge" aria-hidden="true" />
        <div className="card-glow" aria-hidden="true" />
        {session.kind === "challenge" && (
          <div className="session-progress">
            <span>Soalan {challengeIndex + 1} / {session.length}</span>
            <div><i style={{ width: `${((challengeIndex + 1) / session.length) * 100}%` }} /></div>
            <strong>★ {score}</strong>
          </div>
        )}
        <div className="challenge-heading">
          <div className="mode-orb"><CartoonMark kind={cartoonKindForMode(question.mode)} /></div>
          <div><span>{labels.eyebrow}</span><h1>{labels.title}</h1><p>{instruction}</p></div>
        </div>

        <div className="activity-stage" key={activityKey}>
          {question.kind === "choice" && <ChoiceActivity question={question} options={choiceOptions} wrongAnswers={wrongAnswers} locked={feedback?.kind === "correct"} onChoose={chooseAnswer} />}

          {isOrderQuestion(question) && <OrderActivity question={question} tokens={orderTokens} selected={selectedWords} locked={feedback?.kind === "correct"} onSelect={(id) => { setFeedback(null); setSelectedWords((words) => [...words, id]); }} onRemove={(id) => { setFeedback(null); setSelectedWords((words) => words.filter((word) => word !== id)); }} onReset={() => { setFeedback(null); setSelectedWords([]); setOrderTokens(shuffled(orderTokens)); }} onCheck={checkOrder} />}

          {question.kind === "listen-fill" && <ListenFillActivity question={question} locked={feedback?.kind === "correct"} onCorrect={() => markCorrect("Perkataan yang kamu isi tepat.")} onWrong={() => markWrong("Perkataan itu belum sepadan dengan suara.")} onInteract={() => setFeedback(null)} />}

          {question.kind === "listen-match" && <ListenMatchActivity question={question} locked={feedback?.kind === "correct"} onComplete={() => markCorrect("Semua suara dipadankan dengan tepat.")} onWrong={() => markWrong("Suara dan ayat itu belum sepadan.")} onInteract={() => setFeedback(null)} />}

          {question.kind === "write" && (
            <><h2 className="question-prompt tool-prompt">{question.prompt}</h2><HandwritingCanvas target={question.target} onSuccess={() => markCorrect("Tulisan kamu mengikut bentuk huruf dengan tepat.")} onResult={(passed) => { if (!passed) markWrong("Tulisan belum mengikut bentuk huruf dengan tepat."); }} onReset={() => { if (!questionResolvedRef.current) setFeedback(null); }} /></>
          )}

          {question.kind === "oral" && (
            <><h2 className="question-prompt tool-prompt">{question.prompt}</h2><OralRecorder target={question.target} modelAudio={question.modelAudio} onSuccess={() => markCorrect("Semua perkataan dibaca dengan tepat.")} onResult={(passed) => { if (!passed) markWrong("Bacaan belum tepat. Cuba setiap perkataan sekali lagi."); }} onReset={() => { if (!questionResolvedRef.current) setFeedback(null); }} /></>
          )}
        </div>

        <FeedbackPanel feedback={feedback} onNext={nextQuestion} onRetry={resetCurrentActivity} canContinueWrong={session.kind === "challenge"} nextLabel={lastChallengeQuestion ? "Lihat markah" : "Teruskan"} />
      </section>
    </main>
  );
}

export default function Home() {
  const [session, setSession] = useState<PlaySession | null>(null);
  const nonceRef = useRef(0);
  const nextNonce = () => {
    nonceRef.current += 1;
    return nonceRef.current;
  };
  return session
    ? <GameScreen key={`${session.kind}-${session.nonce}`} session={session} onExit={() => setSession(null)} onRestart={() => setSession({ kind: "challenge", length: session.kind === "challenge" ? session.length : 10, nonce: nextNonce() })} />
    : <HomeScreen onStart={(path) => setSession({ kind: "practice", path, nonce: nextNonce() })} onChallenge={(length) => setSession({ kind: "challenge", length, nonce: nextNonce() })} />;
}
