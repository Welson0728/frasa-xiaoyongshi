"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Point = { x: number; y: number };
type Stroke = Point[];

type Assessment = {
  passed: boolean;
  score?: number;
  feedback?: string;
};

type TracingFailure = "outside" | "incomplete" | "shape" | null;

type HandwritingCanvasProps = {
  target: string;
  onSuccess: () => void;
  onResult?: (passed: boolean) => void;
  onReset?: () => void;
};

const ASSESS_API_BASE = process.env.NEXT_PUBLIC_ASSESS_API_BASE?.replace(/\/$/, "") ?? "";
const TARGET_FONT_FAMILY = '"Andika", sans-serif';

function targetFont(fontSize: number) {
  return `700 ${fontSize}px ${TARGET_FONT_FAMILY}`;
}

function fittedTargetFontSize(context: CanvasRenderingContext2D, target: string, width: number) {
  const maximumSize = 104;
  context.font = targetFont(maximumSize);
  const measuredWidth = Math.max(1, context.measureText(target).width);
  return Math.max(34, Math.min(maximumSize, (maximumSize * Math.max(220, width - 20)) / measuredWidth));
}

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
  expansionWidth = 0,
) {
  context.font = targetFont(fontSize);
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = "#000";
  if (expansionWidth > 0) {
    context.lineJoin = "round";
    context.lineWidth = expansionWidth;
    context.strokeStyle = "#000";
    context.strokeText(target, width / 2, height / 2 + 2);
  }
  context.fillText(target, width / 2, height / 2 + 2);
}

function strokePathLength(strokes: Stroke[]) {
  return strokes.reduce((total, stroke) => {
    let strokeLength = 0;
    for (let index = 1; index < stroke.length; index += 1) {
      strokeLength += Math.hypot(
        stroke[index].x - stroke[index - 1].x,
        stroke[index].y - stroke[index - 1].y,
      );
    }
    return total + strokeLength;
  }, 0);
}

function tracingScore(target: string, strokes: Stroke[], width: number, height: number, fontSize: number) {
  const makeCanvas = () => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return canvas;
  };
  const targetCore = makeCanvas();
  const targetTolerance = makeCanvas();
  const inkCore = makeCanvas();
  const inkCoverage = makeCanvas();
  const toleranceWidth = Math.max(11, fontSize * 0.22);
  const coverageWidth = Math.max(13, fontSize * 0.24);
  drawTargetMask(targetCore.getContext("2d")!, target, width, height, fontSize);
  drawTargetMask(targetTolerance.getContext("2d")!, target, width, height, fontSize, toleranceWidth);
  drawInkMask(inkCore.getContext("2d")!, strokes, 7);
  drawInkMask(inkCoverage.getContext("2d")!, strokes, coverageWidth);

  const coreTargetPixels = targetCore.getContext("2d")!.getImageData(0, 0, width, height).data;
  const toleranceTargetPixels = targetTolerance.getContext("2d")!.getImageData(0, 0, width, height).data;
  const coreInkPixels = inkCore.getContext("2d")!.getImageData(0, 0, width, height).data;
  const coverageInkPixels = inkCoverage.getContext("2d")!.getImageData(0, 0, width, height).data;
  let inkTotal = 0;
  let inkInside = 0;
  let targetTotal = 0;
  let targetCovered = 0;
  let targetMinX = width;
  let targetMaxX = 0;
  let targetMinY = height;
  let targetMaxY = 0;

  for (let offset = 3; offset < coreInkPixels.length; offset += 4) {
    const pixelIndex = (offset - 3) / 4;
    const x = pixelIndex % width;
    const y = Math.floor(pixelIndex / width);
    const ink = coreInkPixels[offset] > 40;
    const targetPixel = coreTargetPixels[offset] > 40;
    if (ink) {
      inkTotal += 1;
      if (toleranceTargetPixels[offset] > 40) inkInside += 1;
    }
    if (targetPixel) {
      targetTotal += 1;
      if (coverageInkPixels[offset] > 40) targetCovered += 1;
      targetMinX = Math.min(targetMinX, x);
      targetMaxX = Math.max(targetMaxX, x);
      targetMinY = Math.min(targetMinY, y);
      targetMaxY = Math.max(targetMaxY, y);
    }
  }

  const precision = inkTotal > 0 ? inkInside / inkTotal : 0;
  const coverage = targetTotal > 0 ? targetCovered / targetTotal : 0;
  const inkRatio = targetTotal > 0 ? inkTotal / targetTotal : Number.POSITIVE_INFINITY;
  const pathInkRatio = targetTotal > 0 ? (strokePathLength(strokes) * 7) / targetTotal : Number.POSITIVE_INFINITY;

  const boundsPadding = Math.max(8, fontSize * 0.14);
  let inkOutsideBounds = 0;
  for (let offset = 3; offset < coreInkPixels.length; offset += 4) {
    if (coreInkPixels[offset] <= 40) continue;
    const pixelIndex = (offset - 3) / 4;
    const x = pixelIndex % width;
    const y = Math.floor(pixelIndex / width);
    if (
      x < targetMinX - boundsPadding
      || x > targetMaxX + boundsPadding
      || y < targetMinY - boundsPadding
      || y > targetMaxY + boundsPadding
    ) {
      inkOutsideBounds += 1;
    }
  }
  const outsideBoundsRatio = inkTotal > 0 ? inkOutsideBounds / inkTotal : 1;

  const measurementContext = targetCore.getContext("2d")!;
  measurementContext.font = targetFont(fontSize);
  const textStartX = width / 2 - measurementContext.measureText(target).width / 2;
  const characterCoverages: number[] = [];
  for (let characterIndex = 0; characterIndex < target.length; characterIndex += 1) {
    if (/\s/u.test(target[characterIndex])) continue;
    const left = Math.max(0, Math.floor(textStartX + measurementContext.measureText(target.slice(0, characterIndex)).width));
    const right = Math.min(width - 1, Math.ceil(textStartX + measurementContext.measureText(target.slice(0, characterIndex + 1)).width));
    let characterTotal = 0;
    let characterCovered = 0;
    for (let y = 0; y < height; y += 1) {
      for (let x = left; x <= right; x += 1) {
        const offset = (y * width + x) * 4 + 3;
        if (coreTargetPixels[offset] <= 40) continue;
        characterTotal += 1;
        if (coverageInkPixels[offset] > 40) characterCovered += 1;
      }
    }
    if (characterTotal > 0) characterCoverages.push(characterCovered / characterTotal);
  }
  const weakestCharacterCoverage = characterCoverages.length > 0
    ? Math.min(...characterCoverages)
    : 0;
  const score = Math.round((precision * 0.5 + coverage * 0.35 + weakestCharacterCoverage * 0.15) * 100);
  const hasExtraInk = precision < 0.82
    || outsideBoundsRatio > 0.035
    || inkRatio > 1.2
    || pathInkRatio > 1.65;
  const isIncomplete = inkTotal < Math.max(70, targetTotal * 0.18)
    || coverage < 0.52
    || weakestCharacterCoverage < 0.4;
  const passed = !hasExtraInk && !isIncomplete && score >= 67;
  let failure: TracingFailure = null;
  if (!passed) {
    failure = hasExtraInk ? "outside" : isIncomplete ? "incomplete" : "shape";
  }

  return {
    passed,
    score,
    failure,
  };
}

export default function HandwritingCanvas({ target, onSuccess, onResult, onReset }: HandwritingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const currentStroke = useRef<Stroke>([]);
  const drawing = useRef(false);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [status, setStatus] = useState<"idle" | "checking" | "passed" | "retry">("idle");
  const [message, setMessage] = useState("");
  const [guideFontSize, setGuideFontSize] = useState(48);

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
    let active = true;

    const resize = () => {
      const ratio = window.devicePixelRatio || 1;
      const width = Math.max(280, Math.floor(canvas.getBoundingClientRect().width));
      const height = window.matchMedia("(max-width: 560px)").matches ? 300 : 290;
      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
      canvas.style.height = `${height}px`;
      const context = canvas.getContext("2d");
      if (context) setGuideFontSize(fittedTargetFontSize(context, target, width));
      redraw();
    };

    resize();
    void document.fonts?.load(`700 104px ${TARGET_FONT_FAMILY}`, target).then(() => {
      if (active) resize();
    });
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    return () => {
      active = false;
      observer.disconnect();
    };
  }, [redraw, target]);

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
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
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
      setMessage(localResult.failure === "outside"
        ? "Ada tulisan tambahan atau garisan di luar bayang. Padam dan tulis perkataan itu sahaja."
        : localResult.failure === "incomplete"
          ? "Belum lengkap. Ikut bayang bagi setiap huruf, kemudian cuba lagi."
          : "Bentuk tulisan belum sepadan. Cuba ikut bayang huruf dengan lebih tepat.");
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
          onContextMenu={(event) => event.preventDefault()}
          onDragStart={(event) => event.preventDefault()}
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
