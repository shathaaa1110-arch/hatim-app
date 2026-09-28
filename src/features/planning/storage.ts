import { storage } from "../../shared/storage";
import type { Session } from "./api";

export const planKey = (accountId: string) => `hatim.plan.${accountId}`;

export async function readSession(): Promise<Session | null> {
  const raw = await storage.get("hatim.organizer.v1");
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed &&
      "groupId" in parsed &&
      "token" in parsed &&
      typeof parsed.groupId === "string" &&
      typeof parsed.token === "string"
    )
      return parsed as Session;
  } catch {
    /* A malformed local session can be safely replaced. */
  }
  return null;
}
