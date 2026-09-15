import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { ApiError } from "../api/client";
import { storage } from "../storage";
import { social, type AccountSession } from "../social/client";

const sessionKey = "hatim.account.v1";
export const planKey = (accountId: string) => `hatim.plan.${accountId}`;

function useAccountState() {
  const [session, setSession] = useState<AccountSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const restore = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await storage.get(sessionKey);
      setSession(token ? { token, account: await social.me(token) } : null);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        await storage.remove(sessionKey);
        setSession(null);
      } else setError(e instanceof Error ? e.message : "تعذّرت استعادة حسابك.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void restore();
  }, [restore]);
  const signIn = async (next: AccountSession) => {
    await storage.set(sessionKey, next.token);
    setSession(next);
    setError(null);
  };
  const signOut = async () => {
    if (session) await social.logout(session.token);
    await storage.remove(sessionKey);
    setSession(null);
  };
  const updateName = async (name: string) => {
    if (!session) return;
    const account = await social.updateMe(session.token, name);
    setSession({ ...session, account });
  };
  return { session, loading, error, restore, signIn, signOut, updateName };
}

const AccountContext = createContext<ReturnType<typeof useAccountState> | null>(
  null,
);
export function AccountProvider({ children }: { children: ReactNode }) {
  const value = useAccountState();
  return (
    <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
  );
}
export function useAccount() {
  const value = useContext(AccountContext);
  if (!value) throw new Error("AccountProvider is missing");
  return value;
}
