"use client";

import { useEffect, useRef, useState } from "react";
import { transcriptIsExact } from "./speechAssessment";

type OralRecorderProps = {
  target: string;
  modelAudio: string;
  onSuccess: () => void;
  onResult?: (passed: boolean) => void;
  onReset?: () => void;
};

type SpeechAssessment = {
  passed: boolean;
  score?: number;
  accuracy?: number;
  fluency?: number;
  feedback?: string;
  transcript?: string;
};

type BrowserSpeechResult = {
  isFinal: boolean;
  length: number;
  [index: number]: { transcript: string };
};

type BrowserSpeechEvent = {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: BrowserSpeechResult;
  };
};

type BrowserSpeechRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: BrowserSpeechEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: (audioTrack?: MediaStreamTrack) => void;
  stop: () => void;
  abort: () => void;
};

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

declare global {
  interface Window {
    SpeechRecognition?: BrowserSpeechRecognitionConstructor;
    webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
  }
}

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const ASSESS_API_BASE = process.env.NEXT_PUBLIC_ASSESS_API_BASE?.replace(/\/$/, "") ?? "";

function studentFeedback(feedback: string | undefined, fallback: string) {
  return feedback && !feedback.includes("%") ? feedback : fallback;
}

function joinedTranscript(current: string, next: string) {
  return `${current} ${next}`.trim();
}

function supportsSpeechRecognitionTrack() {
  const chromiumVersion = navigator.userAgent.match(/\b(?:Chrome|Chromium)\/(\d+)/i)?.[1];
  return chromiumVersion ? Number(chromiumVersion) >= 135 : false;
}

function recognitionFailureMessage(error: string) {
  if (error === "unsupported") {
    return "Peranti ini belum menyediakan semakan suara automatik. Cuba pada Chrome atau Edge yang terkini.";
  }
  if (error === "not-allowed" || error === "service-not-allowed") {
    return "Benarkan mikrofon dan pengecaman suara pada pelayar, kemudian cuba lagi.";
  }
  if (error === "audio-capture") {
    return "Rakaman berjaya, tetapi semakan suara belum dapat menggunakan mikrofon. Buka dalam Chrome terkini dan cuba lagi.";
  }
  if (error === "network") {
    return "Rakaman berjaya, tetapi semakan suara tidak dapat berhubung. Pastikan Internet stabil, kemudian cuba lagi.";
  }
  if (error === "language-not-supported") {
    return "Pelayar ini belum menyokong semakan suara Bahasa Melayu.";
  }
  if (error === "no-speech") {
    return "Rakaman berjaya, tetapi semakan suara belum mengesan perkataan. Mula membaca sebaik sahaja rakaman bermula.";
  }
  return "Semakan suara belum mendapat bacaan. Dengar rakaman dan cuba sekali lagi.";
}

export default function OralRecorder({ target, modelAudio, onSuccess, onResult, onReset }: OralRecorderProps) {
  const modelRef = useRef<HTMLAudioElement>(null);
  const recordingRef = useRef<HTMLAudioElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordingBlobRef = useRef<Blob | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const objectUrlRef = useRef<string>("");
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const transcriptRef = useRef("");
  const committedTranscriptRef = useRef("");
  const interimTranscriptRef = useRef("");
  const recognitionErrorRef = useRef("");
  const recognitionShouldRunRef = useRef(false);
  const recognitionRestartBlockedRef = useRef(false);
  const recognitionSessionRef = useRef(0);
  const recognitionRestartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streamReleaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingStreamReleaseRef = useRef<(() => void) | null>(null);
  const analyserFrameRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [recordingUrl, setRecordingUrl] = useState("");
  const [status, setStatus] = useState<"idle" | "recording" | "review" | "checking" | "passed" | "retry">("idle");
  const [level, setLevel] = useState(0.08);
  const [message, setMessage] = useState("");
  const [modelPlaying, setModelPlaying] = useState(false);
  const [recordingPlaying, setRecordingPlaying] = useState(false);

  useEffect(() => {
    return () => {
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
      if (recognitionRestartTimerRef.current) clearTimeout(recognitionRestartTimerRef.current);
      if (streamReleaseTimerRef.current) clearTimeout(streamReleaseTimerRef.current);
      recognitionShouldRunRef.current = false;
      recognitionSessionRef.current += 1;
      cancelAnimationFrame(analyserFrameRef.current);
      pendingStreamReleaseRef.current?.();
      pendingStreamReleaseRef.current = null;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      recognitionRef.current?.abort();
      void audioContextRef.current?.close();
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  const playModel = async () => {
    const audio = modelRef.current;
    if (!audio) return;
    try {
      audio.currentTime = 0;
      await audio.play();
      setModelPlaying(true);
      setMessage("");
    } catch {
      setMessage("Contoh suara belum dapat dimainkan.");
    }
  };

  const watchLevel = (stream: MediaStream) => {
    const AudioContextClass = window.AudioContext;
    const context = new AudioContextClass();
    const source = context.createMediaStreamSource(stream);
    const analyser = context.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    audioContextRef.current = context;
    const values = new Uint8Array(analyser.frequencyBinCount);

    const sample = () => {
      analyser.getByteFrequencyData(values);
      const average = values.reduce((sum, value) => sum + value, 0) / values.length / 255;
      setLevel(Math.max(0.08, Math.min(1, average * 2.6)));
      analyserFrameRef.current = requestAnimationFrame(sample);
    };
    sample();
  };

  const releasePendingStream = () => {
    if (streamReleaseTimerRef.current) {
      clearTimeout(streamReleaseTimerRef.current);
      streamReleaseTimerRef.current = null;
    }
    pendingStreamReleaseRef.current?.();
    pendingStreamReleaseRef.current = null;
  };

  const startSpeechRecognition = (
    audioTrack: MediaStreamTrack | null,
    session = recognitionSessionRef.current,
  ) => {
    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Recognition) {
      recognitionErrorRef.current = "unsupported";
      recognitionRestartBlockedRef.current = true;
      return;
    }
    if (
      session !== recognitionSessionRef.current
      || !recognitionShouldRunRef.current
      || (audioTrack && audioTrack.readyState !== "live")
    ) return;

    try {
      const recognition = new Recognition();
      recognition.lang = "ms-MY";
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.onresult = (event) => {
        if (session !== recognitionSessionRef.current) return;
        let interimTranscript = "";
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const part = event.results[index][0]?.transcript?.trim() ?? "";
          if (!part) continue;
          if (event.results[index].isFinal) {
            committedTranscriptRef.current = joinedTranscript(committedTranscriptRef.current, part);
          } else {
            interimTranscript = joinedTranscript(interimTranscript, part);
          }
        }
        interimTranscriptRef.current = interimTranscript;
        transcriptRef.current = joinedTranscript(committedTranscriptRef.current, interimTranscript);
        recognitionErrorRef.current = "";
        recognitionRestartBlockedRef.current = false;
      };
      recognition.onerror = (event) => {
        if (session !== recognitionSessionRef.current) return;
        if (event.error === "aborted" && !recognitionShouldRunRef.current) return;
        recognitionErrorRef.current = event.error;
        recognitionRestartBlockedRef.current = [
          "audio-capture",
          "language-not-supported",
          "network",
          "not-allowed",
          "service-not-allowed",
        ].includes(event.error);
      };
      recognition.onend = () => {
        if (session !== recognitionSessionRef.current) {
          if (recognitionRef.current === recognition) recognitionRef.current = null;
          return;
        }
        if (interimTranscriptRef.current) {
          committedTranscriptRef.current = joinedTranscript(
            committedTranscriptRef.current,
            interimTranscriptRef.current,
          );
          interimTranscriptRef.current = "";
          transcriptRef.current = committedTranscriptRef.current;
        }
        if (recognitionRef.current === recognition) recognitionRef.current = null;
        if (
          recognitionShouldRunRef.current
          && !recognitionRestartBlockedRef.current
          && (!audioTrack || audioTrack.readyState === "live")
        ) {
          recognitionRestartTimerRef.current = setTimeout(() => {
            recognitionRestartTimerRef.current = null;
            startSpeechRecognition(audioTrack, session);
          }, 180);
        } else if (!recognitionShouldRunRef.current) {
          releasePendingStream();
        }
      };
      recognitionRef.current = recognition;
      if (audioTrack && supportsSpeechRecognitionTrack()) {
        try {
          recognition.start(audioTrack);
        } catch {
          recognition.start();
        }
      } else {
        recognition.start();
      }
    } catch {
      recognitionErrorRef.current = "unavailable";
      recognitionRestartBlockedRef.current = true;
      recognitionRef.current = null;
    }
  };

  const playRecording = async () => {
    const audio = recordingRef.current;
    if (!audio || !recordingUrl) return;
    try {
      setMessage("");
      audio.currentTime = 0;
      await audio.play();
      setRecordingPlaying(true);
    } catch {
      setRecordingPlaying(false);
      setMessage("Rakaman tidak dapat dimainkan. Rakam semula dan cuba lagi.");
    }
  };

  const startRecording = async () => {
    onReset?.();
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setStatus("retry");
      setMessage("Peranti ini belum menyokong rakaman suara.");
      onResult?.(false);
      return;
    }

    recognitionShouldRunRef.current = false;
    recognitionSessionRef.current += 1;
    const session = recognitionSessionRef.current;
    recognitionRestartBlockedRef.current = false;
    if (recognitionRestartTimerRef.current) clearTimeout(recognitionRestartTimerRef.current);
    recognitionRestartTimerRef.current = null;
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    setStatus("checking");
    setMessage("Sedang menyediakan mikrofon…");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (session !== recognitionSessionRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      chunksRef.current = [];
      recordingBlobRef.current = null;
      transcriptRef.current = "";
      committedTranscriptRef.current = "";
      interimTranscriptRef.current = "";
      recognitionErrorRef.current = "";
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = "";
      }
      setRecordingUrl("");
      setRecordingPlaying(false);

      const preferred = [
        "audio/mp4;codecs=mp4a.40.2",
        "audio/mp4",
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
      ].find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, preferred ? { mimeType: preferred } : undefined);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        recognitionShouldRunRef.current = false;
        if (recognitionRestartTimerRef.current) clearTimeout(recognitionRestartTimerRef.current);
        recognitionRestartTimerRef.current = null;
        const mimeType = chunksRef.current[0]?.type || recorder.mimeType || preferred || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: mimeType });
        recordingBlobRef.current = blob;
        try {
          recognitionRef.current?.stop();
        } catch {
          // The recognition end event clears the reference after its final result.
        }
        const releaseStream = () => {
          stream.getTracks().forEach((track) => track.stop());
          if (streamRef.current === stream) streamRef.current = null;
        };
        if (recognitionRef.current) {
          pendingStreamReleaseRef.current = releaseStream;
          streamReleaseTimerRef.current = setTimeout(releasePendingStream, 800);
        } else {
          releaseStream();
        }
        if (blob.size === 0) {
          setStatus("retry");
          setMessage("Rakaman kosong. Pastikan mikrofon dibenarkan dan cuba lagi.");
          onResult?.(false);
          setLevel(0.08);
          void audioContextRef.current?.close();
          audioContextRef.current = null;
          return;
        }
        const url = URL.createObjectURL(blob);
        objectUrlRef.current = url;
        setRecordingUrl(url);
        setStatus("review");
        setMessage("Rakaman siap. Tekan Dengar rakaman, kemudian Semak bacaan.");
        setLevel(0.08);
        cancelAnimationFrame(analyserFrameRef.current);
        void audioContextRef.current?.close();
        audioContextRef.current = null;
      };
      if (recorder.mimeType.includes("mp4")) recorder.start();
      else recorder.start(250);
      const audioTrack = stream.getAudioTracks()[0] ?? null;
      recognitionShouldRunRef.current = true;
      startSpeechRecognition(audioTrack, session);
      watchLevel(stream);
      setStatus("recording");
      setMessage("Baca dengan suara yang jelas.");
      stopTimerRef.current = setTimeout(() => stopRecording(), 12000);
    } catch {
      if (session !== recognitionSessionRef.current) return;
      recognitionShouldRunRef.current = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      void audioContextRef.current?.close();
      audioContextRef.current = null;
      setStatus("retry");
      setMessage("Benarkan mikrofon untuk merakam bacaan.");
      onResult?.(false);
    }
  };

  const stopRecording = () => {
    if (stopTimerRef.current) {
      clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
    recognitionShouldRunRef.current = false;
    if (recognitionRestartTimerRef.current) {
      clearTimeout(recognitionRestartTimerRef.current);
      recognitionRestartTimerRef.current = null;
    }
    try {
      recognitionRef.current?.stop();
    } catch {
      recognitionRef.current = null;
    }
    if (recorderRef.current?.state === "recording") {
      if (!recorderRef.current.mimeType.includes("mp4")) {
        try {
          recorderRef.current.requestData();
        } catch {
          // Some browsers emit the final chunk only when stop() is called.
        }
      }
      recorderRef.current.stop();
    }
  };

  const retry = () => {
    recognitionShouldRunRef.current = false;
    recognitionSessionRef.current += 1;
    if (recognitionRestartTimerRef.current) clearTimeout(recognitionRestartTimerRef.current);
    recognitionRestartTimerRef.current = null;
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    releasePendingStream();
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = "";
    recordingBlobRef.current = null;
    transcriptRef.current = "";
    committedTranscriptRef.current = "";
    interimTranscriptRef.current = "";
    recognitionErrorRef.current = "";
    recognitionRestartBlockedRef.current = false;
    setRecordingUrl("");
    setRecordingPlaying(false);
    setStatus("idle");
    setMessage("");
    onReset?.();
  };

  const assess = async () => {
    const blob = recordingBlobRef.current;
    if (!recordingUrl || !blob) return;
    if (!ASSESS_API_BASE) {
      if (recognitionRef.current) {
        setStatus("checking");
        setMessage("Sedang menyiapkan semakan suara…");
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      const transcript = transcriptRef.current.trim();
      if (!transcript) {
        setStatus("retry");
        setMessage(recognitionFailureMessage(recognitionErrorRef.current));
        onResult?.(false);
        return;
      }
      if (transcriptIsExact(target, transcript)) {
        setStatus("passed");
        setMessage("Hebat! Semua perkataan dibaca dengan tepat.");
        onResult?.(true);
        onSuccess();
      } else {
        setStatus("retry");
        setMessage(`Saya dengar “${transcript}”. Ada perkataan yang belum tepat. Cuba baca setiap perkataan sekali lagi.`);
        onResult?.(false);
      }
      return;
    }

    setStatus("checking");
    setMessage("Sedang menyemak bacaan…");
    try {
      const form = new FormData();
      const extension = blob.type.includes("mp4") ? "m4a" : blob.type.includes("ogg") ? "ogg" : "webm";
      form.append("audio", blob, `bacaan.${extension}`);
      form.append("target", target);
      form.append("locale", "ms-MY");
      const response = await fetch(`${ASSESS_API_BASE}/speech`, { method: "POST", body: form });
      if (!response.ok) throw new Error("assessment unavailable");
      const result = (await response.json()) as SpeechAssessment;
      const exact = result.transcript
        ? transcriptIsExact(target, result.transcript)
        : result.accuracy === 100;
      if (result.passed && exact) {
        setStatus("passed");
        setMessage(studentFeedback(result.feedback, "Hebat! Semua perkataan dibaca dengan tepat."));
        onResult?.(true);
        onSuccess();
      } else {
        setStatus("retry");
        setMessage(studentFeedback(result.feedback, "Belum tepat. Semua perkataan mesti dibaca dengan betul dan mengikut urutan."));
        onResult?.(false);
      }
    } catch {
      setStatus("retry");
      setMessage("Semakan automatik belum dapat digunakan. Cuba rakam semula sebentar lagi.");
      onResult?.(false);
    }
  };

  return (
    <div className="oral-tool">
      <audio
        ref={modelRef}
        src={`${BASE_PATH}${modelAudio}`}
        preload="metadata"
        onEnded={() => setModelPlaying(false)}
        onPause={() => setModelPlaying(false)}
      />

      <div className="oral-target">{target}</div>

      <div className={`voice-orb ${status === "recording" ? "recording" : ""}`} style={{ "--voice-level": level } as React.CSSProperties} aria-hidden="true">
        <span className="voice-core" />
        <span className="voice-ring ring-one" />
        <span className="voice-ring ring-two" />
        <div className="voice-bars">
          {Array.from({ length: 9 }, (_, index) => (
            <i key={index} style={{ "--bar": index } as React.CSSProperties} />
          ))}
        </div>
      </div>

      <div className="oral-actions">
        <button className={`mini-button model-button ${modelPlaying ? "active" : ""}`} type="button" onClick={playModel}>
          {modelPlaying ? "Sedang dengar…" : "Dengar contoh"}
        </button>
        {status !== "recording" ? (
          <button className="primary-action compact mic-button" type="button" onClick={startRecording} disabled={status === "checking" || status === "passed"}>
            Rakam suara
          </button>
        ) : (
          <button className="stop-button" type="button" onClick={stopRecording}>Berhenti</button>
        )}
      </div>

      {recordingUrl && (
        <div className="recording-review">
          <audio
            ref={recordingRef}
            className="recording-player"
            src={recordingUrl}
            controls
            preload="auto"
            onPlay={() => setRecordingPlaying(true)}
            onPause={() => setRecordingPlaying(false)}
            onEnded={() => setRecordingPlaying(false)}
            onError={() => {
              setRecordingPlaying(false);
              setMessage("Rakaman tidak dapat dimainkan. Rakam semula dan cuba lagi.");
            }}
          />
          <button className={`mini-button playback-button ${recordingPlaying ? "active" : ""}`} type="button" onClick={playRecording}>
            {recordingPlaying ? "Sedang dengar…" : "Dengar rakaman"}
          </button>
          <div className="self-check-actions">
            <button className="mini-button" type="button" onClick={retry} disabled={status === "passed"}>Cuba lagi</button>
            <button className="primary-action compact" type="button" onClick={assess} disabled={status === "checking" || status === "passed"}>
              {status === "checking" ? "Menyemak…" : "Semak bacaan"}
            </button>
          </div>
        </div>
      )}

      {message && <p className={`tool-message ${status}`} role="status">{message}</p>}
    </div>
  );
}
