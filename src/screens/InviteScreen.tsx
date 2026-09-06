import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Check, Edit3, Link, RefreshCw, Users } from "lucide-react-native";
import {
  api,
  ApiError,
  emptyPreferences,
  type Experience,
  type Invite,
  type Member,
  type Preferences,
} from "../api/client";
import { storage } from "../storage";
import { colors as c, ar, photos } from "../theme";
import { Button, Chip, Empty, Notice, Row, Sheet, T } from "../components/ui";
import { PreferencesForm } from "../components/PreferencesForm";
import { Logo } from "./Organizer";

export function InviteScreen({ code }: { code: string | null }) {
  const [invite, setInvite] = useState<Invite | null>(null);
  const [catalog, setCatalog] = useState<Experience[]>([]);
  const [member, setMember] = useState<Member | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!code);
  const [error, setError] = useState<string | null>(null);
  const [edit, setEdit] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const load = useCallback(async () => {
    if (!code) return;
    setLoading(true);
    setError(null);
    try {
      const [next, experiences, stored] = await Promise.all([
        api.invite(code),
        api.catalog(),
        storage.get(`hatim.member.${code}`),
      ]);
      setInvite(next);
      setCatalog(experiences);
      if (stored) {
        try {
          setMember(await api.me(code, stored));
          setToken(stored);
        } catch (e) {
          if (e instanceof ApiError && e.status === 404)
            await storage.remove(`hatim.member.${code}`);
          else throw e;
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذّر فتح الدعوة.");
    } finally {
      setLoading(false);
    }
  }, [code]);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    if (!code || !invite) return;
    let alive = true;
    let fetching = false;
    const interval = setInterval(async () => {
      if (busy || fetching) return;
      fetching = true;
      try {
        const next = await api.invite(code);
        if (alive) {
          setInvite(next);
          setError(null);
        }
        if (token) {
          try {
            const me = await api.me(code, token);
            if (alive) setMember(me);
          } catch (e) {
            if (e instanceof ApiError && e.status === 404 && alive) {
              setMember(null);
              setToken(null);
              await storage.remove(`hatim.member.${code}`);
            }
          }
        }
      } catch (e) {
        if (alive)
          setError(e instanceof Error ? e.message : "تعذّر تحديث الخطة.");
      } finally {
        fetching = false;
      }
    }, 6000);
    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, [code, !!invite, token, busy]);
  const save = async (preferences: Preferences) => {
    if (!code || busy) return;
    setBusy(true);
    try {
      if (token) setMember(await api.updateMe(code, token, preferences));
      else {
        const result = await api.join(code, preferences);
        await storage.set(`hatim.member.${code}`, result.member_token);
        setToken(result.member_token);
        setMember(result.member);
      }
      setSaved(true);
      setEdit(false);
      try {
        setInvite(await api.invite(code));
        setError(null);
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "تم الحفظ، تعذّر تحديث العرض.",
        );
      }
    } finally {
      setBusy(false);
    }
  };
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={s.page}
      >
        <Row style={{ justifyContent: "space-between" }}>
          <Logo />
          <Chip label="دعوة لَمّة" icon={Users} />
        </Row>
        {loading ? (
          <View style={{ padding: 80, gap: 20 }}>
            <ActivityIndicator color={c.green} />
            <T style={{ textAlign: "center", color: c.muted }}>نجهّز مكانك…</T>
          </View>
        ) : !code ? (
          <>
            <Image source={photos.levant} style={s.hero} />
            <Empty
              icon={Link}
              title="لك مكان على الطاولة."
              text="هذا باب اللَمّة. افتح رابط الدعوة اللي أرسله لك المنظّم من تطبيق حاتم على الآيفون."
            />
          </>
        ) : !invite ? (
          <>
            <Empty
              icon={Link}
              title="ما قدرنا نفتح الدعوة"
              text={error ?? "اطلب رابط الدعوة من المنظّم."}
            />
            <Button label="حاول مرة ثانية" icon={RefreshCw} onPress={load} />
          </>
        ) : (
          <>
            <Image source={photos.levant} style={s.hero} />
            <View style={{ gap: 10 }}>
              <T weight="medium" style={{ color: c.coral, fontSize: 13 }}>
                {invite.title}
              </T>
              <T weight="semibold" style={{ fontSize: 36, lineHeight: 53 }}>
                {member
                  ? `هلا ${member.preferences.name}، مكانك محفوظ.`
                  : "هلا، لك مكان في لَمّتنا."}
              </T>
              <T style={{ color: c.muted, lineHeight: 27 }}>
                {member
                  ? "ذوقك وصل للمنظّم. تقدر تعدّله في أي وقت، والخطة تتكيّف مع اللَمّة."
                  : "كل ذوق له مكان. قل لنا وش تحب ووش ما يناسبك، ونرتّب لحظات حلوة للجميع."}
              </T>
            </View>
            <Row style={s.people}>
              <View style={s.round}>
                <Users size={23} color={c.green} />
              </View>
              <View style={{ flex: 1 }}>
                <T weight="medium">{invite.member_names.join("، ")}</T>
                <T style={{ color: c.muted, fontSize: 12 }}>
                  {ar(invite.member_names.length)} في اللَمّة ·{" "}
                  {ar(invite.slots)} خانات وجبات
                </T>
              </View>
            </Row>
            {saved && (
              <Notice text="وصل ذوقك، وتحدّثت الخطة. نراعيك في كل اختيار." />
            )}
            {error && <Notice warning text={error} />}
            <Button
              label={member ? "أعدّل ذوقي" : "أضيف ذوقي للَمّة"}
              icon={member ? Edit3 : Check}
              onPress={() => setEdit(true)}
            />
            <T style={{ textAlign: "center", color: c.muted, fontSize: 11 }}>
              بدون حساب · بياناتك تعدّلها أنت، ويشوفها المنظّم
            </T>
            <View
              style={{ height: 1, backgroundColor: c.line, marginVertical: 10 }}
            />
            <Row style={{ justifyContent: "space-between" }}>
              <T weight="semibold" style={{ fontSize: 25 }}>
                وش في خطّتنا؟
              </T>
              <T style={{ color: c.muted, fontSize: 11 }}>تتحدّث تلقائيًا</T>
            </Row>
            {invite.anchor_issue && (
              <Notice warning text={invite.anchor_issue} />
            )}
            {invite.selected.length === 0 && (
              <Notice
                text={
                  invite.consumed >= invite.slots
                    ? "عشتوا لحظاتكم. المنظّم يقدر يضيف خانات جديدة إذا بقي وقت."
                    : "نراجع توافق الخيارات مع الجميع. المنظّم يشوف التفاصيل ويكمّل الخطة."
                }
              />
            )}
            {invite.selected.map((decision) => {
              const e = catalog.find((x) => x.id === decision.experience_id);
              return e ? (
                <View key={e.id} style={s.planItem}>
                  <Row style={{ alignItems: "flex-start" }}>
                    <Image
                      source={photos[e.image]}
                      style={{ width: 86, height: 97, borderRadius: 16 }}
                    />
                    <View style={{ flex: 1, gap: 5 }}>
                      <T
                        weight="medium"
                        style={{ color: c.green, fontSize: 11 }}
                      >
                        {decision.priority}
                      </T>
                      <T weight="semibold" style={{ fontSize: 20 }}>
                        {e.title}
                      </T>
                      <T style={{ color: c.muted, fontSize: 12 }}>
                        {e.neighborhood} · {ar(e.price)} ر.س
                      </T>
                    </View>
                  </Row>
                  <T style={{ color: c.muted, fontSize: 12, lineHeight: 23 }}>
                    {decision.reason}
                  </T>
                </View>
              ) : null;
            })}
          </>
        )}
        <T
          style={{
            color: c.muted,
            textAlign: "center",
            fontSize: 10,
            lineHeight: 21,
            marginTop: 20,
          }}
        >
          حاتم. صديق اللَمّة. النسخة تجريبية والتجارب والأسعار توضيحية. ليست
          معلومات حساسية موثّقة أو حجوزات فعلية.
        </T>
      </ScrollView>
      <Sheet
        title={member ? "ذوقك يتغيّر؟ عادي." : "خلّنا نعرف ذوقك"}
        visible={edit}
        onClose={() => setEdit(false)}
      >
        <PreferencesForm
          initial={member?.preferences ?? emptyPreferences}
          onSave={save}
          busy={busy}
          label={member ? "تحديث ذوقي" : "انضمّ للَمّة"}
        />
      </Sheet>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  page: {
    padding: 24,
    paddingBottom: 55,
    maxWidth: 590,
    width: "100%",
    alignSelf: "center",
    gap: 20,
  },
  hero: { width: "100%", height: 225, borderRadius: 27 },
  people: { padding: 15, backgroundColor: c.sage, borderRadius: 20 },
  round: {
    backgroundColor: "#DCE7D2",
    width: 46,
    height: 46,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  planItem: {
    padding: 17,
    gap: 14,
    backgroundColor: c.white,
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 22,
  },
});
