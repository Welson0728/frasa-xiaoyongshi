"use client";

import { useMemo, useRef, useState } from "react";
import HandwritingCanvas from "./HandwritingCanvas";
import OralRecorder from "./OralRecorder";
import {
  type ChoiceQuestion,
  type GameMode,
  type GameQuestion,
  type OrderQuestion,
  modeLabels,
  pickQuestion,
  shuffled,
} from "./questions";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

type Feedback = { kind: "correct" | "wrong"; text: string } | null;
type WordToken = { id: string; label: string };

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

function ModeMark({ mode }: { mode: GameMode }) {
  if (mode === "listen") {
    return <span className="mode-mark listen-mark" aria-hidden="true"><i /><i /><i /><i /><i /></span>;
  }
  if (mode === "read") {
    return <span className="mode-mark read-mark" aria-hidden="true"><i /><i /></span>;
  }
  if (mode === "language") {
    return <span className="mode-mark letter-mark" aria-hidden="true">Aa</span>;
  }
  if (mode === "order") {
    return <span className="mode-mark order-mark" aria-hidden="true"><i /><i /><i /></span>;
  }
  if (mode === "write") {
    return <span className="mode-mark write-mark" aria-hidden="true"><i /></span>;
  }
  return <span className="mode-mark oral-mark" aria-hidden="true"><i /><b /></span>;
}

function ConfettiBurst() {
  return (
    <div className="confetti-burst" aria-hidden="true">
      {confetti.map((piece) => <i key={piece} style={{ "--piece": piece } as React.CSSProperties} />)}
      <span className="success-halo" />
    </div>
  );
}

function HomeScreen({ onStart }: { onStart: () => void }) {
  return (
    <main className="app-shell home-screen">
      <AmbientScene />
      <div className="top-brand"><span className="brand-gem" />Bahasa Melayu <b>Tahun 2</b></div>

      <section className="hero-panel" aria-labelledby="hero-title">
        <div className="hero-kicker"><i /> Belajar sambil bermain <i /></div>
        <div className="hero-title-wrap">
          <span className="title-shadow" aria-hidden="true">Jom Main</span>
          <h1 id="hero-title">Jom Main<br /><strong>Bahasa!</strong></h1>
        </div>
        <p className="hero-copy">Dengar, baca, susun, tulis dan sebut. Setiap permainan membawa cabaran baharu.</p>

        <button className="start-button" type="button" onClick={onStart}>
          <span className="start-face"><i className="play-triangle" />Mula Bermain</span>
          <span className="start-depth" aria-hidden="true" />
        </button>

        <div className="skill-ribbon" aria-label="Kemahiran: dengar, baca, tulis dan sebut">
          <span>Dengar</span><i /><span>Baca</span><i /><span>Tulis</span><i /><span>Sebut</span>
        </div>
        <p className="no-account-note">Tekan dan terus bermain · Tiada akaun diperlukan</p>
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
      <audio
        ref={audioRef}
        src={`${BASE_PATH}${source}`}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onError={() => setError("Audio belum dapat dimainkan. Cuba sekali lagi.")}
      />
      <button className={`speaker-button ${playing ? "playing" : ""}`} type="button" onClick={play} aria-label="Mainkan audio">
        <span className="speaker-face">
          <i className="speaker-box" />
          <i className="speaker-cone" />
          <i className="sound-wave wave-one" />
          <i className="sound-wave wave-two" />
          <i className="sound-wave wave-three" />
        </span>
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
      {question.passage && (
        <article className="reading-passage">
          <span className="passage-label">Baca petikan</span>
          <p>{question.passage}</p>
        </article>
      )}
      {question.audio && <AudioPrompt source={question.audio} />}
      <h2 className="question-prompt">{question.prompt}</h2>
      <div className={`choice-grid ${options.some((option) => option.length > 34) ? "long-options" : ""}`}>
        {options.map((option, index) => {
          const wrong = wrongAnswers.includes(option);
          return (
            <button
              className={`answer-card ${wrong ? "wrong-choice" : ""}`}
              type="button"
              key={option}
              disabled={locked || wrong}
              onClick={() => onChoose(option)}
            >
              <span className="answer-letter">{String.fromCharCode(65 + index)}</span>
              <span>{option}</span>
              <i className="answer-shine" aria-hidden="true" />
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
  question: OrderQuestion;
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
      <h2 className="question-prompt">{question.prompt}</h2>
      <div className={`sentence-track ${chosen.length === 0 ? "empty" : ""}`}>
        {chosen.length === 0 && <span>Ayat kamu akan muncul di sini</span>}
        {chosen.map((token) => (
          <button type="button" key={token.id} onClick={() => onRemove(token.id)} disabled={locked}>{token.label}</button>
        ))}
      </div>
      <div className="word-cloud">
        {available.map((token) => (
          <button type="button" key={token.id} onClick={() => onSelect(token.id)} disabled={locked}>{token.label}</button>
        ))}
      </div>
      <div className="order-actions">
        <button className="mini-button" type="button" onClick={onReset} disabled={selected.length === 0 || locked}>Susun semula</button>
        <button className="primary-action compact" type="button" onClick={onCheck} disabled={selected.length !== tokens.length || locked}>Semak ayat</button>
      </div>
    </div>
  );
}

function FeedbackPanel({ feedback, onNext }: { feedback: Feedback; onNext: () => void }) {
  if (!feedback) return null;
  return (
    <div className={`feedback-panel ${feedback.kind}`} role="status">
      {feedback.kind === "correct" && <ConfettiBurst />}
      <div className="feedback-icon" aria-hidden="true">{feedback.kind === "correct" ? "✓" : "↻"}</div>
      <div>
        <strong>{feedback.kind === "correct" ? "Hebat!" : "Hampir betul"}</strong>
        <p>{feedback.text}</p>
      </div>
      {feedback.kind === "correct" && (
        <button className="next-button" type="button" onClick={onNext}>Teruskan <span>›</span></button>
      )}
    </div>
  );
}

function GameScreen({ onExit }: { onExit: () => void }) {
  const [question, setQuestion] = useState<GameQuestion>(() => pickQuestion());
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [wrongAnswers, setWrongAnswers] = useState<string[]>([]);
  const [choiceOptions, setChoiceOptions] = useState<string[]>(() => question.kind === "choice" ? shuffled(question.options) : []);
  const [orderTokens, setOrderTokens] = useState<WordToken[]>(() => question.kind === "order" ? shuffled(question.words.map((label, index) => ({ id: `${index}-${label}`, label }))) : []);
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [activityKey, setActivityKey] = useState(0);
  const cardRef = useRef<HTMLElement>(null);
  const labels = modeLabels[question.mode];

  const showQuestion = (next: GameQuestion) => {
    setQuestion(next);
    setFeedback(null);
    setWrongAnswers([]);
    setSelectedWords([]);
    setChoiceOptions(next.kind === "choice" ? shuffled(next.options) : []);
    setOrderTokens(next.kind === "order" ? shuffled(next.words.map((label, index) => ({ id: `${index}-${label}`, label }))) : []);
    setActivityKey((key) => key + 1);
  };

  const nextQuestion = () => {
    const updatedRecent = [...recentIds, question.id].slice(-30);
    const next = pickQuestion(updatedRecent);
    setRecentIds(updatedRecent);
    showQuestion(next);
  };

  const chooseAnswer = (answer: string) => {
    if (question.kind !== "choice" || feedback?.kind === "correct") return;
    if (answer === question.answer) {
      setFeedback({ kind: "correct", text: "Jawapan kamu tepat." });
    } else {
      setWrongAnswers((answers) => [...answers, answer]);
      setFeedback({ kind: "wrong", text: "Cuba lihat atau dengar sekali lagi." });
    }
  };

  const checkOrder = () => {
    if (question.kind !== "order") return;
    const sentence = selectedWords
      .map((id) => orderTokens.find((token) => token.id === id)?.label ?? "")
      .join(" ");
    if (sentence === question.answer) {
      setFeedback({ kind: "correct", text: "Susunan ayat kamu tepat." });
    } else {
      setFeedback({ kind: "wrong", text: "Tekan perkataan dalam ayat untuk mengubah susunan." });
    }
  };

  const completeTool = (text: string) => {
    setFeedback({ kind: "correct", text });
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

  return (
    <main className={`app-shell game-screen accent-${labels.accent}`}>
      <AmbientScene />
      <header className="game-header">
        <button className="home-button" type="button" onClick={onExit} aria-label="Kembali ke halaman utama">
          <span /><span />
        </button>
        <div className="game-brand"><span className="brand-gem" />Bahasa Melayu <b>Tahun 2</b></div>
        <div className="header-spark" aria-hidden="true"><i /><i /><i /></div>
      </header>

      <section
        ref={cardRef}
        className={`challenge-card mode-${question.mode}`}
        onPointerMove={tiltCard}
        onPointerLeave={resetTilt}
      >
        <div className="card-edge" aria-hidden="true" />
        <div className="card-glow" aria-hidden="true" />
        <div className="challenge-heading">
          <div className="mode-orb"><ModeMark mode={question.mode} /></div>
          <div>
            <span>{labels.eyebrow}</span>
            <h1>{labels.title}</h1>
            <p>{instruction}</p>
          </div>
        </div>

        <div className="activity-stage" key={activityKey}>
          {question.kind === "choice" && (
            <ChoiceActivity
              question={question}
              options={choiceOptions}
              wrongAnswers={wrongAnswers}
              locked={feedback?.kind === "correct"}
              onChoose={chooseAnswer}
            />
          )}

          {question.kind === "order" && (
            <OrderActivity
              question={question}
              tokens={orderTokens}
              selected={selectedWords}
              locked={feedback?.kind === "correct"}
              onSelect={(id) => {
                setFeedback(null);
                setSelectedWords((words) => [...words, id]);
              }}
              onRemove={(id) => {
                setFeedback(null);
                setSelectedWords((words) => words.filter((word) => word !== id));
              }}
              onReset={() => {
                setFeedback(null);
                setSelectedWords([]);
                setOrderTokens(shuffled(orderTokens));
              }}
              onCheck={checkOrder}
            />
          )}

          {question.kind === "write" && (
            <>
              <h2 className="question-prompt tool-prompt">{question.prompt}</h2>
              <HandwritingCanvas target={question.target} onSuccess={() => completeTool("Kamu sudah menulis dan menyemaknya.")} />
            </>
          )}

          {question.kind === "oral" && (
            <>
              <h2 className="question-prompt tool-prompt">{question.prompt}</h2>
              <OralRecorder target={question.target} modelAudio={question.modelAudio} onSuccess={() => completeTool("Kamu sudah membaca dan menyemak rakaman.")} />
            </>
          )}
        </div>

        <FeedbackPanel feedback={feedback} onNext={nextQuestion} />
      </section>
    </main>
  );
}

export default function Home() {
  const [playing, setPlaying] = useState(false);
  return playing ? <GameScreen onExit={() => setPlaying(false)} /> : <HomeScreen onStart={() => setPlaying(true)} />;
}
