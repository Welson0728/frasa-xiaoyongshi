"use client";

import { useEffect, useRef, useState } from "react";
import { transcriptIsExact, transcriptScore } from "./speechAssessment";

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
  start: () => void;
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
  const recognitionErrorRef = useRef("");
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
      cancelAnimationFrame(analyserFrameRef.current);
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

  const startSpeechRecognition = () => {
    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Recognition) {
      recognitionErrorRef.current = "unsupported";
      return;
    }

    try {
      const recognition = new Recognition();
      let finalTranscript = "";
      recognition.lang = "ms-MY";
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.onresult = (event) => {
        let interimTranscript = "";
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const part = event.results[index][0]?.transcript?.trim() ?? "";
          if (!part) continue;
          if (event.results[index].isFinal) {
            finalTranscript = `${finalTranscript} ${part}`.trim();
          } else {
            interimTranscript = `${interimTranscript} ${part}`.trim();
          }
        }
        transcriptRef.current = `${finalTranscript} ${interimTranscript}`.trim();
      };
      recognition.onerror = (event) => {
        recognitionErrorRef.current = event.error;
      };
      recognition.onend = () => {
        if (recognitionRef.current === recognition) recognitionRef.current = null;
      };
      recognition.start();
      recognitionRef.current = recognition;
    } catch {
      recognitionErrorRef.current = "unavailable";
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
      setMessage("Peranti ini belum menyokong rakaman suara.");
      onResult?.(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      recordingBlobRef.current = null;
      transcriptRef.current = "";
      recognitionErrorRef.current = "";
      recognitionRef.current?.abort();
      recognitionRef.current = null;
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
        const mimeType = chunksRef.current[0]?.type || recorder.mimeType || preferred || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: mimeType });
        recordingBlobRef.current = blob;
        try {
          recognitionRef.current?.stop();
        } catch {
          recognitionRef.current = null;
        }
        if (blob.size === 0) {
          setStatus("retry");
          setMessage("Rakaman kosong. Pastikan mikrofon dibenarkan dan cuba lagi.");
          onResult?.(false);
          setLevel(0.08);
          stream.getTracks().forEach((track) => track.stop());
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
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        void audioContextRef.current?.close();
        audioContextRef.current = null;
      };
      if (recorder.mimeType.includes("mp4")) recorder.start();
      else recorder.start(250);
      startSpeechRecognition();
      watchLevel(stream);
      setStatus("recording");
      setMessage("Baca dengan suara yang jelas.");
      stopTimerRef.current = setTimeout(() => stopRecording(), 12000);
    } catch {
      setMessage("Benarkan mikrofon untuk merakam bacaan.");
      onResult?.(false);
    }
  };

  const stopRecording = () => {
    if (stopTimerRef.current) {
      clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
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
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = "";
    recordingBlobRef.current = null;
    transcriptRef.current = "";
    recognitionErrorRef.current = "";
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
      const transcript = transcriptRef.current.trim();
      if (!transcript) {
        setStatus("retry");
        setMessage(
          recognitionErrorRef.current === "unsupported"
            ? "Peranti ini tidak menyediakan semakan suara automatik. Cuba pada Chrome atau Edge yang terkini."
            : "Saya belum dapat mengenal bacaan itu. Dengar contoh dan rakam semula dengan lebih jelas.",
        );
        onResult?.(false);
        return;
      }
      const score = transcriptScore(target, transcript);
      if (transcriptIsExact(target, transcript)) {
        setStatus("passed");
        setMessage("Hebat! Semua perkataan dibaca dengan tepat (100%).");
        onResult?.(true);
        onSuccess();
      } else {
        setStatus("retry");
        setMessage(`Saya dengar “${transcript}”. Ketepatan ${score}%, tetapi semua perkataan mesti betul. Cuba lagi.`);
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
        setMessage(result.feedback ?? "Hebat! Semua perkataan dibaca dengan tepat (100%).");
        onResult?.(true);
        onSuccess();
      } else {
        setStatus("retry");
        setMessage(result.feedback ?? "Belum tepat. Semua perkataan mesti dibaca dengan betul dan mengikut urutan.");
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
            <button className="mini-button" type="button" onClick={retry}>Cuba lagi</button>
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
