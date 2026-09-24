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
import { type Experience, type Group } from "../../shared/contracts";
import { ar, colors as c, fonts, photos } from "../../shared/theme";
import { Button, Chip, Empty, Glass, Row, T } from "../../shared/ui/primitives";
import { ExperienceCard } from "./ExperienceCard";

export function Discover({
  catalog,
  group,
  onOpen,
  onSave,
  onPlan,
  onGroup,
  onQuick,
}: {
  catalog: Experience[];
  group: Group | null;
  onOpen: (e: Experience) => void;
  onSave: (e: Experience) => void;
  onPlan: () => void;
  onGroup: () => void;
  onQuick: () => void;
}) {
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
  const pocketIds = new Set(
    group?.plan.pocket.map((x) => x.experience_id) ?? [],
  );
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
              تجربتك الجاية تبدأ من هنا
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
            تجارب أكل مختارة، وخطة تراعي الذوق والقيود. من تسع وجبات إلى عشاء
            واحد، تعرف وش يبقى وليش.
          </T>
          <View style={{ alignSelf: "flex-end", marginTop: 9 }}>
            <Button
              label={group ? "نشوف خطّتنا" : "ابدأ خطتك"}
              onPress={onPlan}
            />
          </View>
          <Button secondary label="وش يناسبني الحين؟" onPress={onQuick} />
          {wide && (
            <Row style={{ marginTop: 21, gap: 7 }}>
              <Check size={15} color={c.green} />
              <T style={s.eyebrow}>مختارة بعناية، مو قائمة ما تخلص.</T>
            </Row>
          )}
        </View>
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
      {group && (
        <Pressable
          onPress={onGroup}
          accessibilityRole="button"
          accessibilityLabel="رفقة هذه الطلعة"
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
      )}
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
                  group?.plan.selected.find((d) => d.experience_id === e.id)
                    ?.priority
                }
              />
            </View>
          ))}
        </View>
        {filtered.length === 0 && (
          <Empty
            icon={Search}
            title="ما لقيناها هالمرة"
            text="جرّب كلمة ثانية أو وسّع نوع التجربة."
          />
        )}
      </View>
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
