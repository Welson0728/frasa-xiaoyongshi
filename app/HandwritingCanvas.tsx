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
  onResult?: (passed: boolean) => void;
  onReset?: () => void;
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

function drawInkMask(context: CanvasRenderingContext2D, strokes: Stroke[], lineWidth: number) {
  context.lineCap = "round";
  context.lineJoin = "round";
  context.lineWidth = lineWidth;
  context.strokeStyle = "#000";
  strokes.forEach((stroke) => drawStroke(context, stroke));
}

function drawTargetMask(
  context: CanvasRenderingContext2D,
  target: string,
  width: number,
  height: number,
  fontSize: number,
  expanded: boolean,
) {
  context.font = `950 ${fontSize}px "Trebuchet MS", "Arial Rounded MT Bold", sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = "#000";
  if (expanded) {
    context.lineJoin = "round";
    context.lineWidth = Math.max(20, fontSize * 0.38);
    context.strokeStyle = "#000";
    context.strokeText(target, width / 2, height / 2 + 2);
  }
  context.fillText(target, width / 2, height / 2 + 2);
}

function tracingScore(target: string, strokes: Stroke[], width: number, height: number, fontSize: number) {
  const makeCanvas = () => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return canvas;
  };
  const targetCore = makeCanvas();
  const targetZone = makeCanvas();
  const inkCore = makeCanvas();
  const inkZone = makeCanvas();
  drawTargetMask(targetCore.getContext("2d")!, target, width, height, fontSize, false);
  drawTargetMask(targetZone.getContext("2d")!, target, width, height, fontSize, true);
  drawInkMask(inkCore.getContext("2d")!, strokes, 7);
  drawInkMask(inkZone.getContext("2d")!, strokes, Math.max(20, fontSize * 0.3));

  const coreTargetPixels = targetCore.getContext("2d")!.getImageData(0, 0, width, height).data;
  const zoneTargetPixels = targetZone.getContext("2d")!.getImageData(0, 0, width, height).data;
  const coreInkPixels = inkCore.getContext("2d")!.getImageData(0, 0, width, height).data;
  const zoneInkPixels = inkZone.getContext("2d")!.getImageData(0, 0, width, height).data;
  let inkTotal = 0;
  let inkInside = 0;
  let targetTotal = 0;
  let targetCovered = 0;

  for (let offset = 3; offset < coreInkPixels.length; offset += 4) {
    const ink = coreInkPixels[offset] > 40;
    const targetPixel = coreTargetPixels[offset] > 40;
    if (ink) {
      inkTotal += 1;
      if (zoneTargetPixels[offset] > 40) inkInside += 1;
    }
    if (targetPixel) {
      targetTotal += 1;
      if (zoneInkPixels[offset] > 40) targetCovered += 1;
    }
  }

  const precision = inkTotal > 0 ? inkInside / inkTotal : 0;
  const coverage = targetTotal > 0 ? targetCovered / targetTotal : 0;
  const score = Math.round((precision * 0.48 + coverage * 0.52) * 100);
  return {
    passed: inkTotal >= Math.max(70, targetTotal * 0.055)
      && precision >= 0.52
      && coverage >= 0.42
      && score >= 54,
    score,
    precision,
    coverage,
  };
}

export default function HandwritingCanvas({ target, onSuccess, onResult, onReset }: HandwritingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const currentStroke = useRef<Stroke>([]);
  const drawing = useRef(false);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [status, setStatus] = useState<"idle" | "checking" | "passed" | "retry">("idle");
  const [message, setMessage] = useState("");
  const guideFontSize = Math.max(30, Math.min(78, 260 / Math.max(3, target.length * 0.56)));

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
    onReset?.();
  };

  const undo = () => {
    setStrokes((existing) => existing.slice(0, -1));
    setStatus("idle");
    setMessage("");
    onReset?.();
  };

  const checkWriting = async () => {
    const canvas = canvasRef.current;
    if (!canvas || strokes.length === 0) {
      setMessage("Tulis dahulu, kemudian tekan Semak.");
      return;
    }

    const width = Math.max(1, Math.round(canvas.getBoundingClientRect().width));
    const height = Math.max(1, Math.round(canvas.getBoundingClientRect().height));
    const localResult = tracingScore(target, strokes, width, height, guideFontSize);
    if (!localResult.passed) {
      setStatus("retry");
      setMessage("Belum tepat. Cuba ikut bayang setiap huruf dengan lebih lengkap.");
      onResult?.(false);
      return;
    }

    if (!ASSESS_API_BASE) {
      setStatus("passed");
      setMessage(`Bagus! Bentuk tulisan sepadan (${localResult.score}%).`);
      onResult?.(true);
      onSuccess();
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
        onResult?.(true);
        onSuccess();
      } else {
        setStatus("retry");
        setMessage(result.feedback ?? "Cuba tulis sekali lagi dengan lebih jelas.");
        onResult?.(false);
      }
    } catch {
      setStatus("passed");
      setMessage(`Bagus! Bentuk tulisan sepadan (${localResult.score}%).`);
      onResult?.(true);
      onSuccess();
    }
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
        <span className="ink-hint" style={{ fontSize: `${guideFontSize}px` }} aria-hidden="true">{target}</span>
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
    </div>
  );
}
