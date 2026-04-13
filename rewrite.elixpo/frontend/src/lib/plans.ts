/**
 * Plan limits — single source of truth shared between frontend and backend.
 *
 * These same values must be mirrored in the Python backend at:
 *   app/core/config.py -> PLAN_LIMITS
 */

export type PlanId = "guest" | "free" | "pro";

export interface PlanLimits {
  checksPerDay: number;
  rewritesPerDay: number;
  maxWords: number;
  fileUpload: boolean;
  pdfReport: boolean;
  history: boolean;
  apiAccess: boolean;
  priorityQueue: boolean;
}

export const PLANS: Record<PlanId, PlanLimits> = {
  guest: {
    checksPerDay: 1,
    rewritesPerDay: 0,
    maxWords: 100,
    fileUpload: false,
    pdfReport: false,
    history: false,
    apiAccess: false,
    priorityQueue: false,
  },
  free: {
    checksPerDay: 5,
    rewritesPerDay: 3,
    maxWords: 1_000,
    fileUpload: true,
    pdfReport: true,
    history: true,
    apiAccess: false,
    priorityQueue: false,
  },
  pro: {
    checksPerDay: -1, // unlimited
    rewritesPerDay: -1,
    maxWords: 25_000,
    fileUpload: true,
    pdfReport: true,
    history: true,
    apiAccess: true,
    priorityQueue: true,
  },
};

export function getPlan(loggedIn: boolean, isPro: boolean): PlanId {
  if (isPro) return "pro";
  if (loggedIn) return "free";
  return "guest";
}

export function getLimits(loggedIn: boolean, isPro: boolean): PlanLimits {
  return PLANS[getPlan(loggedIn, isPro)];
}
