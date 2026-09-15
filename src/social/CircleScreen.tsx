import { useCallback, useState } from "react";
import { Pressable, Share, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import {
  ArrowUpLeft,
  CalendarPlus,
  Crown,
  Link,
  Pin,
  Smile,
  UserRound,
} from "lucide-react-native";
import {
  Button,
  Chip,
  Empty,
  IconButton,
  Notice,
  Row,
  Sheet,
  T,
} from "../components/ui";
import { PreferencesForm } from "../components/PreferencesForm";
import { Toggle } from "../components/Toggle";
import { emptyPreferences, PUBLIC_ORIGIN } from "../api/client";
import { ar, colors as c } from "../theme";
import { social, type CircleMember } from "./client";
import { useRemote } from "./useRemote";
import {
  Confirm,
  type Confirmation,
  ErrorNotice,
  Field,
  Loading,
  Page,
  Panel,
  s,
} from "./ui";

export function CircleScreen({
  token,
  id,
  back,
  openOuting,
}: {
  token: string;
  id: string;
  back: () => void;
  openOuting: (id: string) => void;
}) {
  const read = useCallback(() => social.group(token, id), [token, id]);
  const r = useRemote(read);
  const group = r.data;
  const [profile, setProfile] = useState(false);
  const [invite, setInvite] = useState(false);
  const [copied, setCopied] = useState(false);
  const [create, setCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [slots, setSlots] = useState(3);
  const [editName, setEditName] = useState(false);
  const [member, setMember] = useState<CircleMember | null>(null);
  const [confirm, setConfirm] = useState<Confirmation | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const update = <R,>(operation: () => Promise<R>) => r.mutate(operation);
  const inviteUrl = group ? `${PUBLIC_ORIGIN}/join/${group.invite_code}` : "";
  return (
    <Page
      title={group?.title ?? "لَمّتنا"}
      subtitle="القروب ثابت. خططكم تتغيّر."
      back={back}
      action={
        group && (
          <Row>
            <Chip
              label={group.is_owner ? "مالك القروب" : "عضو في اللمّة"}
              icon={Crown}
            />
            <IconButton
              icon={Pin}
              active={group.pinned}
              label={group.pinned ? "إلغاء تثبيت القروب" : "تثبيت القروب"}
              onPress={() => {
                void update(() =>
                  social.options(token, id, { pinned: !group.pinned }),
                ).catch(() => {});
              }}
            />
          </Row>
        )
      }
    >
      <ErrorNotice
        error={r.error ?? localError}
        retry={() => {
          setLocalError(null);
          void r.refresh();
        }}
      />
      {r.loading && <Loading />}
      {group && (
        <>
          {group.archived ? (
            <Notice text="هذا القروب مؤرشف. الطلعات واللحظات محفوظة للقراءة." />
          ) : (
            <Panel glass>
              <Row>
                <View style={{ flex: 1 }}>
                  <T weight="semibold" style={s.heading}>
                    مين يطلع معنا اليوم؟
                  </T>
                  <T style={s.muted}>حدد الحاضرين، وخَلّ الباقي على حاتم.</T>
                </View>
                <CalendarPlus color={c.green} size={30} />
              </Row>
              <Button
                label="طلعة جديدة"
                icon={CalendarPlus}
                onPress={() => {
                  setTitle("");
                  setSlots(3);
                  setCreate(true);
                }}
              />
              <Button
                secondary
                label="اعزم الربع"
                icon={Link}
                onPress={() => {
                  setCopied(false);
                  setInvite(true);
                }}
              />
            </Panel>
          )}
          <T weight="semibold" style={s.heading}>
            طلعاتنا
          </T>
          {!group.outings.length && (
            <Empty
              icon={CalendarPlus}
              title="أول حكاية لسه قدّام"
              text="ابدأ طلعة واختر مين حاضر. كل طلعة لها خاناتها وركيزتها."
            />
          )}
          {group.outings.map((trip) => (
            <Pressable
              key={trip.id}
              accessibilityRole="button"
              accessibilityLabel={`افتح طلعة ${trip.title}`}
              onPress={() => openOuting(trip.id)}
            >
              <Panel>
                <Row>
                  <View style={{ flex: 1 }}>
                    <T weight="semibold" style={s.heading}>
                      {trip.title}
                    </T>
                    <T style={s.muted}>
                      {trip.status === "closed"
                        ? "طلعة محفوظة في الأرشيف"
                        : `${ar(trip.going)} حاضر · ${ar(trip.slots)} خانات`}
                    </T>
                  </View>
                  <ArrowUpLeft color={c.green} size={21} />
                </Row>
              </Panel>
            </Pressable>
          ))}
          <Row style={{ justifyContent: "space-between" }}>
            <T weight="semibold" style={s.heading}>
              أهل اللَمّة
            </T>
            <Chip
              label={`${ar(group.members.filter((m) => m.status === "active").length)} / ١٢`}
            />
          </Row>
          {group.members.map((person) => (
            <Panel key={person.id}>
              <Row>
                <UserRound size={22} color={c.green} />
                <View style={{ flex: 1 }}>
                  <T weight="semibold" style={{ fontSize: 19 }}>
                    {person.name}
                    {person.is_me ? " · أنت" : ""}
                  </T>
                  <T style={s.muted}>
                    {person.status === "removed"
                      ? "أُزيل من القروب"
                      : person.is_owner
                        ? "مالك القروب"
                        : !person.claimed
                          ? "عضو سابق · ينتظر ربط حسابه"
                          : "من أهل اللمّة"}
                  </T>
                </View>
                {person.is_me ? (
                  <Button
                    small
                    secondary
                    label="ذوقي"
                    disabled={group.archived}
                    onPress={() => setProfile(true)}
                  />
                ) : (
                  group.is_owner &&
                  !group.archived && (
                    <Button
                      small
                      secondary
                      label={`إدارة ${person.name}`}
                      onPress={() => setMember(person)}
                    />
                  )
                )}
              </Row>
              {person.preferences && (
                <View style={s.wrap}>
                  <Chip
                    label={`حتى ${ar(person.preferences.budget ?? 200)} ر.س`}
                  />
                  {person.preferences.vegetarian && <Chip label="نباتي" />}
                  {person.preferences.cuisines?.map((cuisine) => (
                    <Chip key={cuisine} label={cuisine} />
                  ))}
                  {person.preferences.allergies?.map((allergy) => (
                    <Chip key={allergy} label={`حساسية ${allergy}`} />
                  ))}
                </View>
              )}
            </Panel>
          ))}
          <Panel>
            <Row>
              <Smile color={c.green} size={24} />
              <View style={{ flex: 1 }}>
                <T weight="semibold">المزاح له مكان؟</T>
                <T style={s.muted}>
                  أوافق على «مقعد الاحتياط» ٣٠ ثانية. صوتي وقيودي تبقى محسوبة،
                  وأقدر أقفله فورًا.
                </T>
              </View>
              <Toggle
                testID="fun-opt-in"
                label="أوافق على المزاح في القروب"
                value={group.me.fun_opt_in}
                onValueChange={(value) => {
                  void update(() =>
                    social.options(token, id, { fun_opt_in: value }),
                  ).catch(() => {});
                }}
              />
            </Row>
          </Panel>
          {group.is_owner && !group.archived && (
            <View style={{ gap: 10 }}>
              <Button
                secondary
                label="تعديل اسم القروب"
                onPress={() => {
                  setTitle(group.title);
                  setEditName(true);
                }}
              />
              <Button
                secondary
                label="أرشفة القروب"
                onPress={() =>
                  setConfirm({
                    title: "نحفظ اللَمّة؟",
                    text: "تحتاج إغلاق طلعاته أولًا. يبقى القروب وذكرياته في الأرشيف.",
                    label: "أرشفة القروب",
                    run: () => update(() => social.archiveGroup(token, id)),
                  })
                }
              />
            </View>
          )}
          <Sheet
            title="ذوقك له مكان"
            visible={profile}
            onClose={() => setProfile(false)}
          >
            <PreferencesForm
              initial={group.me.preferences ?? emptyPreferences}
              busy={r.busy}
              onSave={async (p) => {
                await update(() => social.profile(token, id, p));
                setProfile(false);
              }}
            />
            <Notice text="تغيير ذوقك يعيد مراجعة جولات الاختيار في الطلعات المفتوحة التي تحضرها." />
          </Sheet>
          <Sheet
            title="لكم مكان على الطاولة"
            visible={invite}
            onClose={() => setInvite(false)}
          >
            <T style={s.subtitle}>
              الرابط يفتح بالمتصفح. يسجّل العضو دخوله ويكتب ذوقه، وتبقى عضويته
              للطلعات الجاية.
            </T>
            <T
              selectable
              style={{
                writingDirection: "ltr",
                textAlign: "left",
                fontSize: 12,
              }}
            >
              {inviteUrl}
            </T>
            <Button
              label={copied ? "تم نسخ الرابط" : "نسخ رابط القروب"}
              onPress={() => {
                void Clipboard.setStringAsync(inviteUrl)
                  .then(() => setCopied(true))
                  .catch(() =>
                    setLocalError("تعذّر النسخ. انسخ الرابط المحدد يدويًا."),
                  );
              }}
            />
            <Button
              secondary
              label="مشاركة الرابط"
              onPress={() => {
                void Share.share({
                  message: `لك مكان في ${group.title}: ${inviteUrl}`,
                  url: inviteUrl,
                }).catch(() => setLocalError("تعذّرت المشاركة."));
              }}
            />
          </Sheet>
          <Sheet
            title="طلعة على قدّ وقتكم"
            visible={create}
            onClose={() => {
              if (!r.busy) setCreate(false);
            }}
          >
            <Field
              label="اسم الطلعة"
              value={title}
              onChangeText={setTitle}
              maxLength={60}
              placeholder="عشاء الخميس"
            />
            <T weight="medium">كم خانة وجبات؟</T>
            <View style={s.wrap}>
              {[1, 3, 5, 9].map((n) => (
                <Chip
                  key={n}
                  label={n === 1 ? "عشاء واحد" : `${ar(n)} خانات`}
                  selected={slots === n}
                  onPress={() => setSlots(n)}
                />
              ))}
            </View>
            <Notice text="أنت حاضر كبداية. البقية يؤكدون حضورهم بأنفسهم، وذوق الغائب ما يقيّد هذه الطلعة." />
            <ErrorNotice error={localError ?? r.error} />
            <Button
              label="ابدأ الطلعة"
              busy={r.busy}
              onPress={() => {
                if (!title.trim()) {
                  setLocalError("اكتب اسم الطلعة.");
                  return;
                }
                void update(() =>
                  social.createOuting(token, id, title.trim(), slots),
                )
                  .then((trip) => {
                    setCreate(false);
                    openOuting(trip.id);
                  })
                  .catch(() => {});
              }}
            />
          </Sheet>
          <Sheet
            title="اسم يليق بلمّتكم"
            visible={editName}
            onClose={() => setEditName(false)}
          >
            <Field
              label="اسم القروب الجديد"
              value={title}
              onChangeText={setTitle}
              maxLength={60}
            />
            <Button
              label="حفظ الاسم"
              busy={r.busy}
              disabled={!title.trim()}
              onPress={() => {
                void update(() => social.rename(token, id, title.trim()))
                  .then(() => setEditName(false))
                  .catch(() => {});
              }}
            />
          </Sheet>
          <Sheet
            title={member?.name ?? "العضو"}
            visible={!!member}
            onClose={() => setMember(null)}
          >
            {member && (
              <>
                <Button
                  secondary
                  label={
                    member.status === "removed"
                      ? "إعادة العضو للقروب"
                      : "إزالة من القروب"
                  }
                  onPress={() => {
                    const selected = member;
                    setMember(null);
                    setConfirm({
                      title:
                        selected.status === "removed"
                          ? "نرجّع للّمّة؟"
                          : `إزالة ${selected.name}؟`,
                      text:
                        selected.status === "removed"
                          ? "يستعيد الوصول. يحتاج تأكيد حضوره للطلعات المفتوحة."
                          : "إزالة حقيقية: يفقد الوصول والتصويت، وتتراجع جولات الطلعات المتأثرة. تقدر تعيده من هذه القائمة.",
                      label:
                        selected.status === "removed"
                          ? "إعادة العضو"
                          : "تأكيد الإزالة",
                      run: () =>
                        update(() =>
                          selected.status === "removed"
                            ? social.restore(token, id, selected.id)
                            : social.remove(token, id, selected.id),
                        ),
                    });
                  }}
                />
                {member.claimed && member.status === "active" && (
                  <Button
                    secondary
                    label="نقل ملكية القروب إليه"
                    onPress={() => {
                      const selected = member;
                      setMember(null);
                      setConfirm({
                        title: "نقل الملكية",
                        text: `سيصبح ${selected.name} مالك القروب، وتصبح أنت عضوًا. قيادة الطلعات تبقى كما هي.`,
                        label: "نقل الملكية",
                        run: () =>
                          update(() => social.transfer(token, id, selected.id)),
                      });
                    }}
                  />
                )}
              </>
            )}
          </Sheet>
          <Confirm
            value={confirm}
            busy={r.busy}
            close={() => setConfirm(null)}
          />
        </>
      )}
    </Page>
  );
}
