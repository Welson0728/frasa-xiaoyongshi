"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Point = { x: number; y: number };
type Stroke = Point[];

type Assessment = {
  passed: boolean;
  score?: number;
  feedback?: string;
};

type TracingFailure = "outside" | "incomplete" | "painted" | "shape" | null;

type HandwritingCanvasProps = {
  target: string;
  onSuccess: () => void;
  onResult?: (passed: boolean) => void;
  onReset?: () => void;
};

const ASSESS_API_BASE = process.env.NEXT_PUBLIC_ASSESS_API_BASE?.replace(/\/$/, "") ?? "";
const TARGET_FONT_FAMILY = '"Andika", sans-serif';

function studentFeedback(feedback: string | undefined, fallback: string) {
  return feedback && !feedback.includes("%") ? feedback : fallback;
}

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

function strokeMotionStats(strokes: Stroke[], widestCharacterWidth: number) {
  const visitedCells = new Set<string>();
  let cellVisits = 0;
  let crossCharacterStrokes = 0;
  let longStraightStrokes = 0;
  let longStrokes = 0;
  let turnbacks = 0;

  strokes.forEach((stroke) => {
    if (stroke.length < 2) return;
    let length = 0;
    let minX = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    const directions: number[] = [];
    let directionAnchor = stroke[0];
    let previousCell = "";

    for (let index = 0; index < stroke.length; index += 1) {
      const point = stroke[index];
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      if (index > 0) {
        const previous = stroke[index - 1];
        const segmentLength = Math.hypot(point.x - previous.x, point.y - previous.y);
        length += segmentLength;
        const sampleCount = Math.max(1, Math.ceil(segmentLength / 3));
        for (let sample = 1; sample <= sampleCount; sample += 1) {
          const ratio = sample / sampleCount;
          const x = previous.x + (point.x - previous.x) * ratio;
          const y = previous.y + (point.y - previous.y) * ratio;
          const cell = `${Math.floor(x / 6)}:${Math.floor(y / 6)}`;
          if (cell !== previousCell) {
            previousCell = cell;
            cellVisits += 1;
            visitedCells.add(cell);
          }
        }
      }
      const directionDistance = Math.hypot(point.x - directionAnchor.x, point.y - directionAnchor.y);
      if (directionDistance >= 7) {
        directions.push(Math.atan2(point.y - directionAnchor.y, point.x - directionAnchor.x));
        directionAnchor = point;
      }
    }

    for (let index = 1; index < directions.length; index += 1) {
      const difference = Math.abs(Math.atan2(
        Math.sin(directions[index] - directions[index - 1]),
        Math.cos(directions[index] - directions[index - 1]),
      ));
      if (difference > 2.35) turnbacks += 1;
    }

    if (length >= 18) {
      longStrokes += 1;
      const first = stroke[0];
      const last = stroke[stroke.length - 1];
      const directness = Math.hypot(last.x - first.x, last.y - first.y) / length;
      if (directness > 0.9) longStraightStrokes += 1;
    }
    if (maxX - minX > widestCharacterWidth * 1.65 && length > widestCharacterWidth * 1.8) {
      crossCharacterStrokes += 1;
    }
  });

  const pathLength = strokePathLength(strokes);
  return {
    crossCharacterStrokes,
    pathLength,
    revisitRatio: cellVisits > 0 ? 1 - visitedCells.size / cellVisits : 1,
    straightStrokeRatio: longStrokes > 0 ? longStraightStrokes / longStrokes : 0,
    strokeCount: strokes.filter((stroke) => strokePathLength([stroke]) >= 3).length,
    turnbacks,
  };
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
  const characterWidths: number[] = [];
  for (let characterIndex = 0; characterIndex < target.length; characterIndex += 1) {
    if (/\s/u.test(target[characterIndex])) continue;
    const left = Math.max(0, Math.floor(textStartX + measurementContext.measureText(target.slice(0, characterIndex)).width));
    const right = Math.min(width - 1, Math.ceil(textStartX + measurementContext.measureText(target.slice(0, characterIndex + 1)).width));
    characterWidths.push(right - left);
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
  const characterCount = Math.max(1, characterCoverages.length);
  const widestCharacterWidth = Math.max(fontSize * 0.32, ...characterWidths);
  const motion = strokeMotionStats(strokes, widestCharacterWidth);
  const pathInkRatio = targetTotal > 0 ? (motion.pathLength * 7) / targetTotal : Number.POSITIVE_INFINITY;
  const overdrawRatio = inkTotal > 0 ? (motion.pathLength * 7) / inkTotal : Number.POSITIVE_INFINITY;
  const looksPainted = motion.strokeCount > characterCount * 3 + 2
    || motion.revisitRatio > 0.42
    || motion.turnbacks > characterCount * 2 + 4
    || overdrawRatio > 1.75
    || motion.crossCharacterStrokes > Math.max(1, Math.floor(characterCount / 5))
    || (motion.strokeCount > characterCount * 1.5 && motion.straightStrokeRatio > 0.72);
  const score = Math.round((precision * 0.5 + coverage * 0.35 + weakestCharacterCoverage * 0.15) * 100);
  const hasExtraInk = precision < 0.82
    || outsideBoundsRatio > 0.035
    || inkRatio > 1.2
    || pathInkRatio > 1.65;
  const isIncomplete = inkTotal < Math.max(70, targetTotal * 0.18)
    || coverage < 0.52
    || weakestCharacterCoverage < 0.4;
  const passed = !looksPainted && !hasExtraInk && !isIncomplete && score >= 67;
  let failure: TracingFailure = null;
  if (!passed) {
    failure = looksPainted ? "painted" : hasExtraInk ? "outside" : isIncomplete ? "incomplete" : "shape";
  }

  if (process.env.NODE_ENV !== "production") {
    console.info("handwriting-check", {
      characterCount,
      coverage: Number(coverage.toFixed(3)),
      failure,
      inkRatio: Number(inkRatio.toFixed(3)),
      overdrawRatio: Number(overdrawRatio.toFixed(3)),
      pathInkRatio: Number(pathInkRatio.toFixed(3)),
      precision: Number(precision.toFixed(3)),
      ...motion,
    });
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
    if (status === "passed") return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drawing.current = true;
    currentStroke.current = [pointFromEvent(event)];
    setStatus("idle");
    setMessage("");
  };

  const continueDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || status === "passed") return;
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
    if (status === "passed") return;
    setStrokes([]);
    setStatus("idle");
    setMessage("");
    onReset?.();
  };

  const undo = () => {
    if (status === "passed") return;
    setStrokes((existing) => existing.slice(0, -1));
    setStatus("idle");
    setMessage("");
    onReset?.();
  };

  const checkWriting = async () => {
    if (status === "passed") return;
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
        : localResult.failure === "painted"
          ? "Jangan warnakan atau gosok bayang. Tulis setiap huruf mengikut gerakan pensel."
        : localResult.failure === "incomplete"
          ? "Belum lengkap. Ikut bayang bagi setiap huruf, kemudian cuba lagi."
          : "Bentuk tulisan belum sepadan. Cuba ikut bayang huruf dengan lebih tepat.");
      onResult?.(false);
      return;
    }

    if (!ASSESS_API_BASE) {
      setStatus("passed");
      setMessage("Bagus! Bentuk tulisan sepadan.");
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
        setMessage(studentFeedback(result.feedback, "Bagus! Tulisan kamu dapat dibaca."));
        onResult?.(true);
        onSuccess();
      } else {
        setStatus("retry");
        setMessage(studentFeedback(result.feedback, "Cuba tulis sekali lagi dengan lebih jelas."));
        onResult?.(false);
      }
    } catch {
      setStatus("passed");
      setMessage("Bagus! Bentuk tulisan sepadan.");
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
          className={`ink-canvas ${status === "passed" ? "locked" : ""}`}
          aria-label="Ruang menulis dengan jari atau pen digital"
          aria-disabled={status === "passed"}
          onPointerDown={startDrawing}
          onPointerMove={continueDrawing}
          onPointerUp={finishDrawing}
          onPointerCancel={finishDrawing}
          onContextMenu={(event) => event.preventDefault()}
          onDragStart={(event) => event.preventDefault()}
        />
        <div className="ink-scroll-zone zone-top" aria-hidden="true" />
        <div className="ink-scroll-zone zone-bottom" aria-hidden="true" />
        <div className="writing-lines" aria-hidden="true" />
        <span className="ink-hint" style={{ fontSize: `${guideFontSize}px` }} aria-hidden="true">{target}</span>
      </div>

      <div className="tool-actions">
        <button className="mini-button" type="button" onClick={undo} disabled={strokes.length === 0 || status === "passed"}>
          Undur
        </button>
        <button className="mini-button" type="button" onClick={clear} disabled={strokes.length === 0 || status === "passed"}>
          Padam
        </button>
        <button className="primary-action compact" type="button" onClick={checkWriting} disabled={status === "checking" || status === "passed"}>
          {status === "checking" ? "Menyemak…" : "Semak tulisan"}
        </button>
      </div>

      {message && <p className={`tool-message ${status}`} role="status">{message}</p>}
    </div>
  );
}
