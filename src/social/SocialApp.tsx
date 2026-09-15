import { useCallback, useEffect, useState } from "react";
import { ApiError, emptyPreferences, type Session } from "../api/client";
import { PreferencesForm } from "../components/PreferencesForm";
import { InviteScreen } from "../screens/InviteScreen";
import { readSession, storage } from "../storage";
import { social, type AccountSession } from "./client";
import { AuthScreen } from "./AuthScreen";
import { GroupsScreen } from "./GroupsScreen";
import { CircleScreen } from "./CircleScreen";
import { OutingScreen } from "./OutingScreen";
import { ErrorNotice, Loading, Page, Panel } from "./ui";
import { useRemote } from "./useRemote";

const sessionKey = "hatim.account.v1";

function Join({
  code,
  session,
  open,
}: {
  code: string;
  session: AccountSession;
  open: (id: string) => void;
}) {
  const read = useCallback(async () => {
    const invite = await social.invite(code);
    try {
      const group = await social.group(session.token, invite.id);
      return { invite, group };
    } catch (e) {
      if (e instanceof ApiError && e.status === 404)
        return { invite, group: null };
      throw e;
    }
  }, [code, session.token]);
  const r = useRemote(read);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (r.data?.group) open(r.data.group.id);
  }, [r.data?.group?.id, open]);
  return (
    <Page
      title={r.data ? `لك مكان في «${r.data.invite.title}»` : "دعوتك للّمّة"}
      subtitle="ذوقك يُحفظ للقروب. تؤكد حضورك لكل طلعة بنفسك."
    >
      <ErrorNotice
        error={r.error}
        retry={() => {
          void r.refresh();
        }}
      />
      {r.loading && <Loading />}
      {r.data && !r.data.group && (
        <Panel>
          <PreferencesForm
            initial={{ ...emptyPreferences, name: session.account.name }}
            label="انضم للّمّة"
            busy={busy}
            onSave={async (preferences) => {
              setBusy(true);
              try {
                const legacy = await storage.get(`hatim.member.${code}`);
                const group = await social.join(
                  session.token,
                  code,
                  preferences,
                  legacy,
                );
                open(group.id);
              } finally {
                setBusy(false);
              }
            }}
          />
        </Panel>
      )}
    </Page>
  );
}

function Invitation({
  code,
  session,
  onAuth,
  open,
}: {
  code: string;
  session: AccountSession | null;
  onAuth: (session: AccountSession) => Promise<void>;
  open: (id: string) => void;
}) {
  const read = useCallback(async () => {
    try {
      return { invite: await social.invite(code), legacy: false };
    } catch (e) {
      if (e instanceof ApiError && e.status === 404)
        return { invite: null, legacy: true };
      throw e;
    }
  }, [code]);
  const r = useRemote(read);
  if (r.data?.legacy) return <InviteScreen code={code} />;
  if (!r.data?.invite)
    return (
      <Page title="لكم مكان على الطاولة">
        <ErrorNotice
          error={r.error}
          retry={() => {
            void r.refresh();
          }}
        />
        {r.loading && <Loading />}
      </Page>
    );
  return session ? (
    <Join code={code} session={session} open={open} />
  ) : (
    <AuthScreen onAuth={onAuth} invitation={r.data.invite.title} />
  );
}

export function SocialApp({
  inviteCode = null,
  onExit,
}: {
  inviteCode?: string | null;
  onExit?: () => void;
}) {
  const [session, setSession] = useState<AccountSession | null>(null);
  const [legacy, setLegacy] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [circle, setCircle] = useState<string | null>(null);
  const [outing, setOuting] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);
  const restore = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [token, previous] = await Promise.all([
        storage.get(sessionKey),
        readSession(),
      ]);
      setLegacy(previous);
      if (token) {
        try {
          setSession({ token, account: await social.me(token) });
        } catch (e) {
          if (e instanceof ApiError && e.status === 401) {
            await storage.remove(sessionKey);
            setSession(null);
          } else throw e;
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذّرت استعادة حسابك.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void restore();
  }, [restore]);
  const onAuth = async (next: AccountSession) => {
    await storage.set(sessionKey, next.token);
    setSession(next);
  };
  const open = useCallback((id: string) => {
    setCircle(id);
    setJoined(true);
  }, []);
  const logout = async () => {
    if (session) await social.logout(session.token);
    await storage.remove(sessionKey);
    setSession(null);
    setCircle(null);
    setOuting(null);
    setJoined(false);
  };
  if (loading || error)
    return (
      <Page title="نرجع للَمّتكم" back={onExit}>
        <ErrorNotice
          error={error}
          retry={() => {
            void restore();
          }}
        />
        {loading && <Loading />}
      </Page>
    );
  if (inviteCode && !joined)
    return (
      <Invitation
        code={inviteCode}
        session={session}
        onAuth={onAuth}
        open={open}
      />
    );
  if (!session) return <AuthScreen onAuth={onAuth} back={onExit} />;
  if (outing)
    return (
      <OutingScreen
        key={outing}
        id={outing}
        token={session.token}
        back={() => setOuting(null)}
      />
    );
  if (circle)
    return (
      <CircleScreen
        key={circle}
        id={circle}
        token={session.token}
        openOuting={setOuting}
        back={() => setCircle(null)}
      />
    );
  return (
    <GroupsScreen
      account={session.account}
      token={session.token}
      open={open}
      logout={logout}
      back={onExit}
      claim={
        legacy
          ? async () => {
              const group = await social.claim(
                session.token,
                legacy.groupId,
                legacy.token,
              );
              await storage.remove("hatim.organizer.v1");
              setLegacy(null);
              return group.id;
            }
          : undefined
      }
    />
  );
}
