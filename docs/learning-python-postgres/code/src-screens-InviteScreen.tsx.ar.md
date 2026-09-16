# شرح `src/screens/InviteScreen.tsx`

[فهرس الكود](README.ar.md) · [دروس البداية](../README.ar.md) · [قاموس الرموز](../01-foundations.ar.md) · [التنسيق](../08-components.ar.md)

المصدر: [الملف في النسخة المرجعية](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/InviteScreen.tsx) · [خريطة الملفات الحالية](../../architecture-modules.ar.md). عدد الأسطر: 312. المقاطع التالية تعرض المصدر نفسه دون تعديل، والشرح خارج الكود.

## رحلة العضو على الويب

[الأسطر 1–25](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/InviteScreen.tsx#L1): تستورد API والتخزين والنموذج والبطاقة. لا تستخدم useOrganizer لأن العضو لا يحمل مفتاح الإدارة.

```tsx
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

```

## ذاكرة صفحة الدعوة

[الأسطر 26–35](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/InviteScreen.tsx#L26): code من App، والحالات تحفظ invite و catalog وملف العضو ومفتاحه والنموذج والانتظار والخطأ. مفتاح التخزين مرتبط برمز المجموعة داخل هذا الموقع.

```tsx
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
```

## تحميل أولي

[الأسطر 36–40](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/InviteScreen.tsx#L36): load لا تستطيع جلب دعوة بلا code. عند وجوده تضبط loading/error ثم تبدأ القراءة.

```tsx
  const load = useCallback(async () => {
    if (!code) return;
    setLoading(true);
    setError(null);
    try {
```

## قراءات مستقلة معًا

[الأسطر 41–47](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/InviteScreen.tsx#L41): Promise.all تقرأ الدعوة والكتالوج والتخزين المحلي بالتوازي. تختلف عن تنفيذ كتابة تعتمد على نتيجة كتابة سابقة.

```tsx
      const [next, experiences, stored] = await Promise.all([
        api.invite(code),
        api.catalog(),
        storage.get(`hatim.member.${code}`),
      ]);
      setInvite(next);
      setCatalog(experiences);
```

## استعادة ملف العضو

[الأسطر 48–63](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/InviteScreen.tsx#L48): إن وجد مفتاح محلي نجرب GET me. إذا رفضه الخادم نمسح العضوية المحلية غير الصالحة وفق المسار. لا نحاول استخدام ownerToken كبديل.

```tsx
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
```

## تشغيل التحميل

[الأسطر 64–66](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/InviteScreen.tsx#L64): useEffect يستدعي load حسب رمز الدعوة. تغيير code يغير مورد الخادم الذي نعرضه.

```tsx
  useEffect(() => {
    void load();
  }, [load]);
```

## قراءة دورية

[الأسطر 67–70](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/InviteScreen.tsx#L67): التأثير يهيئ علامة انتهاء وطلبًا واحدًا في كل مرة. لا يبدأ تداخل مؤقتات لكل عضو ظاهر.

```tsx
  useEffect(() => {
    if (!code || !invite) return;
    let alive = true;
    let fetching = false;
```

## تحديث العرض المشترك

[الأسطر 71–79](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/InviteScreen.tsx#L71): المؤقت يعيد GET invite كل 6 ثوانٍ ويتجنب التداخل أو القراءة أثناء busy. لا يوجد هنا فحص visibilityState أو إيقاف خاص للصفحة المخفية؛ يختلف ذلك عن AppState في hook المنظّم. التحديث لا يعيد POST join.

```tsx
    const interval = setInterval(async () => {
      if (busy || fetching) return;
      fetching = true;
      try {
        const next = await api.invite(code);
        if (alive) {
          setInvite(next);
          setError(null);
        }
```

## إعادة فحص العضوية

[الأسطر 80–98](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/InviteScreen.tsx#L80): عند وجود مفتاح نقرأ me للتحقق من استمرار العضوية. إزالة المنظّم للعضو تسقط الملف المحلي وفق رد 404. حواجز انتهاء التأثير تمنع تحديث حالة لم تعد مناسبة.

```tsx
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
```

## إيقاف المؤقت

[الأسطر 99–103](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/InviteScreen.tsx#L99): عند مغادرة الصفحة/تغير الاعتمادات يتوقف polling. هذا لا يحذف العضو من PostgreSQL.

```tsx
    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, [code, !!invite, token, busy]);
```

## إنشاء الملف أو تحديثه

[الأسطر 104–128](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/InviteScreen.tsx#L104): save تختار join عند أول مشاركة، أو updateMe عندما يوجد مفتاح. بعد join تحفظ member_token في تخزين هذا المتصفح. success يعيد العرض المشترك ويغلق النموذج. فشل الطلب يبقي رسالة مفهومة.

```tsx
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
```

## إطار الصفحة

[الأسطر 129–138](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/InviteScreen.tsx#L129): SafeAreaView و ScrollView يجهزان عرضًا صغيرًا وكبيرًا. هذه الصفحة هي المدخل العام وليس شاشة إدارة المنظّم.

```tsx
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
```

## انتظار البداية

[الأسطر 139–143](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/InviteScreen.tsx#L139): نظهر مؤشرًا أثناء load الأولية؛ لا نعرض نموذجًا مبنيًا على بيانات مجهولة.

```tsx
        {loading ? (
          <View style={{ padding: 80, gap: 20 }}>
            <ActivityIndicator color={c.green} />
            <T style={{ textAlign: "center", color: c.muted }}>نجهّز مكانك…</T>
          </View>
```

## لا رمز دعوة

[الأسطر 144–152](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/InviteScreen.tsx#L144): الفتح على / دون /join/code يعرض إرشادًا بطلب الدعوة. لا ينشئ مجموعة جديدة للزائر.

```tsx
        ) : !code ? (
          <>
            <Image source={photos.levant} style={s.hero} />
            <Empty
              icon={Link}
              title="لك مكان على الطاولة."
              text="هذا باب اللَمّة. افتح رابط الدعوة اللي أرسله لك المنظّم من تطبيق حاتم على الآيفون."
            />
          </>
```

## دعوة لم تُحمّل

[الأسطر 153–162](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/InviteScreen.tsx#L153): الخطأ وإعادة المحاولة يشرحان الرمز غير الموجود أو فشل الاتصال بحسب الرد. رابط مؤقت متوقف قد لا يصل إلى هذه الشاشة أصلًا.

```tsx
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
```

## الترحيب بالمجموعة

[الأسطر 163–179](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/InviteScreen.tsx#L163): العنوان وعدد الخانات والهوية تأتي من InviteView. لا نحتاج تفضيلات كل الأعضاء لعرض الترحيب.

```tsx
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
```

## أسماء المجموعة

[الأسطر 180–191](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/InviteScreen.tsx#L180): نعرض member_names فقط. هذه ليست قائمة member كاملة قابلة للتعديل من الضيف.

```tsx
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
```

## رسائل الحفظ والفشل

[الأسطر 192–195](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/InviteScreen.tsx#L192): saved تأكيد محلي بعد نجاح العملية، و error تنبيه عند المشكلة.

```tsx
            {saved && (
              <Notice text="وصل ذوقك، وتحدّثت الخطة. نراعيك في كل اختيار." />
            )}
            {error && <Notice warning text={error} />}
```

## الدخول للنموذج

[الأسطر 196–203](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/InviteScreen.tsx#L196): الزر يفتح نموذجًا جديدًا أو تعديل الملف الحالي بحسب me. لا يوجد هنا بريد وكلمة مرور أو تدفق signup/login.

```tsx
            <Button
              label={member ? "أعدّل ذوقي" : "أضيف ذوقي للَمّة"}
              icon={member ? Edit3 : Check}
              onPress={() => setEdit(true)}
            />
            <T style={{ textAlign: "center", color: c.muted, fontSize: 11 }}>
              بدون حساب · بياناتك تعدّلها أنت، ويشوفها المنظّم
            </T>
```

## الخطة المشتركة

[الأسطر 204–212](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/InviteScreen.tsx#L204): العنوان والعدد يصفان ما اختاره محرك القرار للمجموعة.

```tsx
            <View
              style={{ height: 1, backgroundColor: c.line, marginVertical: 10 }}
            />
            <Row style={{ justifyContent: "space-between" }}>
              <T weight="semibold" style={{ fontSize: 25 }}>
                وش في خطّتنا؟
              </T>
              <T style={{ color: c.muted, fontSize: 11 }}>تتحدّث تلقائيًا</T>
            </Row>
```

## تعذر الركيزة والخطة الفارغة

[الأسطر 213–224](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/InviteScreen.tsx#L213): نعرض سبب التعذر وحالة لا نتائج بدل استبدال الركيزة بلا إذن.

```tsx
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
```

## بطاقات القرارات

[الأسطر 225–256](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/InviteScreen.tsx#L225): map تربط selected بالكتالوج وتعرض عنوان التجربة والرتبة والسبب. لا تمنح العضو أزرار تعديل خانات المجموعة.

```tsx
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
```

## التذييل

[الأسطر 257–269](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/InviteScreen.tsx#L257): النص يذكّر بدور التجارب المختارة وطبيعة النسخة.

```tsx
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
```

## نافذة تفضيلات العضو

[الأسطر 270–284](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/InviteScreen.tsx#L270): PreferencesForm تهيأ بملفه الحالي أو emptyPreferences. busy تمنع إرسالًا مكررًا، و onSave ترجع إلى دالة save التي تعرف صلاحية العضو.

```tsx
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
```

## التنسيق البصري

[الأسطر 285–312](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/InviteScreen.tsx#L285): مقاسات المحتوى والرأس والشعار وصور التجارب وبطاقات الخطة. كل خاصية تنسيق مشروحة في جدول الدرس 08. الكائنات هنا أسماء أنماط نمررها إلى style؛ لا ترسل طلبات ولا تعدل DB. ترتيب مصفوفة style يسمح للخصائص اللاحقة بتعديل الأساسية.

```tsx
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
```

## تأكدي من فهمك

اختاري مقطعًا واشرحي مدخلاته ونتيجته وما الذي يغيّره. ثم اكتبي مثالًا أصغر بنفس الفكرة في مجلد تدريب، واذكري ما يجب اختباره قبل دمجه.
