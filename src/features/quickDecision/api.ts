import { request } from "../../shared/api/http";
import type { components } from "../../shared/api/schema";
export type QuickRequest = components["schemas"]["QuickRequest"];
export type QuickResult = components["schemas"]["QuickResult"];
export const quickDecision = (body: QuickRequest, signal: AbortSignal) =>
  request<QuickResult>("/quick-decisions", { method: "POST", body, signal });
