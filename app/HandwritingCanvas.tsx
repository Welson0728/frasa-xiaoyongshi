"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Point = { x: number; y: number };
type Stroke = Point[];

type Assessment = {
  passed: boolean;
  score?: number;
  feedback?: string;
};

type HandwritingCanvasProps = {
  target: string;
  onSuccess: () => void;
};

const ASSESS_API_BASE = process.env.NEXT_PUBLIC_ASSESS_API_BASE?.replace(/\/$/, "") ?? "";

function drawStroke(context: CanvasRenderingContext2D, stroke: Stroke) {
  if (stroke.length === 0) return;
  context.beginPath();
  context.moveTo(stroke[0].x, stroke[0].y);
  if (stroke.length === 1) {
    context.lineTo(stroke[0].x + 0.01, stroke[0].y + 0.01);
  } else {
    for (let index = 1; index < stroke.length - 1; index += 1) {
      const point = stroke[index];
      const next = stroke[index + 1];
      context.quadraticCurveTo(point.x, point.y, (point.x + next.x) / 2, (point.y + next.y) / 2);
    }
    const last = stroke[stroke.length - 1];
    context.lineTo(last.x, last.y);
  }
  context.stroke();
}

export default function HandwritingCanvas({ target, onSuccess }: HandwritingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const currentStroke = useRef<Stroke>([]);
  const drawing = useRef(false);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [status, setStatus] = useState<"idle" | "checking" | "self" | "passed" | "retry">("idle");
  const [message, setMessage] = useState("");

  const prepareContext = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = 6;
    context.strokeStyle = "#172554";
    return context;
  }, []);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const context = prepareContext();
    if (!canvas || !context) return;
    const ratio = window.devicePixelRatio || 1;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, canvas.width / ratio, canvas.height / ratio);
    strokes.forEach((stroke) => drawStroke(context, stroke));
  }, [prepareContext, strokes]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const ratio = window.devicePixelRatio || 1;
      const width = Math.max(280, Math.floor(canvas.getBoundingClientRect().width));
      const height = window.matchMedia("(max-width: 560px)").matches ? 230 : 270;
      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
      canvas.style.height = `${height}px`;
      redraw();
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [redraw]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  const pointFromEvent = (event: React.PointerEvent<HTMLCanvasElement>): Point => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const startDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drawing.current = true;
    currentStroke.current = [pointFromEvent(event)];
    setStatus("idle");
    setMessage("");
  };

  const continueDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    event.preventDefault();
    const context = prepareContext();
    if (!context) return;
    const points = event.nativeEvent.getCoalescedEvents?.() ?? [event.nativeEvent];
    for (const coalesced of points) {
      const rect = event.currentTarget.getBoundingClientRect();
      currentStroke.current.push({ x: coalesced.clientX - rect.left, y: coalesced.clientY - rect.top });
    }
    redraw();
    drawStroke(context, currentStroke.current);
  };

  const finishDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    event.preventDefault();
    drawing.current = false;
    const finished = currentStroke.current;
    currentStroke.current = [];
    if (finished.length > 0) setStrokes((existing) => [...existing, finished]);
  };

  const clear = () => {
    setStrokes([]);
    setStatus("idle");
    setMessage("");
  };

  const undo = () => {
    setStrokes((existing) => existing.slice(0, -1));
    setStatus("idle");
    setMessage("");
  };

  const checkWriting = async () => {
    const canvas = canvasRef.current;
    if (!canvas || strokes.length === 0) {
      setMessage("Tulis dahulu, kemudian tekan Semak.");
      return;
    }

    if (!ASSESS_API_BASE) {
      setStatus("self");
      setMessage("Bandingkan tulisan kamu dengan contoh.");
      return;
    }

    setStatus("checking");
    setMessage("Sedang menyemak tulisan…");
    try {
      const response = await fetch(`${ASSESS_API_BASE}/handwriting`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target, image: canvas.toDataURL("image/png") }),
      });
      if (!response.ok) throw new Error("assessment unavailable");
      const result = (await response.json()) as Assessment;
      if (result.passed) {
        setStatus("passed");
        setMessage(result.feedback ?? "Bagus! Tulisan kamu dapat dibaca.");
        onSuccess();
      } else {
        setStatus("retry");
        setMessage(result.feedback ?? "Cuba tulis sekali lagi dengan lebih jelas.");
      }
    } catch {
      setStatus("self");
      setMessage("Semakan automatik belum dapat digunakan. Bandingkan dengan contoh.");
    }
  };

  const confirmSelfCheck = () => {
    setStatus("passed");
    setMessage("Bagus kerana menyemak tulisan kamu!");
    onSuccess();
  };

  return (
    <div className="handwriting-tool">
      <div className="copy-model" aria-label={`Perkataan contoh: ${target}`}>
        <span>Contoh</span>
        <strong>{target}</strong>
      </div>

      <div className="ink-frame">
        <canvas
          ref={canvasRef}
          className="ink-canvas"
          aria-label="Ruang menulis dengan jari atau pen digital"
          onPointerDown={startDrawing}
          onPointerMove={continueDrawing}
          onPointerUp={finishDrawing}
          onPointerCancel={finishDrawing}
        />
        <div className="writing-lines" aria-hidden="true" />
        <span className="ink-hint" aria-hidden="true">Tulis di sini</span>
      </div>

      <div className="tool-actions">
        <button className="mini-button" type="button" onClick={undo} disabled={strokes.length === 0}>
          Undur
        </button>
        <button className="mini-button" type="button" onClick={clear} disabled={strokes.length === 0}>
          Padam
        </button>
        <button className="primary-action compact" type="button" onClick={checkWriting} disabled={status === "checking"}>
          {status === "checking" ? "Menyemak…" : "Semak tulisan"}
        </button>
      </div>

      {message && <p className={`tool-message ${status}`} role="status">{message}</p>}

      {status === "self" && (
        <div className="self-check-panel">
          <div className="self-model">{target}</div>
          <div className="self-check-actions">
            <button className="mini-button" type="button" onClick={clear}>Cuba lagi</button>
            <button className="primary-action compact" type="button" onClick={confirmSelfCheck}>Sudah semak</button>
          </div>
        </div>
      )}
    </div>
  );
}
