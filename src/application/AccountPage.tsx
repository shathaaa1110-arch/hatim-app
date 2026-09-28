import { useCallback, useRef, useState } from "react";
import { View } from "react-native";
import { Bookmark, LogOut, Plus, UserRound } from "lucide-react-native";
import { plansApi } from "../features/planning";
import { ApiError } from "../shared/api/http";
import { type PlanSummary } from "../shared/contracts";
import { Button, Notice, Row, Sheet, T } from "../shared/ui/primitives";
import { readSession } from "../features/planning";
import { storage } from "../shared/storage";
import { ar } from "../shared/theme";
import { AuthScreen } from "../features/accounts";
import {
  ErrorNotice,
  Field,
  Loading,
  Page,
  Panel,
  s,
} from "../shared/ui/layout";
import { useRemote } from "../shared/useRemote";
import { type AccountSession } from "../features/accounts";
import { planKey } from "../features/planning";
import { useAccount } from "../features/accounts";

type Navigation = {
  back: () => void;
  openGroups: () => void;
  openPlan: (fresh: boolean) => void;
};
type Edit = { kind: "name" } | { kind: "rename" | "delete"; plan: PlanSummary };

export function AccountPage(props: Navigation) {
  const account = useAccount();
  if (account.loading || account.error)
    return (
      <Page title="حسابي" back={props.back}>
        <ErrorNotice
          error={account.error}
          retry={() => {
            void account.restore();
          }}
        />
        {account.loading && <Loading />}
      </Page>
    );
  if (!account.session)
    return <AuthScreen onAuth={account.signIn} back={props.back} />;
  return (
    <SignedIn
      key={account.session.account.id}
      {...props}
      session={account.session}
    />
  );
}

function SignedIn({
  session,
  back,
  openGroups,
  openPlan,
}: Navigation & { session: AccountSession }) {
  const account = useAccount();
  const read = useCallback(async () => {
    const plans = await plansApi
      .plans(session.token)
      .catch(async (e: unknown) => {
        if (e instanceof ApiError && e.status === 401) await account.restore();
        throw e;
      });
    const saved = await readSession();
    let guest = null;
    if (saved) {
      try {
        guest = { session: saved, group: await plansApi.group(saved) };
      } catch (e) {
        if (!(e instanceof ApiError && e.status === 404)) throw e;
      }
    }
    return { plans, guest };
  }, [session.token, account.restore]);
  const r = useRemote(read);
  const [edit, setEdit] = useState<Edit | null>(null);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const writing = useRef(false);
  const run = async (operation: () => Promise<void>) => {
    if (writing.current) return;
    writing.current = true;
    setBusy(true);
    setError(null);
    try {
      await operation();
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذّر حفظ التغيير.");
    } finally {
      writing.current = false;
      setBusy(false);
    }
  };
  const choose = (id: string, fresh = false) =>
    run(async () => {
      await storage.set(planKey(session.account.id), id);
      openPlan(fresh);
    });
  const startEdit = (next: Edit, text = "") => {
    setError(null);
    setValue(text);
    setEdit(next);
  };
  return (
    <Page
      title={`يا هلا، ${session.account.name}`}
      subtitle="خططك وجيبك محفوظان في حسابك. كل خطة لها وقتها ورفقتها."
      back={back}
    >
      <Panel glass>
        <Row>
          <UserRound />
          <View style={{ flex: 1 }}>
            <T weight="semibold" style={s.heading}>
              حسابي
            </T>
            <T style={s.muted}>@{session.account.handle}</T>
          </View>
        </Row>
        <Button
          secondary
          small
          label="تعديل اسم الحساب"
          onPress={() => startEdit({ kind: "name" }, session.account.name)}
        />
      </Panel>
      {!edit && <ErrorNotice error={error} />}
      <ErrorNotice
        error={r.error}
        retry={() => {
          void r.refresh();
        }}
      />
      {r.loading && <Loading />}
      {r.data?.guest && (
        <Panel>
          <T weight="semibold">عندك خطة على هذا الجهاز</T>
          <T>{r.data.guest.group.title}</T>
          <Notice text="احفظها في حسابك لتفتحها من أجهزتك. يبقى رابط الرفقة والجيب والقيود كما هي، ويصبح الدخول بحسابك مطلوبًا لإدارتها." />
          <Button
            label="احفظ خطة الجهاز في حسابي"
            busy={busy || r.busy}
            onPress={() => {
              void run(async () => {
                const guest = r.data?.guest;
                if (!guest) return;
                const saved = await plansApi.saveToAccount(
                  guest.session,
                  session.token,
                );
                await storage.set(planKey(session.account.id), saved.id);
                await storage.remove("hatim.organizer.v1");
                await r.refresh();
              });
            }}
          />
        </Panel>
      )}
      <T weight="semibold" style={s.heading}>
        خططي المحفوظة
      </T>
      <Button
        label="خطة جديدة"
        icon={Plus}
        disabled={busy || !!r.error || r.loading}
        onPress={() => {
          void choose("new", true);
        }}
      />
      {r.data?.plans.length === 0 && (
        <Panel>
          <Bookmark />
          <T weight="semibold">أول خطة، على ذوقك.</T>
          <T style={s.muted}>
            اختر تجاربك وخانات وجباتك. تتقلّص الخطة ويحفظ الجيب الباقي، والقروب
            الدائم خيار إضافي.
          </T>
        </Panel>
      )}
      {r.data?.plans.map((plan) => (
        <Panel key={plan.id}>
          <T weight="semibold" style={s.heading}>
            {plan.title}
          </T>
          <T style={s.muted}>
            {ar(plan.slots)} خانات · {ar(plan.consumed)} عشتها
          </T>
          <Button
            label={`افتح ${plan.title}`}
            disabled={busy}
            onPress={() => {
              void choose(plan.id);
            }}
          />
          <View style={{ gap: 8 }}>
            <Button
              secondary
              small
              label={`تسمية ${plan.title}`}
              onPress={() => startEdit({ kind: "rename", plan }, plan.title)}
            />
            <Button
              secondary
              small
              label={`حذف ${plan.title}`}
              onPress={() => startEdit({ kind: "delete", plan })}
            />
          </View>
        </Panel>
      ))}
      <Button secondary label="قروباتي الاختيارية" onPress={openGroups} />
      <Button
        secondary
        label="تسجيل الخروج"
        icon={LogOut}
        busy={busy}
        onPress={() => {
          void run(account.signOut);
        }}
      />
      <Sheet
        title={
          edit?.kind === "name"
            ? "اسمك في حاتم"
            : edit?.kind === "rename"
              ? "اسم الخطة"
              : "حذف الخطة؟"
        }
        visible={!!edit}
        onClose={() => {
          if (!busy) setEdit(null);
        }}
      >
        {edit?.kind === "delete" ? (
          <Notice
            warning
            text={`ستُحذف «${edit.plan.title}» والجيب وبيانات رفقة هذه الخطة نهائيًا، ويتوقف رابط دعوتها. حسابك وخططك الأخرى تبقى محفوظة.`}
          />
        ) : (
          <Field
            label={edit?.kind === "name" ? "اسم الحساب" : "اسم الخطة"}
            value={value}
            onChangeText={setValue}
            maxLength={edit?.kind === "name" ? 30 : 60}
          />
        )}
        <ErrorNotice error={error} />
        <Button
          label={
            edit?.kind === "delete" ? "نعم، احذف الخطة نهائيًا" : "حفظ التغيير"
          }
          busy={busy || r.busy}
          disabled={edit?.kind !== "delete" && !value.trim()}
          onPress={() => {
            void run(async () => {
              if (!edit) return;
              if (edit.kind === "name") await account.updateName(value.trim());
              else {
                const owner = { groupId: edit.plan.id, token: session.token };
                await r.mutate(async () => {
                  if (edit.kind === "rename")
                    await plansApi.rename(owner, value.trim());
                  else {
                    await plansApi.deletePlan(owner);
                    if (
                      (await storage.get(planKey(session.account.id))) ===
                      edit.plan.id
                    )
                      await storage.set(planKey(session.account.id), "new");
                  }
                });
              }
              setEdit(null);
            });
          }}
        />
        <Button
          secondary
          label="إلغاء"
          disabled={busy}
          onPress={() => setEdit(null)}
        />
      </Sheet>
    </Page>
  );
}
