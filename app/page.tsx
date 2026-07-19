"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from "react";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const asset = (path: string) => `${BASE_PATH}${path}`;

type StageId = "mcq" | "matching" | "fill" | "rearrange";
type Feedback = { kind: "correct" | "wrong"; text: string } | null;

type PhraseItem = {
  id: string;
  phrase: string;
  audio: string;
  clue: string;
  emoji: string;
  before: string;
  blank: string;
  after: string;
};

type ChoiceQuestion = PhraseItem & { options: string[] };
type RearrangeQuestion = PhraseItem & { answer: string[]; shuffled: string[] };

const ROUND_SIZE = 5;

const stages: Array<{
  id: StageId;
  label: string;
  title: string;
  subtitle: string;
  icon: string;
  tone: string;
}> = [
  {
    id: "mcq",
    label: "MCQ",
    title: "Dengar & Pilih",
    subtitle: "Dengar suara Yasmin, kemudian pilih frasa.",
    icon: "✓",
    tone: "teal",
  },
  {
    id: "matching",
    label: "Padankan",
    title: "Cari Pasangan",
    subtitle: "Padankan frasa dengan maksud yang betul.",
    icon: "✦",
    tone: "yellow",
  },
  {
    id: "fill",
    label: "Isi Tempat Kosong",
    title: "Lengkapkan Frasa",
    subtitle: "Pilih perkataan yang melengkapkan frasa.",
    icon: "?",
    tone: "blue",
  },
  {
    id: "rearrange",
    label: "Susun Semula",
    title: "Susun Perkataan",
    subtitle: "Susun perkataan menjadi frasa yang betul.",
    icon: "≡",
    tone: "purple",
  },
];

const phraseBank: PhraseItem[] = [
  {
    id: "mendirikan-khemah",
    phrase: "mendirikan khemah",
    audio: asset("/audio/yasmin/mendirikan-khemah.mp3"),
    clue: "Memasang tempat berteduh",
    emoji: "⛺",
    before: "mendirikan",
    blank: "khemah",
    after: "",
  },
  {
    id: "menyediakan-makanan",
    phrase: "menyediakan makanan",
    audio: asset("/audio/yasmin/menyediakan-makanan.mp3"),
    clue: "Menyiapkan hidangan",
    emoji: "🍱",
    before: "menyediakan",
    blank: "makanan",
    after: "",
  },
  {
    id: "membawa-bakul",
    phrase: "membawa bakul",
    audio: asset("/audio/yasmin/membawa-bakul.mp3"),
    clue: "Mengangkat bekas anyaman",
    emoji: "🧺",
    before: "membawa",
    blank: "bakul",
    after: "",
  },
  {
    id: "mengutip-ranting",
    phrase: "mengutip ranting",
    audio: asset("/audio/yasmin/mengutip-ranting.mp3"),
    clue: "Mengambil kayu kecil",
    emoji: "🪵",
    before: "mengutip",
    blank: "ranting",
    after: "",
  },
  {
    id: "memasang-pancang",
    phrase: "memasang pancang",
    audio: asset("/audio/yasmin/memasang-pancang.mp3"),
    clue: "Mengetuk pasak khemah",
    emoji: "🔨",
    before: "memasang",
    blank: "pancang",
    after: "",
  },
  {
    id: "mengikat-tali",
    phrase: "mengikat tali",
    audio: asset("/audio/yasmin/mengikat-tali.mp3"),
    clue: "Membuat ikatan yang kemas",
    emoji: "🪢",
    before: "mengikat",
    blank: "tali",
    after: "",
  },
  {
    id: "membentangkan-tikar",
    phrase: "membentangkan tikar",
    audio: asset("/audio/yasmin/membentangkan-tikar.mp3"),
    clue: "Membuka alas untuk duduk",
    emoji: "🟨",
    before: "membentangkan",
    blank: "tikar",
    after: "",
  },
  {
    id: "menyimpan-peralatan",
    phrase: "menyimpan peralatan",
    audio: asset("/audio/yasmin/menyimpan-peralatan.mp3"),
    clue: "Meletakkan barang ke tempatnya",
    emoji: "🎒",
    before: "menyimpan",
    blank: "peralatan",
    after: "",
  },
  {
    id: "membersihkan-kawasan",
    phrase: "membersihkan kawasan",
    audio: asset("/audio/yasmin/membersihkan-kawasan.mp3"),
    clue: "Menjaga tapak tetap bersih",
    emoji: "🧹",
    before: "membersihkan",
    blank: "kawasan",
    after: "",
  },
  {
    id: "menyalakan-lampu",
    phrase: "menyalakan lampu",
    audio: asset("/audio/yasmin/menyalakan-lampu.mp3"),
    clue: "Membuat kawasan bercahaya",
    emoji: "🔦",
    before: "menyalakan",
    blank: "lampu",
    after: "",
  },
  {
    id: "di-taman-negara",
    phrase: "di taman negara",
    audio: asset("/audio/yasmin/di-taman-negara.mp3"),
    clue: "Tempat alam semula jadi",
    emoji: "🌳",
    before: "di taman",
    blank: "negara",
    after: "",
  },
  {
    id: "di-kawasan-perkhemahan",
    phrase: "di kawasan perkhemahan",
    audio: asset("/audio/yasmin/di-kawasan-perkhemahan.mp3"),
    clue: "Tapak untuk berkhemah",
    emoji: "🏕️",
    before: "di kawasan",
    blank: "perkhemahan",
    after: "",
  },
  {
    id: "bersama-sepupu",
    phrase: "bersama sepupu",
    audio: asset("/audio/yasmin/bersama-sepupu.mp3"),
    clue: "Ditemani ahli keluarga",
    emoji: "👧",
    before: "bersama",
    blank: "sepupu",
    after: "",
  },
  {
    id: "dengan-berhati-hati",
    phrase: "dengan berhati-hati",
    audio: asset("/audio/yasmin/dengan-berhati-hati.mp3"),
    clue: "Melakukan sesuatu dengan cermat",
    emoji: "👣",
    before: "dengan",
    blank: "berhati-hati",
    after: "",
  },
  {
    id: "secara-bergotong-royong",
    phrase: "secara bergotong-royong",
    audio: asset("/audio/yasmin/secara-bergotong-royong.mp3"),
    clue: "Bekerjasama melakukan tugas",
    emoji: "🤝",
    before: "secara",
    blank: "bergotong-royong",
    after: "",
  },
  {
    id: "udara-yang-nyaman",
    phrase: "udara yang nyaman",
    audio: asset("/audio/yasmin/udara-yang-nyaman.mp3"),
    clue: "Suasana segar dan selesa",
    emoji: "🍃",
    before: "udara yang",
    blank: "nyaman",
    after: "",
  },
];

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[target]] = [copy[target], copy[index]];
  }
  return copy;
}

function sample<T>(items: T[], count: number): T[] {
  return shuffle(items).slice(0, count);
}

function choices(answer: string, pool: string[]): string[] {
  return shuffle([answer, ...sample(pool.filter((item) => item !== answer), 2)]);
}

function shuffledTokens(phrase: string): string[] {
  const answer = phrase.split(" ");
  const mixed = shuffle(answer);
  if (mixed.join(" ") === answer.join(" ") && mixed.length > 1) {
    [mixed[0], mixed[1]] = [mixed[1], mixed[0]];
  }
  return mixed;
}

function createChoiceRound(field: "phrase" | "blank"): ChoiceQuestion[] {
  const pool = phraseBank.map((item) => item[field]);
  return sample(phraseBank, ROUND_SIZE).map((item) => ({
    ...item,
    options: choices(item[field], pool),
  }));
}

function createRearrangeRound(): RearrangeQuestion[] {
  return sample(phraseBank, ROUND_SIZE).map((item) => ({
    ...item,
    answer: item.phrase.split(" "),
    shuffled: shuffledTokens(item.phrase),
  }));
}

export default function Home() {
  const [screen, setScreen] = useState<"home" | "game" | "stageDone">("home");
  const [soundOn, setSoundOn] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [activeStage, setActiveStage] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [stageScore, setStageScore] = useState(0);
  const [completed, setCompleted] = useState<Partial<Record<StageId, number>>>({});
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [selectedPhrase, setSelectedPhrase] = useState<string | null>(null);
  const [matches, setMatches] = useState<Record<string, string>>({});
  const [arranged, setArranged] = useState<string[]>([]);
  const [mcqRound, setMcqRound] = useState<ChoiceQuestion[]>([]);
  const [matchingPhrases, setMatchingPhrases] = useState<PhraseItem[]>([]);
  const [matchingTargets, setMatchingTargets] = useState<PhraseItem[]>([]);
  const [fillRound, setFillRound] = useState<ChoiceQuestion[]>([]);
  const [rearrangeRound, setRearrangeRound] = useState<RearrangeQuestion[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const completedCount = Object.keys(completed).length;
  const totalStars = Object.values(completed).reduce((sum, value) => sum + (value ?? 0), 0);
  const currentStage = stages[activeStage];
  const mcqQuestion = mcqRound[questionIndex];
  const fillQuestion = fillRound[questionIndex];
  const rearrangeQuestion = rearrangeRound[questionIndex];
  const currentAudioItem =
    currentStage.id === "mcq"
      ? mcqQuestion
      : currentStage.id === "fill"
        ? fillQuestion
        : currentStage.id === "rearrange"
          ? rearrangeQuestion
          : undefined;
  const currentProgress =
    currentStage.id === "matching"
      ? Object.keys(matches).length
      : questionIndex + (feedback ? 1 : 0);

  const availableRearrangeTokens = useMemo(() => {
    if (currentStage.id !== "rearrange" || !rearrangeQuestion) return [];
    const used = [...arranged];
    return rearrangeQuestion.shuffled.filter((token) => {
      const index = used.indexOf(token);
      if (index === -1) return true;
      used.splice(index, 1);
      return false;
    });
  }, [arranged, currentStage.id, rearrangeQuestion]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  function stopAudio() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setPlayingId(null);
  }

  function playYasmin(item: PhraseItem) {
    if (!soundOn || typeof window === "undefined") return;
    stopAudio();
    const audio = new Audio(item.audio);
    audio.preload = "auto";
    audio.onended = () => {
      if (audioRef.current === audio) audioRef.current = null;
      setPlayingId(null);
    };
    audio.onerror = () => {
      if (audioRef.current === audio) audioRef.current = null;
      setPlayingId(null);
    };
    audioRef.current = audio;
    setPlayingId(item.id);
    void audio.play().catch(() => {
      if (audioRef.current === audio) audioRef.current = null;
      setPlayingId(null);
    });
  }

  function toggleSound() {
    setSoundOn((value) => {
      if (value) stopAudio();
      return !value;
    });
  }

  function resetStageState() {
    stopAudio();
    setQuestionIndex(0);
    setStageScore(0);
    setFeedback(null);
    setSelectedPhrase(null);
    setMatches({});
    setArranged([]);
  }

  function startStage(index: number) {
    const stage = stages[index];
    setActiveStage(index);
    resetStageState();

    if (stage.id === "mcq") setMcqRound(createChoiceRound("phrase"));
    if (stage.id === "matching") {
      const selected = sample(phraseBank, ROUND_SIZE);
      setMatchingPhrases(shuffle(selected));
      setMatchingTargets(shuffle(selected));
    }
    if (stage.id === "fill") setFillRound(createChoiceRound("blank"));
    if (stage.id === "rearrange") setRearrangeRound(createRearrangeRound());

    setScreen("game");
  }

  function startSuggestedStage() {
    const nextIncomplete = stages.findIndex((stage) => completed[stage.id] === undefined);
    startStage(nextIncomplete >= 0 ? nextIncomplete : 0);
  }

  function answerChoice(choice: string, answer: string) {
    if (feedback) return;
    const correct = choice === answer;
    if (correct) {
      setStageScore((score) => score + 1);
      setFeedback({ kind: "correct", text: "Bagus! Jawapan kamu betul." });
    } else {
      setFeedback({ kind: "wrong", text: `Jawapan yang betul ialah “${answer}”.` });
    }
  }

  function nextQuestion() {
    if (questionIndex >= ROUND_SIZE - 1) {
      finishStage();
      return;
    }
    stopAudio();
    setQuestionIndex((index) => index + 1);
    setFeedback(null);
    setArranged([]);
  }

  function finishStage() {
    stopAudio();
    const id = currentStage.id;
    setCompleted((previous) => ({
      ...previous,
      [id]: Math.max(previous[id] ?? 0, stageScore),
    }));
    setScreen("stageDone");
  }

  function matchTarget(targetId: string) {
    if (!selectedPhrase || matches[targetId]) return;
    if (selectedPhrase === targetId) {
      setMatches((previous) => ({ ...previous, [targetId]: selectedPhrase }));
      setSelectedPhrase(null);
      setStageScore((score) => score + 1);
      setFeedback({ kind: "correct", text: "Padanan tepat! Pilih pasangan seterusnya." });
    } else {
      setFeedback({ kind: "wrong", text: "Belum tepat. Cuba pilih maksud yang lain." });
    }
  }

  function checkArrangement() {
    if (feedback || !rearrangeQuestion || arranged.length !== rearrangeQuestion.answer.length) return;
    answerChoice(arranged.join(" "), rearrangeQuestion.phrase);
  }

  function goToNextStage() {
    const nextIncomplete = stages.findIndex((stage) => completed[stage.id] === undefined);
    if (nextIncomplete >= 0) startStage(nextIncomplete);
    else setScreen("home");
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setScreen("home")} aria-label="Kembali ke halaman utama">
          <span className="brand-mark" aria-hidden="true">◒</span>
          <span>Frasa <b>小勇士</b></span>
        </button>
        <div className="top-actions">
          <span className="star-total" aria-label={`${totalStars} bintang terkumpul`}>★ {totalStars}/20</span>
          <button
            className="round-button"
            onClick={toggleSound}
            aria-label={soundOn ? "Matikan audio" : "Hidupkan audio"}
            aria-pressed={soundOn}
          >
            {soundOn ? "🔊" : "🔇"}
          </button>
        </div>
      </header>

      {screen === "home" && (
        <div className="page-wrap home-view">
          <section className="hero-grid">
            <div className="hero-copy">
              <span className="eyebrow">Tahun 2 · Bahasa Melayu</span>
              <h1>Frasa <span>小勇士</span></h1>
              <p className="standard-pill">1.1.1 (i) frasa</p>
              <div className="feature-pills" aria-label="Ciri permainan">
                <span>16 frasa</span>
                <span>5 soalan rawak</span>
                <span>🎙 Yasmin tetap</span>
              </div>

              <div className="overall-progress" aria-label={`${completedCount} daripada 4 cabaran selesai`}>
                <div className="progress-label">
                  <span className="progress-star">★</span>
                  <strong>{completedCount}/4</strong>
                  <span>cabaran selesai</span>
                </div>
                <div className="progress-track"><span style={{ width: `${completedCount * 25}%` }} /></div>
              </div>

              <button className="primary-button" onClick={startSuggestedStage}>
                <span aria-hidden="true">▶</span>
                {completedCount === 0 ? "Mula Bermain" : completedCount === 4 ? "Main Semula" : "Sambung Bermain"}
              </button>
            </div>

            <div className="hero-art-card">
              <img src={asset("/camping-hero.webp")} alt="Kanak-kanak mendirikan khemah di taman negara" />
              <div className="art-caption">
                <span>⛺</span>
                <p><b>Misi hari ini</b><br />Dengar, faham dan bina frasa.</p>
              </div>
            </div>
          </section>

          <section className="stage-section" aria-labelledby="stage-title">
            <div className="section-heading">
              <div>
                <span className="section-kicker">4 CABARAN · 64 BENTUK SOALAN</span>
                <h2 id="stage-title">Pilih aktiviti kamu</h2>
              </div>
              <p>Setiap aktiviti memilih 5 daripada 16 soalan secara rawak.</p>
            </div>
            <div className="stage-grid">
              {stages.map((stage, index) => (
                <button
                  key={stage.id}
                  className={`stage-card ${stage.tone} ${completed[stage.id] !== undefined ? "is-complete" : ""}`}
                  onClick={() => startStage(index)}
                >
                  <span className="stage-icon" aria-hidden="true">{completed[stage.id] !== undefined ? "★" : stage.icon}</span>
                  <span className="stage-text">
                    <strong>{stage.label}</strong>
                    <small>{stage.title} · 5 rawak</small>
                  </span>
                  <span className="stage-arrow" aria-hidden="true">›</span>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      {screen === "game" && (
        <div className="page-wrap game-view">
          <div className="game-toolbar">
            <button className="back-button" onClick={() => { stopAudio(); setScreen("home"); }}>← <span>Menu</span></button>
            <div className={`stage-mini ${currentStage.tone}`}>
              <span>{currentStage.icon}</span>
              <div><small>Cabaran {activeStage + 1}</small><strong>{currentStage.label}</strong></div>
            </div>
            <div className="question-progress">
              <span>{currentStage.id === "matching" ? Object.keys(matches).length : questionIndex + 1}/{ROUND_SIZE}</span>
              <div className="mini-track"><span style={{ width: `${(currentProgress / ROUND_SIZE) * 100}%` }} /></div>
            </div>
          </div>

          <section className="game-card">
            <div className="game-card-heading">
              <span className={`big-icon ${currentStage.tone}`}>{currentStage.icon}</span>
              <div>
                <p>{currentStage.subtitle}</p>
                <h1>{currentStage.title}</h1>
              </div>
            </div>

            {currentStage.id === "mcq" && mcqQuestion && (
              <div className="question-area">
                <button className={`listen-button ${playingId === mcqQuestion.id ? "is-playing" : ""}`} onClick={() => playYasmin(mcqQuestion)}>
                  <span>{playingId === mcqQuestion.id ? "◼" : "🔊"}</span>
                  <strong>{playingId === mcqQuestion.id ? "Yasmin sedang membaca…" : "Dengar frasa"}</strong>
                  <small>Tekan untuk mendengar</small>
                </button>
                <p className="voice-label">Suara tetap: Yasmin · ms-MY-YasminNeural · tiada suara gantian</p>
                <div className="option-grid" role="group" aria-label="Pilihan jawapan">
                  {mcqQuestion.options.map((option, index) => (
                    <button key={option} className="answer-option" disabled={!!feedback} onClick={() => answerChoice(option, mcqQuestion.phrase)}>
                      <span>{String.fromCharCode(65 + index)}</span>{option}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {currentStage.id === "matching" && (
              <div className="matching-area">
                <p className="tap-hint">1. Pilih frasa &nbsp; 2. Tekan maksud pasangannya</p>
                <div className="matching-grid">
                  <div className="phrase-bank" aria-label="Bank frasa">
                    {matchingPhrases.map((pair) => {
                      const used = Object.values(matches).includes(pair.id);
                      return (
                        <button
                          key={pair.id}
                          disabled={used}
                          className={selectedPhrase === pair.id ? "selected" : ""}
                          onClick={() => {
                            setSelectedPhrase(pair.id);
                            setFeedback(null);
                            playYasmin(pair);
                          }}
                        >
                          {used ? "✓ " : playingId === pair.id ? "🔊 " : ""}{pair.phrase}
                        </button>
                      );
                    })}
                  </div>
                  <div className="target-bank" aria-label="Maksud padanan">
                    {matchingTargets.map((pair) => (
                      <button key={pair.id} className={matches[pair.id] ? "matched" : ""} onClick={() => matchTarget(pair.id)}>
                        <span>{pair.emoji}</span>
                        <strong>{matches[pair.id] ? pair.phrase : pair.clue}</strong>
                      </button>
                    ))}
                  </div>
                </div>
                {Object.keys(matches).length === ROUND_SIZE && (
                  <button className="next-button standalone" onClick={finishStage}>Selesai Cabaran →</button>
                )}
              </div>
            )}

            {currentStage.id === "fill" && fillQuestion && (
              <div className="question-area fill-area">
                <div className="sentence-card">
                  <span>{fillQuestion.before}</span>
                  <span className="blank-word">{feedback ? fillQuestion.blank : "________"}</span>
                  {fillQuestion.after && <span>{fillQuestion.after}</span>}
                </div>
                <p className="choice-label">Pilih perkataan yang betul:</p>
                <div className="word-bank">
                  {fillQuestion.options.map((option) => (
                    <button key={option} disabled={!!feedback} onClick={() => answerChoice(option, fillQuestion.blank)}>{option}</button>
                  ))}
                </div>
              </div>
            )}

            {currentStage.id === "rearrange" && rearrangeQuestion && (
              <div className="question-area rearrange-area">
                <div className="arrange-dropzone" aria-label="Susunan jawapan">
                  {arranged.length === 0 && <span className="drop-hint">Tekan perkataan di bawah</span>}
                  {arranged.map((token, index) => (
                    <button key={`${token}-${index}`} onClick={() => { if (!feedback) setArranged((words) => words.filter((_, i) => i !== index)); }}>{token}</button>
                  ))}
                </div>
                <div className="token-bank">
                  {availableRearrangeTokens.map((token, index) => (
                    <button key={`${token}-${index}`} disabled={!!feedback} onClick={() => setArranged((words) => [...words, token])}>{token}</button>
                  ))}
                </div>
                {!feedback && (
                  <button className="check-button" disabled={arranged.length !== rearrangeQuestion.answer.length} onClick={checkArrangement}>Semak Jawapan</button>
                )}
              </div>
            )}

            {feedback && currentStage.id !== "matching" && (
              <div className={`feedback ${feedback.kind}`} role="status" aria-live="polite">
                <span>{feedback.kind === "correct" ? "✓" : "!"}</span>
                <p>{feedback.text}</p>
                <div className="feedback-actions">
                  {currentAudioItem && (
                    <button className="audio-replay" onClick={() => playYasmin(currentAudioItem)}>🔊 Yasmin</button>
                  )}
                  <button className="next-button" onClick={nextQuestion}>{questionIndex === ROUND_SIZE - 1 ? "Lihat Keputusan" : "Soalan Seterusnya"} →</button>
                </div>
              </div>
            )}
            {feedback && currentStage.id === "matching" && Object.keys(matches).length < ROUND_SIZE && (
              <div className={`feedback compact ${feedback.kind}`} role="status" aria-live="polite">
                <span>{feedback.kind === "correct" ? "✓" : "!"}</span><p>{feedback.text}</p>
              </div>
            )}
          </section>
        </div>
      )}

      {screen === "stageDone" && (
        <div className="page-wrap result-view">
          <section className="result-card">
            <div className="celebration" aria-hidden="true">★</div>
            <span className="result-kicker">CABARAN SELESAI</span>
            <h1>Syabas, Frasa 小勇士!</h1>
            <p>Kamu telah menyelesaikan <b>{currentStage.label}</b>.</p>
            <div className="score-badge">
              <span>{Array.from({ length: ROUND_SIZE }, (_, index) => <i key={index} className={index < stageScore ? "earned" : ""}>★</i>)}</span>
              <strong>{stageScore}/{ROUND_SIZE} jawapan betul</strong>
            </div>
            <p className="new-round-note">“Cuba Lagi” akan memilih set soalan dan susunan baharu.</p>
            <div className="result-actions">
              <button className="secondary-button" onClick={() => startStage(activeStage)}>Cuba Lagi</button>
              <button className="primary-button compact-button" onClick={goToNextStage}>{completedCount === 4 ? "Kembali ke Menu" : "Cabaran Seterusnya"} →</button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
