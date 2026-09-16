# شرح `src/screens/Discover.tsx`

[فهرس الكود](README.ar.md) · [دروس البداية](../README.ar.md) · [قاموس الرموز](../01-foundations.ar.md) · [التنسيق](../08-components.ar.md)

المصدر: [الملف في النسخة المرجعية](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/Discover.tsx) · [خريطة الملفات الحالية](../../architecture-modules.ar.md). عدد الأسطر: 381. المقاطع التالية تعرض المصدر نفسه دون تعديل، والشرح خارج الكود.

## مدخلات الاكتشاف

[الأسطر 1–25](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/Discover.tsx#L1): الاستيرادات توفر الصورة والتدرج والبحث والبطاقات. الشاشة لا تملك اتصال SQL أو خوارزمية ترتيب المجموعة.

```tsx
import { useState } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  ArrowLeft,
  ArrowUpLeft,
  Bookmark,
  Check,
  MapPin,
  Search,
  Sparkles,
  Users,
} from "lucide-react-native";
import { type Experience, type Group } from "../api/client";
import { ar, colors as c, fonts, photos } from "../theme";
import { Button, Chip, Empty, Glass, Row, T } from "../components/ui";
import { ExperienceCard } from "../components/ExperienceCard";

```

## العقد

[الأسطر 26–40](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/Discover.tsx#L26): catalog و group تأتيان من Organizer. callbacks هي onOpen و onSave و onPlan و onGroup: فتح تفاصيل وحفظ في الجيب والذهاب للخطة أو المجموعة. لا callback لتغيير الخانات مباشرة في Discover.

```tsx
export function Discover({
  catalog,
  group,
  onOpen,
  onSave,
  onPlan,
  onGroup,
}: {
  catalog: Experience[];
  group: Group;
  onOpen: (e: Experience) => void;
  onSave: (e: Experience) => void;
  onPlan: () => void;
  onGroup: () => void;
}) {
```

## فلترة العرض

[الأسطر 41–53](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/Discover.tsx#L41): search و category حالتان محليتان. hero تختار fire أو أول تجربة. filtered تطابق category والنص داخل العنوان والمكان والمطبخ والحي. pocketIds Set من plan.pocket المشتقة، لا settings.pocket_ids اليدوية وحدها. البحث يغير العرض فقط.

```tsx
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const [category, setCategory] = useState("الكل");
  const [search, setSearch] = useState("");
  const hero = catalog.find((e) => e.id === "fire") ?? catalog[0];
  const filtered = catalog.filter(
    (e) =>
      (category === "الكل" || e.category === category) &&
      `${e.title} ${e.venue} ${e.cuisine} ${e.neighborhood}`.includes(
        search.trim(),
      ),
  );
  const pocketIds = new Set(group.plan.pocket.map((x) => x.experience_id));
```

## مقدمة الصفحة

[الأسطر 54–95](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/Discover.tsx#L54): التخطيط يجمع نص الفكرة وإجراء الانتقال للخطة. wide يختار توزيعًا بجانب الصورة أو فوقها.

```tsx
  return (
    <View style={{ gap: wide ? 35 : 26 }}>
      <View
        style={[
          s.heroLayout,
          wide && { flexDirection: "row-reverse", gap: 45 },
        ]}
      >
        <View
          style={[s.heroCopy, wide && { width: "42%", paddingVertical: 30 }]}
        >
          <Row style={{ gap: 7 }}>
            <View style={s.dot} />
            <T weight="medium" style={s.eyebrow}>
              لَمّة حلوة تبدأ من هنا
            </T>
          </Row>
          <View>
            <T weight="semibold" style={[s.headline, wide && s.wideHeadline]}>
              الطعم يبقى.
            </T>
            <T
              weight="semibold"
              style={[s.headline, { color: c.coral }, wide && s.wideHeadline]}
            >
              والخطة تتغيّر.
            </T>
          </View>
          <T style={[s.intro, wide && { fontSize: 16, lineHeight: 29 }]}>
            تجارب تستاهل لَمّتكم. نرتّبها على ذوق كل واحد، وعلى قدّ الوقت اللي
            عندكم.
          </T>
          <View style={{ alignSelf: "flex-end", marginTop: 9 }}>
            <Button label="نشوف خطّتنا" onPress={onPlan} />
          </View>
          {wide && (
            <Row style={{ marginTop: 21, gap: 7 }}>
              <Check size={15} color={c.green} />
              <T style={s.eyebrow}>مختارة بعناية، مو قائمة ما تخلص.</T>
            </Row>
          )}
        </View>
```

## الصورة والبطاقة العائمة

[الأسطر 96–154](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/Discover.tsx#L96): Image مع LinearGradient والزخارف تبني مقدمة العرض. النص والرتبة العائمة تستخدم معلومات التجربة/المجموعة المتاحة، وليست حسابًا آخر للنقاط.

```tsx
        {hero && (
          <Pressable
            onPress={() => onOpen(hero)}
            accessibilityRole="button"
            accessibilityLabel="اكتشف تجربة على الحطب"
            style={[s.heroPhoto, wide && { flex: 1, height: 430 }]}
          >
            <Image
              source={photos.fire}
              style={[
                StyleSheet.absoluteFill,
                { width: "100%", height: "100%" },
              ]}
              resizeMode="cover"
            />
            <LinearGradient
              colors={[
                "rgba(10,27,19,.04)",
                "rgba(10,27,19,.12)",
                "rgba(10,27,19,.83)",
              ]}
              locations={[0, 0.35, 1]}
              style={StyleSheet.absoluteFill}
            />
            <Glass style={s.editorPill}>
              <Sparkles size={14} color={c.ink} />
              <T weight="medium" style={{ fontSize: 12 }}>
                من اختيارات حاتم
              </T>
            </Glass>
            <View style={s.photoCaption}>
              <Row style={{ gap: 6 }}>
                <MapPin size={13} color="#E3E9DF" />
                <T style={{ color: "#E3E9DF", fontSize: 12 }}>
                  الرياض · حي حطين
                </T>
              </Row>
              <T
                weight="semibold"
                style={{
                  color: c.white,
                  fontSize: wide ? 33 : 29,
                  lineHeight: 45,
                }}
              >
                على مهل… وعلى الحطب
              </T>
              <Row style={{ justifyContent: "space-between" }}>
                <T style={{ color: "#E1E5D9", fontSize: 13 }}>
                  مائدة تجمعكم، ولحظة ما تتكرر.
                </T>
                <View style={s.photoArrow}>
                  <ArrowUpLeft size={21} color={c.white} />
                </View>
              </Row>
            </View>
          </Pressable>
        )}
      </View>
```

## شريط المجموعة

[الأسطر 155–204](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/Discover.tsx#L155): نعرض أسماء أو أحرف الأعضاء وعددهم وإجراء الدعوة. هذه قراءة من GroupView وقد تتحدث عبر polling.

```tsx
      <Pressable
        onPress={onGroup}
        accessibilityRole="button"
        accessibilityLabel="إدارة مجموعتنا"
        style={[s.groupStrip, !wide && { padding: 17 }]}
      >
        <Row style={{ flex: 1, gap: 14 }}>
          <View style={s.avatars}>
            {group.members.slice(0, 3).map((member, index) => (
              <View
                key={member.id}
                style={[
                  s.avatar,
                  {
                    backgroundColor: ["#DDE6D6", "#E8DACE", "#E0E5EC"][index],
                    marginLeft: index ? -10 : 0,
                    zIndex: 3 - index,
                  },
                ]}
              >
                <T weight="medium" style={{ fontSize: 17 }}>
                  {member.preferences.name[0]}
                </T>
              </View>
            ))}
            <View
              style={[s.avatar, { backgroundColor: c.white, marginLeft: -8 }]}
            >
              <Users size={16} color={c.green} />
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <T weight="semibold" style={{ fontSize: 15 }}>
              كل ذوق له مكان على الطاولة
            </T>
            <T style={s.eyebrow}>
              {ar(group.members.length)} في اللَمّة ·{" "}
              {ar(group.settings.slots ?? 9)} خانات وجبات
            </T>
          </View>
        </Row>
        <Row>
          {wide && (
            <T weight="medium" style={{ fontSize: 13 }}>
              اعزم الربع
            </T>
          )}
          <ArrowLeft size={19} color={c.green} />
        </Row>
      </Pressable>
```

## عنوان نتائج الاكتشاف

[الأسطر 205–230](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/Discover.tsx#L205): عنوان ونص يشرحان التنسيق المختار. العدد يتبع البيانات المعروضة.

```tsx
      <View style={{ gap: 19 }}>
        <Row style={{ justifyContent: "space-between" }}>
          <View>
            <Row style={{ gap: 8 }}>
              <T weight="semibold" style={{ fontSize: wide ? 28 : 25 }}>
                شيء يستاهل التجربة
              </T>
              <Sparkles size={19} color={c.coral} />
            </Row>
            <T style={{ color: c.muted, fontSize: 12, marginTop: 4 }}>
              مو بس وين ناكل… وش بنعيش؟
            </T>
          </View>
          <T style={{ fontSize: 12, color: c.muted }}>
            {ar(catalog.length)} تجارب
          </T>
        </Row>
        <View
          style={[
            s.filters,
            wide && {
              flexDirection: "row-reverse",
              justifyContent: "space-between",
            },
          ]}
        >
```

## فلاتر الفئات

[الأسطر 231–242](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/Discover.tsx#L231): map ترسم الخيارات. setCategory تعيد العرض بقائمة مصفاة؛ لا تحذف التجارب من الكتالوج.

```tsx
          <View style={s.categories}>
            {["الكل", "مطابخ جديدة", "كنوز مخفية", "افتتاحات", "طبق ولحظة"].map(
              (item) => (
                <Chip
                  key={item}
                  label={item}
                  selected={category === item}
                  onPress={() => setCategory(item)}
                />
              ),
            )}
          </View>
```

## حقل البحث

[الأسطر 243–254](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/Discover.tsx#L243): TextInput تربط search بالنص. setSearch تعيد حساب filter داخل المكوّن دون طلب شبكة لكل حرف.

```tsx
          <Row style={[s.search, wide && { width: 215 }]}>
            <Search size={16} color={c.muted} />
            <TextInput
              accessibilityLabel="ابحث عن تجربة"
              placeholder="وش خاطرك فيه؟"
              placeholderTextColor={c.muted}
              value={search}
              onChangeText={setSearch}
              style={s.searchInput}
            />
          </Row>
        </View>
```

## شبكة البطاقات

[الأسطر 255–275](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/Discover.tsx#L255): map ترسم ExperienceCard بمفتاح ثابت هو id. العرض يتكيف مع wide. onOpen و onSave تربطان البطاقة بإجراءات الأب.

```tsx
        <View style={[s.grid, { gap: wide ? 23 : 18 }]}>
          {filtered.map((e) => (
            <View
              key={e.id}
              style={{
                width: wide ? "31.9%" : width >= 600 ? "48.4%" : "100%",
              }}
            >
              <ExperienceCard
                experience={e}
                onOpen={() => onOpen(e)}
                onSave={() => onSave(e)}
                saved={pocketIds.has(e.id)}
                priority={
                  group.plan.selected.find((d) => d.experience_id === e.id)
                    ?.priority
                }
              />
            </View>
          ))}
        </View>
```

## لا نتائج

[الأسطر 276–283](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/Discover.tsx#L276): حالة Empty تشرح غياب المطابقة. البيانات قد تكون موجودة لكن الفلتر لا يطابقها؛ لذلك لا نعرض خطأ خادم.

```tsx
        {filtered.length === 0 && (
          <Empty
            icon={Search}
            title="ما لقيناها هالمرة"
            text="جرّب كلمة ثانية أو وسّع نوع التجربة."
          />
        )}
      </View>
```

## رسالة الفلسفة

[الأسطر 284–296](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/Discover.tsx#L284): نص ثابت يفسر حفظ الطموح. ليس تطبيقًا لخوارزمية؛ الخوارزمية في planner.py.

```tsx
      <View style={s.philosophy}>
        <Bookmark size={24} color={c.green} strokeWidth={1.5} />
        <T weight="semibold" style={{ fontSize: 22, textAlign: "center" }}>
          اللي ما لحقنا عليه، ينتظرنا.
        </T>
        <T style={{ color: c.muted, textAlign: "center", lineHeight: 25 }}>
          الجيب يحفظ الطموح. بلا استعجال، وبلا إحساس إنك فوّت شيء.
        </T>
      </View>
    </View>
  );
}

```

## التنسيق البصري

[الأسطر 297–381](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/Discover.tsx#L297): التنسيق يغطي البطل البصري والصور وشريط الأعضاء والبحث وشبكة البطاقات. النسب والأبعاد تحدد ترتيب العرض. كل خاصية تنسيق مشروحة في جدول الدرس 08. الكائنات هنا أسماء أنماط نمررها إلى style؛ لا ترسل طلبات ولا تعدل DB. ترتيب مصفوفة style يسمح للخصائص اللاحقة بتعديل الأساسية.

```tsx
const s = StyleSheet.create({
  heroLayout: { gap: 23 },
  heroCopy: { gap: 10 },
  dot: { width: 6, height: 6, backgroundColor: c.coral, borderRadius: 3 },
  eyebrow: { color: c.muted, fontSize: 12, lineHeight: 23 },
  headline: { fontSize: 42, lineHeight: 61, letterSpacing: -0.7 },
  wideHeadline: { fontSize: 55, lineHeight: 79 },
  intro: { color: "#758078", fontSize: 14, lineHeight: 26 },
  heroPhoto: {
    width: "100%",
    height: 300,
    borderRadius: 29,
    overflow: "hidden",
    backgroundColor: c.sage,
  },
  editorPill: {
    backgroundColor: "rgba(255,255,255,0.82)",
    position: "absolute",
    top: 20,
    right: 20,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 18,
  },
  photoCaption: {
    position: "absolute",
    right: 25,
    left: 25,
    bottom: 24,
    gap: 5,
  },
  photoArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  groupStrip: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: c.line,
    backgroundColor: "#F0F3EB",
    paddingHorizontal: 25,
    paddingVertical: 19,
  },
  avatars: { flexDirection: "row-reverse" },
  avatar: {
    width: 39,
    height: 39,
    borderRadius: 21,
    borderWidth: 2,
    borderColor: "#F0F3EB",
    alignItems: "center",
    justifyContent: "center",
  },
  filters: { gap: 15 },
  categories: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 },
  search: {
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 22,
    paddingHorizontal: 15,
    minHeight: 44,
    backgroundColor: c.white,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.regular,
    color: c.ink,
    fontSize: 12,
    textAlign: "right",
    minHeight: 42,
  },
  grid: { flexDirection: "row-reverse", flexWrap: "wrap" },
  philosophy: { marginTop: 7, padding: 25, alignItems: "center", gap: 10 },
});
```

## تأكدي من فهمك

اختاري مقطعًا واشرحي مدخلاته ونتيجته وما الذي يغيّره. ثم اكتبي مثالًا أصغر بنفس الفكرة في مجلد تدريب، واذكري ما يجب اختباره قبل دمجه.
