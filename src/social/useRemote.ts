import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

/** Reads may refresh, but a read begun before a write must never replace its result. */
export function useRemote<T>(read: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const epoch = useRef(0);
  const writing = useRef(false);
  const fetching = useRef(false);
  const live = useRef(true);
  const refresh = useCallback(async () => {
    if (writing.current || fetching.current) return;
    fetching.current = true;
    const version = epoch.current;
    try {
      const next = await read();
      if (live.current && version === epoch.current) {
        setData(next);
        setError(null);
      }
    } catch (e) {
      if (live.current && version === epoch.current)
        setError(e instanceof Error ? e.message : "تعذّر التحديث.");
    } finally {
      fetching.current = false;
      if (live.current) setLoading(false);
    }
  }, [read]);
  useEffect(() => {
    live.current = true;
    void refresh();
    const tick = () => {
      if (AppState.currentState !== "background") void refresh();
    };
    const interval = setInterval(tick, 6000);
    const listener = AppState.addEventListener("change", (s) => {
      if (s === "active") tick();
    });
    return () => {
      live.current = false;
      epoch.current++;
      clearInterval(interval);
      listener.remove();
    };
  }, [refresh]);
  const mutate = async <R>(
    operation: () => Promise<R>,
    replace?: (result: R) => T,
  ): Promise<R> => {
    if (writing.current) throw new Error("نحفظ التغيير السابق، لحظة.");
    writing.current = true;
    epoch.current++;
    setBusy(true);
    setError(null);
    try {
      const result = await operation();
      if (live.current) {
        if (replace) setData(replace(result));
        else setData(await read());
      }
      return result;
    } catch (e) {
      if (live.current)
        setError(e instanceof Error ? e.message : "تعذّر الحفظ.");
      throw e;
    } finally {
      writing.current = false;
      if (live.current) setBusy(false);
    }
  };
  return { data, error, busy, loading, refresh, mutate };
}
