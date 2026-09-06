import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import type { Session } from "./api/client";

export const storage = {
  get: (key: string) =>
    Platform.OS === "web"
      ? AsyncStorage.getItem(key)
      : SecureStore.getItemAsync(key),
  set: (key: string, value: string) =>
    Platform.OS === "web"
      ? AsyncStorage.setItem(key, value)
      : SecureStore.setItemAsync(key, value),
  remove: (key: string) =>
    Platform.OS === "web"
      ? AsyncStorage.removeItem(key)
      : SecureStore.deleteItemAsync(key),
};

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
