import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { plansApi, type Session } from "./api";
import { ApiError } from "../../shared/api/http";
import {
  type Group,
  type Preferences,
  type Settings,
} from "../../shared/contracts";
import { readSession } from "./storage";
import { storage } from "../../shared/storage";
import { planKey } from "./storage";
import { useAccount } from "../accounts";

export function useOrganizer() {
  const account = useAccount();
  const token = account.session?.token;
  const accountId = account.session?.account.id;
  const [session, setSession] = useState<Session | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const writing = useRef(false);
  const epoch = useRef(0);
  const selectedKey = useRef("hatim.organizer.v1");
  const restore = useCallback(async () => {
    if (account.loading) return;
    setLoading(true);
    setError(null);
    try {
      if (account.error) throw new Error(account.error);
      const choice = accountId ? await storage.get(planKey(accountId)) : null;
      const saved =
        choice && token
          ? choice === "new"
            ? null
            : { groupId: choice, token }
          : await readSession();
      selectedKey.current =
        choice && accountId ? planKey(accountId) : "hatim.organizer.v1";
      if (saved) {
        setSession(saved);
        setGroup(await plansApi.group(saved));
      } else {
        setSession(null);
        setGroup(null);
      }
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        await storage.remove(selectedKey.current);
        setSession(null);
        setGroup(null);
      } else setError(e instanceof Error ? e.message : "تعذّر تحميل المجموعة.");
    } finally {
      setLoading(false);
    }
  }, [token, accountId, account.loading, account.error]);
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
        const next = await plansApi.group(session);
        if (alive && !writing.current && version === epoch.current) {
          setGroup(next);
          setError(null);
        }
      } catch (e) {
        if (alive && version === epoch.current) {
          setError(e instanceof Error ? e.message : "تعذّر تحديث المجموعة.");
          if (e instanceof ApiError && [401, 404].includes(e.status)) {
            setGroup(null);
            setSession(null);
          }
        }
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
    restore: account.error ? account.restore : restore,
    create: (preferences: Preferences, settings?: Settings) =>
      run(async () => {
        const result = await plansApi.create(preferences, settings, token);
        const ownerToken = token ?? result.organizer_token;
        if (!ownerToken) throw new Error("تعذّر حفظ صلاحية الخطة.");
        const next = {
          groupId: result.group.id,
          token: ownerToken,
        };
        selectedKey.current = accountId
          ? planKey(accountId)
          : "hatim.organizer.v1";
        await storage.set(
          selectedKey.current,
          accountId ? next.groupId : JSON.stringify(next),
        );
        setSession(next);
        setGroup(result.group);
      }),
    rename: (title: string) =>
      run(async () => {
        if (session) setGroup(await plansApi.rename(session, title));
      }),
    deletePlan: () =>
      run(async () => {
        if (!session) return;
        await plansApi.deletePlan(session);
        if (group?.owner_account_id)
          await storage.set(selectedKey.current, "new");
        else await storage.remove(selectedKey.current);
        setSession(null);
        setGroup(null);
      }),
    settings: (settings: Settings) =>
      run(async () => {
        if (session && group)
          setGroup(await plansApi.settings(session, settings, group.settings));
      }),
    profile: (preferences: Preferences) =>
      run(async () => {
        if (session) setGroup(await plansApi.profile(session, preferences));
      }),
    remove: (id: string) =>
      run(async () => {
        if (session) setGroup(await plansApi.remove(session, id));
      }),
  };
}
