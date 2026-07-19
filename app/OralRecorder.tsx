"use client";

import { useEffect, useRef, useState } from "react";

type OralRecorderProps = {
  target: string;
  modelAudio: string;
  onSuccess: () => void;
};

type SpeechAssessment = {
  passed: boolean;
  score?: number;
  accuracy?: number;
  fluency?: number;
  feedback?: string;
};

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const ASSESS_API_BASE = process.env.NEXT_PUBLIC_ASSESS_API_BASE?.replace(/\/$/, "") ?? "";

export default function OralRecorder({ target, modelAudio, onSuccess }: OralRecorderProps) {
  const modelRef = useRef<HTMLAudioElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const objectUrlRef = useRef<string>("");
  const analyserFrameRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [recordingUrl, setRecordingUrl] = useState("");
  const [status, setStatus] = useState<"idle" | "recording" | "review" | "checking" | "passed" | "retry">("idle");
  const [level, setLevel] = useState(0.08);
  const [message, setMessage] = useState("");
  const [modelPlaying, setModelPlaying] = useState(false);

  useEffect(() => {
    return () => {
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
      cancelAnimationFrame(analyserFrameRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
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

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setMessage("Peranti ini belum menyokong rakaman suara.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = "";
      }
      setRecordingUrl("");

      const preferred = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, preferred ? { mimeType: preferred } : undefined);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const url = URL.createObjectURL(blob);
        objectUrlRef.current = url;
        setRecordingUrl(url);
        setStatus("review");
        setMessage("Rakaman siap. Dengar semula sebelum menyemak.");
        setLevel(0.08);
        cancelAnimationFrame(analyserFrameRef.current);
        stream.getTracks().forEach((track) => track.stop());
        void audioContextRef.current?.close();
        audioContextRef.current = null;
      };
      recorder.start();
      watchLevel(stream);
      setStatus("recording");
      setMessage("Baca dengan suara yang jelas.");
      stopTimerRef.current = setTimeout(() => stopRecording(), 12000);
    } catch {
      setMessage("Benarkan mikrofon untuk merakam bacaan.");
    }
  };

  const stopRecording = () => {
    if (stopTimerRef.current) {
      clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  };

  const retry = () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = "";
    setRecordingUrl("");
    setStatus("idle");
    setMessage("");
  };

  const assess = async () => {
    if (!recordingUrl || chunksRef.current.length === 0) return;
    if (!ASSESS_API_BASE) {
      setStatus("review");
      setMessage("Dengar rakaman dan bandingkan dengan contoh.");
      return;
    }

    setStatus("checking");
    setMessage("Sedang menyemak bacaan…");
    try {
      const blob = new Blob(chunksRef.current, { type: recorderRef.current?.mimeType || "audio/webm" });
      const form = new FormData();
      form.append("audio", blob, "bacaan.webm");
      form.append("target", target);
      form.append("locale", "ms-MY");
      const response = await fetch(`${ASSESS_API_BASE}/speech`, { method: "POST", body: form });
      if (!response.ok) throw new Error("assessment unavailable");
      const result = (await response.json()) as SpeechAssessment;
      if (result.passed) {
        setStatus("passed");
        setMessage(result.feedback ?? "Bagus! Bacaan kamu jelas.");
        onSuccess();
      } else {
        setStatus("retry");
        setMessage(result.feedback ?? "Dengar contoh dan cuba baca sekali lagi.");
      }
    } catch {
      setStatus("review");
      setMessage("Semakan automatik belum dapat digunakan. Dengar dan bandingkan sendiri.");
    }
  };

  const confirmSelfCheck = () => {
    setStatus("passed");
    setMessage("Syabas kerana mendengar dan menyemak bacaan kamu!");
    onSuccess();
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
          <audio className="recording-player" src={recordingUrl} controls preload="metadata" />
          <div className="self-check-actions">
            <button className="mini-button" type="button" onClick={retry}>Cuba lagi</button>
            <button className="primary-action compact" type="button" onClick={assess} disabled={status === "checking" || status === "passed"}>
              {status === "checking" ? "Menyemak…" : ASSESS_API_BASE ? "Semak bacaan" : "Bandingkan"}
            </button>
          </div>
          {!ASSESS_API_BASE && status === "review" && (
            <button className="text-button" type="button" onClick={confirmSelfCheck}>Saya sudah dengar dan semak</button>
          )}
        </div>
      )}

      {message && <p className={`tool-message ${status}`} role="status">{message}</p>}
    </div>
  );
}
