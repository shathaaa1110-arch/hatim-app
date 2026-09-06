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
  const loadCatalog = async () => {
    try {
      setCatalog(await api.catalog());
      setCatalogError(null);
    } catch (e) {
      setCatalogError(e instanceof Error ? e.message : "تعذّر تحميل التجارب.");
    }
  };
  useEffect(() => {
    void loadCatalog();
  }, []);
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4500);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  const navigate = (next: Tab) => {
    setTab(next);
    scroll.current?.scrollTo({ y: 0, animated: false });
  };
  const update = async (settings: Settings) => {
    try {
      await organizer.settings(settings);
    } catch {
      /* Persistent error appears in the page. */
    }
  };
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

  if (loading)
    return (
      <View style={s.loading}>
        <Logo />
        <ActivityIndicator color={c.green} />
        <T style={{ color: c.muted }}>نرتّب اللَمّة…</T>
      </View>
    );
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
          {error && <Notice warning text={error} />}
          {catalogError && (
            <>
              <Notice warning text={catalogError} />
              <Button label="إعادة تحميل التجارب" onPress={loadCatalog} />
            </>
          )}
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
      {!wide && (
        <View style={[s.bottomWrap, { bottom: Math.max(14, insets.bottom) }]}>
          <Glass style={s.bottomNav}>{nav}</Glass>
        </View>
      )}
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
