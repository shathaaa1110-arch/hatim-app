# شرح `src/screens/Organizer.tsx`

[فهرس الكود](README.ar.md) · [دروس البداية](../README.ar.md) · [قاموس الرموز](../01-foundations.ar.md) · [التنسيق](../08-components.ar.md)

المصدر: [الملف في النسخة المرجعية](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/Organizer.tsx) · [الملف المحلي](../../../src/screens/Organizer.tsx). عدد الأسطر: 743. المقاطع التالية تعرض المصدر نفسه دون تعديل، والشرح خارج الكود.

## تجميع الشاشة

[الأسطر 1–56](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/Organizer.tsx#L1): الاستيرادات تجمع مكونات النظام والمكتبات ثم API و hook والمكونات والشاشات التي كتبناها. كثرة الاستيرادات هنا ناتجة عن كون Organizer تجمع التنقل والنوافذ؛ لا تعني خدمات خلفية مستقلة.

```tsx
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import {
  Bookmark,
  Check,
  Compass,
  Copy,
  Link,
  MapPin,
  Share2,
  Sparkles,
  Users,
  Utensils,
  X,
} from "lucide-react-native";
import {
  api,
  emptyPreferences,
  PUBLIC_ORIGIN,
  type Experience,
  type Member,
  type Settings,
} from "../api/client";
import { ar, colors as c, photos } from "../theme";
import { useOrganizer } from "../useOrganizer";
import {
  Button,
  Chip,
  Empty,
  Glass,
  Notice,
  Row,
  Sheet,
  T,
} from "../components/ui";
import { PreferencesForm } from "../components/PreferencesForm";
import { ExperienceCard } from "../components/ExperienceCard";
import { Discover } from "./Discover";
import { GroupScreen } from "./GroupScreen";
import { PlanScreen } from "./PlanScreen";

```

## التبويبات والهوية

[الأسطر 57–86](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/Organizer.tsx#L57): Tab نوع بأسماء التبويبات الممكنة، و tabs تربط الاسم بالعناوين والأيقونات. Logo مكوّن صغير يرسم العلامة والنص. map لاحقًا تستخدم هذه القائمة في التنقل.

```tsx
type Tab = "discover" | "plan" | "pocket" | "group";
const tabs = [
  { key: "discover", title: "اكتشف", icon: Compass },
  { key: "plan", title: "خطّتنا", icon: Utensils },
  { key: "pocket", title: "الجيب", icon: Bookmark },
  { key: "group", title: "لَمّتنا", icon: Users },
] as const;

export function Logo() {
  return (
    <Row style={{ gap: 3 }}>
      <T
        weight="semibold"
        style={{ fontSize: 36, lineHeight: 53, letterSpacing: -2 }}
      >
        حاتم
      </T>
      <View
        style={{
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: c.coral,
          marginTop: 10,
        }}
      />
    </Row>
  );
}

```

## حالة الشاشة

[الأسطر 87–103](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/Organizer.tsx#L87): useOrganizer يملك بيانات المجموعة. الحالات الأخرى تتحكم في التبويب والتفاصيل والنموذج والدعوة والحذف والتنبيه. useWindowDimensions يختار التخطيط العريض عند 900، و useRef يحتفظ بمرجع التمرير.

```tsx
export function Organizer() {
  const organizer = useOrganizer();
  const { group, loading, busy, error } = organizer;
  const [catalog, setCatalog] = useState<Experience[]>([]);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("discover");
  const [detail, setDetail] = useState<Experience | null>(null);
  const [profile, setProfile] = useState(false);
  const [invite, setInvite] = useState(false);
  const [copied, setCopied] = useState(false);
  useEffect(() => setCopied(false), [invite]);
  const [remove, setRemove] = useState<Member | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const wide = width >= 900;
  const scroll = useRef<ScrollView>(null);
```

## تحميل الكتالوج

[الأسطر 104–111](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/Organizer.tsx#L104): loadCatalog تقرأ التجارب وتخزنها محليًا للعرض مع خطأ واضح. الكتالوج منفصل عن GroupView؛ لذلك تحتاج الشاشة كلاهما لربط experience_id بصورة ووصف.

```tsx
  const loadCatalog = async () => {
    try {
      setCatalog(await api.catalog());
      setCatalogError(null);
    } catch (e) {
      setCatalogError(e instanceof Error ? e.message : "تعذّر تحميل التجارب.");
    }
  };
```

## بدء القراءة

[الأسطر 112–114](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/Organizer.tsx#L112): التأثير يشغل تحميل الكتالوج عند تركيب الشاشة. void يوضح تجاهل القيمة المرجعة من Promise لأن الدالة تتولى حالة نجاحها وفشلها.

```tsx
  useEffect(() => {
    void loadCatalog();
  }, []);
```

## عمر التنبيه

[الأسطر 115–120](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/Organizer.tsx#L115): التأثير يزيل toast بعد مهلة وينظف المؤقت إذا تغير النص. toast إقرار مؤقت، وليس سجلًا محفوظًا بالخادم.

```tsx
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4500);
      return () => clearTimeout(timer);
    }
  }, [toast]);
```

## التنقل

[الأسطر 121–124](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/Organizer.tsx#L121): navigate تغير tab وتعيد التمرير للأعلى. لا يوجد Router مع مسار HTTP مستقل لكل تبويب أصلي في هذه النسخة.

```tsx
  const navigate = (next: Tab) => {
    setTab(next);
    scroll.current?.scrollTo({ y: 0, animated: false });
  };
```

## تحديث إعدادات كاملة

[الأسطر 125–131](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/Organizer.tsx#L125): update تستقبل Settings كاملة وتمررها إلى organizer.settings. الاستدعاءات في callbacks أدناه تنسخ group.settings وتغير الحقل المطلوب قبل استدعائها. catch يعتمد على hook لحفظ error المعروضة. الدالة نفسها لا تدمج رقعة حقول.

```tsx
  const update = async (settings: Settings) => {
    try {
      await organizer.settings(settings);
    } catch {
      /* Persistent error appears in the page. */
    }
  };
```

## ما يُمنع حفظه في الجيب

[الأسطر 132–141](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/Organizer.tsx#L132): save تفحص وجود group و busy ثم تمنع نقل الركيزة أو المكتمل إلى الجيب مع toast توضيحية. حماية الواجهة سريعة، والتحقق بالخادم يبقى إلزاميًا.

```tsx
  const save = (e: Experience) => {
    if (!group || busy) return;
    if (group.settings.anchor_id === e.id) {
      setToast("هذي ركيزتكم. اختاروا ركيزة ثانية أول، عشان ما نضيّع الحلم.");
      return;
    }
    if (group.settings.completed_ids?.includes(e.id)) {
      setToast("عشتوا هالتجربة. مكانها محفوظ في لحظاتكم.");
      return;
    }
```

## تبديل الجيب اليدوي

[الأسطر 142–158](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/Organizer.tsx#L142): نبحث عن معرف التجربة في pocket_ids. إن وجد نحذفه وإلا نضيفه بمصفوفة جديدة ثم نحفظ Settings. هذا مختلف عن plan.pocket المشتقة التي تضم أيضًا المؤجل بسبب الوقت أو القيود.

```tsx
    const saved = group.settings.pocket_ids?.includes(e.id);
    void organizer
      .settings({
        ...group.settings,
        pocket_ids: saved
          ? group.settings.pocket_ids?.filter((id) => id !== e.id)
          : [...(group.settings.pocket_ids ?? []), e.id],
      })
      .then(() =>
        setToast(
          saved
            ? "رجعت للترتيب. تدخل الخطة إذا وسعها الوقت وناسبت الجميع."
            : "حفظناها في الجيب. لها وقتها.",
        ),
      )
      .catch(() => {});
  };
```

## نسخ الدعوة

[الأسطر 159–168](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/Organizer.tsx#L159): نبني رابط PUBLIC_ORIGIN مع invite_code ثم نستعمل Clipboard. copied حالة عرض تؤكد النسخ. الرمز من الخادم؛ لا نخترع رابطًا لكل عضو محليًا.

```tsx
  const inviteUrl = group ? `${PUBLIC_ORIGIN}/join/${group.invite_code}` : "";
  const copy = async () => {
    try {
      await Clipboard.setStringAsync(inviteUrl);
      setCopied(true);
      setToast("نسخنا رابط اللَمّة.");
    } catch {
      setToast("تعذّر النسخ. اضغط مطولًا على الرابط وانسخه.");
    }
  };
```

## مشاركة النظام

[الأسطر 169–179](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/Organizer.tsx#L169): Share تفتح واجهة المشاركة الأصلية بالرابط. المحاكاة/الويب يتبعان دعم المنصة. عرض نافذة مشاركة لا يعني أن الخادم أرسل رسالة لأحد.

```tsx
  const share = async () => {
    try {
      await Share.share({
        message: `لك مكان على طاولتنا. اختَر ذوقك هنا: ${inviteUrl}`,
        url: inviteUrl,
      });
    } catch {
      setToast("تعذّرت المشاركة. تقدر تنسخ الرابط.");
    }
  };

```

## حالة التحميل

[الأسطر 180–187](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/Organizer.tsx#L180): قبل معرفة الجلسة نعرض مؤشرًا. لا نفترض من أول null أنها مستخدمة جديدة قبل انتهاء restore.

```tsx
  if (loading)
    return (
      <View style={s.loading}>
        <Logo />
        <ActivityIndicator color={c.green} />
        <T style={{ color: c.muted }}>نرتّب اللَمّة…</T>
      </View>
    );
```

## أول استخدام أو تعذر الاستعادة

[الأسطر 188–227](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/Organizer.tsx#L188): عند عدم وجود group نعرض المقدمة وزر البداية ورسالة الخطأ وإعادة المحاولة عند الحاجة. إنشاء المجموعة يبدأ بنموذج التفضيلات، فلا ننشئ مجموعة مع كل فتح للشاشة.

```tsx
  if (!group)
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={s.welcome}
          keyboardShouldPersistTaps="handled"
        >
          <Logo />
          <Image
            source={photos.fire}
            style={{
              width: "100%",
              height: 250,
              borderRadius: 32,
              marginVertical: 15,
            }}
          />
          <T weight="semibold" style={{ fontSize: 36, textAlign: "center" }}>
            لَمّة على ذوق الجميع.
          </T>
          <T style={{ textAlign: "center", color: c.muted, lineHeight: 27 }}>
            أنت تختار الركيزة. الربع يضيفون أذواقهم. وحاتم يرتّب الباقي على قدّ
            وقتكم.
          </T>
          {error ? (
            <>
              <Notice warning text={error} />
              <Button label="حاول مرة ثانية" onPress={organizer.restore} />
            </>
          ) : (
            <Button
              label="نبدأ لَمّتنا"
              onPress={() => setProfile(true)}
              icon={Users}
            />
          )}
          <T style={{ color: c.muted, textAlign: "center", fontSize: 11 }}>
            نسخة تجريبية · تجارب وأسعار توضيحية في الرياض
          </T>
        </ScrollView>
```

## نموذج الإنشاء

[الأسطر 228–245](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/Organizer.tsx#L228): Sheet تعرض PreferencesForm بالقيم الفارغة و busy. onSave تنتظر create وتغلق النموذج بعد النجاح. الاسم يخص ملف المنظّم؛ عنوان المجموعة الافتراضي يأتي من API.

```tsx
        <Sheet
          title="أول مكان على الطاولة لك"
          visible={profile}
          onClose={() => setProfile(false)}
        >
          <PreferencesForm
            initial={emptyPreferences}
            onSave={async (p) => {
              await organizer.create(p);
              setProfile(false);
            }}
            busy={busy}
            label="نبدأ اللَمّة"
          />
        </Sheet>
      </SafeAreaView>
    );

```

## بناء التنقل

[الأسطر 246–296](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/Organizer.tsx#L246): دالة nav ترسم التبويبات مع الأيقونة والحالة النشطة وعدّ الجيب. إعادة استخدامها تخدم الموضع العريض والشريط السفلي دون نسخ منطق تغيير tab.

```tsx
  const nav = (
    <Row style={{ justifyContent: "space-around", gap: wide ? 24 : 0 }}>
      {tabs.map(({ key, title, icon: Icon }) => (
        <Pressable
          key={key}
          accessibilityRole={Platform.OS === "web" ? "tab" : "button"}
          accessibilityLabel={title}
          accessibilityState={{ selected: tab === key }}
          onPress={() => navigate(key)}
          style={[
            s.tab,
            wide && {
              flexDirection: "row-reverse",
              minWidth: 92,
              paddingHorizontal: 15,
            },
            tab === key && s.activeTab,
          ]}
        >
          <View>
            <Icon
              size={wide ? 18 : 21}
              color={tab === key ? c.green : c.muted}
              strokeWidth={tab === key ? 2 : 1.6}
            />
            {key === "pocket" && group.plan.pocket.length > 0 && (
              <View style={s.badge}>
                <T
                  style={{
                    fontSize: 8,
                    color: c.white,
                    textAlign: "center",
                    lineHeight: 12,
                  }}
                >
                  {ar(group.plan.pocket.length)}
                </T>
              </View>
            )}
          </View>
          <T
            weight={tab === key ? "semibold" : "regular"}
            style={{ fontSize: 11, color: tab === key ? c.green : c.muted }}
          >
            {title}
          </T>
        </Pressable>
      ))}
    </Row>
  );

```

## رأس الصفحة

[الأسطر 297–336](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/Organizer.tsx#L297): العرض العريض يضع شعارًا وتنقلًا ومعلومات المجموعة، والعرض الضيق يرتب رأسًا مناسبًا للهاتف. الألوان والأحجام لا تغيّر بيانات المجموعة.

```tsx
  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
      <View style={[s.header, wide && { paddingHorizontal: 48 }]}>
        <View style={[s.headerContent, { maxWidth: 1180 }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="حاتم، اكتشف"
            onPress={() => navigate("discover")}
          >
            <Logo />
          </Pressable>
          {wide && nav}
          <Row>
            <View style={s.location}>
              <MapPin size={13} color={c.green} />
              <T weight="medium" style={{ fontSize: 12 }}>
                الرياض
              </T>
              <View
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: c.coral,
                }}
              />
            </View>
            {wide && (
              <Pressable
                onPress={() => navigate("group")}
                accessibilityRole="button"
                accessibilityLabel="مجموعتنا"
                style={s.profile}
              >
                <T weight="semibold">{group.members[0]?.preferences.name[0]}</T>
              </Pressable>
            )}
          </Row>
        </View>
      </View>
```

## منطقة التمرير

[الأسطر 337–354](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/Organizer.tsx#L337): ScrollView تحمل المحتوى وتضيف حوافًا ومساحة للشريط السفلي. ref يسمح لـ navigate بإعادة موضع التمرير.

```tsx
      <ScrollView
        ref={scroll}
        contentContainerStyle={{
          paddingHorizontal: wide ? 48 : 22,
          paddingTop: wide ? 27 : 18,
          paddingBottom: wide ? 40 : 115 + insets.bottom,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={{
            maxWidth: tab === "discover" || tab === "pocket" ? 1180 : 780,
            width: "100%",
            alignSelf: "center",
            gap: 18,
          }}
        >
```

## إظهار فشل العمل

[الأسطر 355–361](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/Organizer.tsx#L355): خطأ الكتالوج/المجموعة يظهر مع المحاولة المناسبة. استلام فشل لا يمحو المجموعة المحفوظة تلقائيًا.

```tsx
          {error && <Notice warning text={error} />}
          {catalogError && (
            <>
              <Notice warning text={catalogError} />
              <Button label="إعادة تحميل التجارب" onPress={loadCatalog} />
            </>
          )}
```

## اختيار شاشة التبويب

[الأسطر 362–389](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/Organizer.tsx#L362): الشرط يعرض Discover أو PlanScreen أو GroupScreen ويمرر البيانات و callbacks. الأب يملك الكتابة، والأبناء يطلبونها. props تجعل اتجاه انتقال البيانات واضحًا.

```tsx
          {tab === "discover" && (
            <Discover
              catalog={catalog}
              group={group}
              onOpen={setDetail}
              onSave={save}
              onPlan={() => navigate("plan")}
              onGroup={() => navigate("group")}
            />
          )}
          {tab === "plan" && (
            <PlanScreen
              catalog={catalog}
              group={group}
              busy={busy}
              update={update}
              onOpen={setDetail}
              onPocket={() => navigate("pocket")}
            />
          )}
          {tab === "group" && (
            <GroupScreen
              group={group}
              onInvite={() => setInvite(true)}
              onEdit={() => setProfile(true)}
              onRemove={setRemove}
            />
          )}
```

## شاشة الجيب داخل Organizer

[الأسطر 390–436](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/Organizer.tsx#L390): نربط pocketItem بالتجربة من catalog. السبب و blocked يوضحان التأجيل أو القيد. زر الاسترجاع يحذف من الجيب اليدوي حيث ينطبق؛ المؤجل تلقائيًا يرجع مع السعة.

```tsx
          {tab === "pocket" && (
            <View style={{ gap: 23 }}>
              <View>
                <T style={{ color: c.muted, fontSize: 12 }}>
                  الطموح محفوظ، بلا ضغط
                </T>
                <T weight="semibold" style={{ fontSize: 34 }}>
                  لها وقتها.
                </T>
                <T style={{ color: c.muted, lineHeight: 25 }}>
                  كل تجربة خرجت من الخطة تلقاها هنا، ومعها السبب.
                </T>
              </View>
              {group.plan.pocket.length === 0 ? (
                <Empty
                  icon={Bookmark}
                  title="الجيب فاضي… والطموح كبير"
                  text="احفظ تجربة لبعدين، أو قلّص الوقت ونحفظ اللي يخرج تلقائيًا."
                />
              ) : (
                <View
                  style={{
                    flexDirection: "row-reverse",
                    flexWrap: "wrap",
                    gap: 20,
                  }}
                >
                  {group.plan.pocket.map((item) => {
                    const e = catalog.find((x) => x.id === item.experience_id);
                    return e ? (
                      <View
                        key={e.id}
                        style={{ width: wide ? "31.9%" : "100%", gap: 10 }}
                      >
                        <ExperienceCard
                          experience={e}
                          onOpen={() => setDetail(e)}
                          compact
                        />
                        <Notice warning={item.blocked} text={item.reason} />
                      </View>
                    ) : null;
                  })}
                </View>
              )}
            </View>
          )}
```

## تذييل الصفحة

[الأسطر 437–462](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/Organizer.tsx#L437): عبارة الهوية وحدود النسخة تظهر في نهاية المحتوى. هذه نصوص منتج ثابتة وليست حقول DB.

```tsx
          <View style={s.footer}>
            <View
              style={{ height: 1, backgroundColor: c.line, marginBottom: 18 }}
            />
            <Row style={{ justifyContent: "space-between" }}>
              <T style={{ fontSize: 12, color: c.green }}>
                حاتم. صديق اللَمّة.
              </T>
              <T style={{ fontSize: 10, color: c.muted }}>
                صُنع للّحظات، مو للقوائم
              </T>
            </Row>
            <T
              style={{
                color: c.muted,
                fontSize: 10,
                lineHeight: 20,
                marginTop: 7,
              }}
            >
              نسخة تجريبية · الأسماء والتجارب والأسعار توضيحية، وليست توصيات أو
              حجوزات فعلية.
            </T>
          </View>
        </View>
      </ScrollView>
```

## شريط الهاتف

[الأسطر 463–467](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/Organizer.tsx#L463): التنقل السفلي يستعمل Glass ويظهر وفق عرض الشاشة. safe area تترك مساحة إيماءة النظام.

```tsx
      {!wide && (
        <View style={[s.bottomWrap, { bottom: Math.max(14, insets.bottom) }]}>
          <Glass style={s.bottomNav}>{nav}</Glass>
        </View>
      )}
```

## تنبيه عابر

[الأسطر 468–486](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/Organizer.tsx#L468): toast تظهر فوق المحتوى عند إجراء مثل الحفظ أو توضيح قيد. المؤقت السابق ينهيها؛ لا تحتاج طلبًا آخر.

```tsx
      {toast && (
        <Pressable
          onPress={() => setToast(null)}
          accessibilityRole="alert"
          style={[s.toast, { bottom: wide ? 30 : 112 + insets.bottom }]}
        >
          <T
            style={{
              color: c.white,
              fontSize: 13,
              lineHeight: 24,
              textAlign: "center",
            }}
          >
            {toast}
          </T>
        </Pressable>
      )}

```

## تفاصيل التجربة

[الأسطر 487–524](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/Organizer.tsx#L487): Sheet تربط detail بالتجربة وتعرض الصورة والوصف والسبب والأسعار. نستخرج قرارها الحالي لمعرفة الرتبة والتعديلات، والغياب لا يعني أن الكتالوج فُقد.

```tsx
      <Sheet
        title={detail?.title ?? ""}
        visible={!!detail}
        onClose={() => setDetail(null)}
      >
        {detail && (
          <>
            <Image
              source={photos[detail.image]}
              style={{ height: 230, width: "100%", borderRadius: 22 }}
            />
            <Row style={{ justifyContent: "space-between" }}>
              <Chip label={detail.category} />
              <T style={{ color: c.muted, fontSize: 12 }}>
                {detail.venue} · {detail.neighborhood}
              </T>
            </Row>
            <T style={{ lineHeight: 29, fontSize: 16 }}>{detail.description}</T>
            <Row>
              <Chip label={`${ar(detail.price)} ر.س / شخص`} />
              <Chip label={`${ar(detail.minutes)} دقيقة`} />
            </Row>
            <Notice text={`ليش اخترناها؟ ${detail.why}`} />
            {group.plan.pocket.find((x) => x.experience_id === detail.id)
              ?.blocked && (
              <Notice
                warning
                text={
                  group.plan.pocket.find((x) => x.experience_id === detail.id)!
                    .reason
                }
              />
            )}
            {group.plan.selected
              .find((x) => x.experience_id === detail.id)
              ?.adaptations?.map((text, i) => (
                <Notice key={i} text={text} />
              ))}
```

## تحديد الركيزة

[الأسطر 525–571](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/Organizer.tsx#L525): الإجراء يعدل anchor_id وينظف الجيب اليدوي من المعرف المختار. التجربة المكتملة لا تعاد للاستهلاك من هذا الزر. عند تعارض قيد سيشرح planner anchor_issue بدل تبديل الحلم بصمت.

```tsx
            {!group.settings.completed_ids?.includes(detail.id) && (
              <>
                <Button
                  label={
                    group.settings.anchor_id === detail.id
                      ? "حرّر الركيزة من الخطة"
                      : "هذه ركيزة لَمّتنا"
                  }
                  icon={Sparkles}
                  busy={busy}
                  onPress={async () => {
                    try {
                      await organizer.settings({
                        ...group.settings,
                        anchor_id:
                          group.settings.anchor_id === detail.id
                            ? null
                            : detail.id,
                        pocket_ids: group.settings.pocket_ids?.filter(
                          (id) => id !== detail.id,
                        ),
                      });
                      setDetail(null);
                      navigate("plan");
                    } catch {}
                  }}
                />
                <Button
                  secondary
                  label={
                    group.settings.pocket_ids?.includes(detail.id)
                      ? "أرجعها للترتيب"
                      : "خليها في الجيب"
                  }
                  icon={Bookmark}
                  disabled={busy || group.settings.anchor_id === detail.id}
                  onPress={() => save(detail)}
                />
              </>
            )}
            <T style={{ color: c.muted, fontSize: 11, lineHeight: 21 }}>
              تجربة توضيحية. معلومات الحساسية والتوافر غير موثّقة، ولا يتم إجراء
              حجز.
            </T>
          </>
        )}
      </Sheet>
```

## تعديل ذوق المنظّم

[الأسطر 572–588](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/Organizer.tsx#L572): النموذج يأخذ تفضيلات العضو المنظّم ثم يرسلها عبر profile. غلق/إعادة تركيب النموذج يهيئ مسودته الصحيحة.

```tsx
      <Sheet
        title="ذوقك له مكان"
        visible={profile}
        onClose={() => setProfile(false)}
      >
        <PreferencesForm
          initial={
            group.members.find((m) => m.organizer)?.preferences ??
            emptyPreferences
          }
          onSave={async (p) => {
            await organizer.profile(p);
            setProfile(false);
          }}
          busy={busy}
        />
      </Sheet>
```

## نافذة الدعوة

[الأسطر 589–630](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/Organizer.tsx#L589): نعرض الرابط وزري النسخ والمشاركة مع شرح دور صفحة الويب. owner token لا يدخل في الرابط.

```tsx
      <Sheet
        title="لكم مكان على الطاولة"
        visible={invite}
        onClose={() => setInvite(false)}
      >
        <View style={{ alignItems: "center", gap: 15, paddingVertical: 5 }}>
          <View
            style={{ backgroundColor: c.sage, padding: 24, borderRadius: 29 }}
          >
            <Link size={35} color={c.green} />
          </View>
          <T weight="semibold" style={{ fontSize: 25 }}>
            أرسلها للي تحب لَمّتهم.
          </T>
          <T style={{ textAlign: "center", color: c.muted, lineHeight: 27 }}>
            يفتحون الرابط، يكتبون أذواقهم، ويشوفون الخطة. بدون حساب وبدون تطبيق.
          </T>
        </View>
        <View
          style={{
            padding: 15,
            borderRadius: 14,
            backgroundColor: c.white,
            borderWidth: 1,
            borderColor: c.line,
          }}
        >
          <T
            selectable
            style={{ fontSize: 12, textAlign: "left", writingDirection: "ltr" }}
          >
            {inviteUrl}
          </T>
        </View>
        <Button
          label={copied ? "تم نسخ رابط الدعوة" : "نسخ رابط الدعوة"}
          icon={copied ? Check : Copy}
          onPress={copy}
        />
        <Button secondary label="مشاركة الدعوة" icon={Share2} onPress={share} />
        <Notice text="كل شخص يعدّل بياناته من نفس المتصفح. المنظّم يشوف القيود، والأعضاء يشوفون الخطة وأسماء اللَمّة." />
      </Sheet>
```

## تأكيد إزالة عضو

[الأسطر 631–657](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/Organizer.tsx#L631): نختار العضو المعني ثم ننتظر remove. الإزالة تؤدي إلى إعادة الحساب حسب الأعضاء الباقين. لا يستطيع المنظم حذف نفسه بهذا endpoint.

```tsx
      <Sheet
        title="إزالة من اللَمّة"
        visible={!!remove}
        onClose={() => setRemove(null)}
      >
        <T>
          إزالة {remove?.preferences.name} تعيد ترتيب الخطة حسب الأعضاء الباقين.
          يقدر ينضم مجددًا من رابط الدعوة.
        </T>
        <Button
          label="إزالة العضو"
          icon={X}
          busy={busy}
          onPress={async () => {
            if (remove) {
              try {
                await organizer.remove(remove.id);
                setRemove(null);
              } catch {}
            }
          }}
        />
      </Sheet>
    </SafeAreaView>
  );
}

```

## التنسيق البصري

[الأسطر 658–743](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/Organizer.tsx#L658): الأنماط تغطي المقدمة والشعار والرأس والتنقل والنوافذ والتفاصيل والجيب وموضع toast. عرض الشاشة يختار مجموعات أنماط، لا نسخة بيانات أخرى. كل خاصية تنسيق مشروحة في جدول الدرس 08. الكائنات هنا أسماء أنماط نمررها إلى style؛ لا ترسل طلبات ولا تعدل DB. ترتيب مصفوفة style يسمح للخصائص اللاحقة بتعديل الأساسية.

```tsx
const s = StyleSheet.create({
  loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 20 },
  welcome: {
    padding: 27,
    gap: 17,
    maxWidth: 520,
    alignSelf: "center",
    width: "100%",
    paddingBottom: 50,
  },
  header: {
    paddingHorizontal: 22,
    borderBottomWidth: 1,
    borderColor: c.line,
    backgroundColor: c.background,
  },
  headerContent: {
    width: "100%",
    alignSelf: "center",
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    height: 80,
  },
  location: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 7,
    borderRadius: 20,
    backgroundColor: c.sage,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  profile: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E7E1D5",
    alignItems: "center",
    justifyContent: "center",
  },
  tab: {
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    minWidth: 65,
    minHeight: 53,
    borderRadius: 21,
    paddingVertical: 5,
  },
  activeTab: { backgroundColor: "rgba(216,229,207,.64)" },
  badge: {
    position: "absolute",
    top: -4,
    right: -7,
    minWidth: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: c.coral,
  },
  bottomWrap: {
    position: "absolute",
    left: 22,
    right: 22,
    alignItems: "center",
  },
  bottomNav: {
    padding: 7,
    width: "100%",
    maxWidth: 470,
    borderRadius: 31,
    boxShadow: "0 8px 30px rgba(25,61,50,0.13)",
  },
  footer: { marginTop: 22 },
  toast: {
    position: "absolute",
    left: 22,
    right: 22,
    alignSelf: "center",
    maxWidth: 650,
    backgroundColor: c.green,
    padding: 15,
    borderRadius: 18,
    boxShadow: "0 4px 20px rgba(25,61,50,.2)",
  },
});
```

## تأكدي من فهمك

اختاري مقطعًا واشرحي مدخلاته ونتيجته وما الذي يغيّره. ثم اكتبي مثالًا أصغر بنفس الفكرة في مجلد تدريب، واذكري ما يجب اختباره قبل دمجه.
