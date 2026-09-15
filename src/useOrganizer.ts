import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import {
  api,
  ApiError,
  type Group,
  type Preferences,
  type Session,
  type Settings,
} from "./api/client";
import { readSession, storage } from "./storage";

export function useOrganizer() {
  const [session, setSession] = useState<Session | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const writing = useRef(false);
  const epoch = useRef(0);
  const restore = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const saved = await readSession();
      if (saved) {
        setSession(saved);
        setGroup(await api.group(saved));
      } else {
        setSession(null);
        setGroup(null);
      }
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        await storage.remove("hatim.organizer.v1");
        setSession(null);
        setGroup(null);
      } else setError(e instanceof Error ? e.message : "تعذّر تحميل المجموعة.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void restore();
  }, [restore]);
  useEffect(() => {
    if (!session) return;
    let alive = true;
    let fetching = false;
    const refresh = async () => {
      if (writing.current || fetching || AppState.currentState === "background")
        return;
      fetching = true;
      const version = epoch.current;
      try {
        const next = await api.group(session);
        if (alive && !writing.current && version === epoch.current) {
          setGroup(next);
          setError(null);
        }
      } catch (e) {
        if (alive)
          setError(e instanceof Error ? e.message : "تعذّر تحديث المجموعة.");
      } finally {
        fetching = false;
      }
    };
    const interval = setInterval(refresh, 6000);
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") void refresh();
    });
    return () => {
      alive = false;
      clearInterval(interval);
      listener.remove();
    };
  }, [session]);
  const run = async (operation: () => Promise<void>) => {
    if (writing.current) return;
    writing.current = true;
    epoch.current++;
    setBusy(true);
    setError(null);
    try {
      await operation();
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذّر حفظ التغيير.");
      throw e;
    } finally {
      writing.current = false;
      setBusy(false);
    }
  };
  return {
    group,
    loading,
    busy,
    error,
    restore,
    create: (preferences: Preferences, settings?: Settings) =>
      run(async () => {
        const result = await api.create(preferences, settings);
        const next = {
          groupId: result.group.id,
          token: result.organizer_token,
        };
        await storage.set("hatim.organizer.v1", JSON.stringify(next));
        setSession(next);
        setGroup(result.group);
      }),
    settings: (settings: Settings) =>
      run(async () => {
        if (session) setGroup(await api.settings(session, settings));
      }),
    profile: (preferences: Preferences) =>
      run(async () => {
        if (session) setGroup(await api.profile(session, preferences));
      }),
    remove: (id: string) =>
      run(async () => {
        if (session) setGroup(await api.remove(session, id));
      }),
  };
}
