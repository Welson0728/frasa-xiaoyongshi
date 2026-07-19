import type { GameMode } from "./questions";

export type ChallengeBreakdown = Record<GameMode, { attempted: number; correct: number }>;

export type ChallengeReport = {
  version: 1;
  sessionId: string;
  completedAt: string;
  questionCount: number;
  score: number;
  percentage: number;
  breakdown: ChallengeBreakdown;
};

export const REPORT_ENDPOINT = process.env.NEXT_PUBLIC_REPORT_ENDPOINT?.replace(/\/$/, "") ?? "";
export const REPORT_DASHBOARD_URL = process.env.NEXT_PUBLIC_REPORT_DASHBOARD_URL ?? "";

export async function submitChallengeReport(report: ChallengeReport): Promise<void> {
  if (!REPORT_ENDPOINT) throw new Error("reporting-not-configured");
  const response = await fetch(REPORT_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(report),
  });
  if (!response.ok) throw new Error("reporting-failed");
}
