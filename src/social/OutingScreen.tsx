import { useCallback, useEffect, useState } from "react";
import { Image, View } from "react-native";
import {
  Bookmark,
  Crown,
  Smile,
  Sparkles,
  UsersRound,
} from "lucide-react-native";
import { type Experience, type Group, type Settings } from "../api/client";
import { Button, Chip, Empty, Notice, Row, Sheet, T } from "../components/ui";
import { ExperienceCard } from "../components/ExperienceCard";
import { PlanScreen } from "../screens/PlanScreen";
import { ar, colors as c, photos } from "../theme";
import { social, type Outing } from "./client";
import { RoundPanel } from "./RoundPanel";
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

const attendanceNames = {
  going: "حاضر",
  pending: "لسه ما قررت",
  declined: "هالمرة بدونّي",
} as const;

function Bench({
  card,
  mine,
  busy,
  dismiss,
}: {
  card: Outing["cards"][number];
  mine: boolean;
  busy: boolean;
  dismiss: () => void;
}) {
  const [remaining, setRemaining] = useState(card.remaining_seconds);
  useEffect(() => {
    const expires = Date.now() + card.remaining_seconds * 1000;
    setRemaining(card.remaining_seconds);
    const interval = setInterval(
      () => setRemaining(Math.max(0, Math.ceil((expires - Date.now()) / 1000))),
      1000,
    );
    return () => clearInterval(interval);
  }, [card.remaining_seconds]);
  if (!remaining) return null;
  return (
    <Panel glass>
      <Row>
        <Smile size={28} color={c.coral} />
        <View style={{ flex: 1 }}>
          <T weight="semibold">{card.target_name} على مقعد الاحتياط 😄</T>
          <T style={s.muted}>
            {ar(remaining)} ثانية · صوته وذوقه ما زالا محسوبين.
          </T>
        </View>
      </Row>
      {mine && (
        <Button
          small
          secondary
          label="رجّعوني للملعب"
          disabled={busy}
          onPress={dismiss}
        />
      )}
    </Panel>
  );
}

export function OutingScreen({
  token,
  id,
  back,
}: {
  token: string;
  id: string;
  back: () => void;
}) {
  const read = useCallback(async () => {
    const [outing, catalog] = await Promise.all([
      social.outing(token, id),
      social.catalog(),
    ]);
    return { outing, catalog };
  }, [token, id]);
  const r = useRemote(read);
  const [tab, setTab] = useState("خطتنا");
  const [detail, setDetail] = useState<Experience | null>(null);
  const [confirm, setConfirm] = useState<Confirmation | null>(null);
  const [budget, setBudget] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const o = r.data?.outing;
  const catalog = r.data?.catalog ?? [];
  const me = o?.participants.find((p) => p.is_me);
  useEffect(
    () => setBudget(me?.budget_override?.toString() ?? ""),
    [me?.budget_override],
  );
  const update = (operation: () => Promise<Outing>) =>
    r.mutate(operation, (outing) => ({ outing, catalog }));
  const settings = async (value: Settings) => {
    if (!o) return;
    await update(() => social.settings(token, id, value, o.settings));
  };
  const safeSettings = async (value: Settings) => {
    try {
      await settings(value);
    } catch {
      /* shown by resource */
    }
  };
  const manage = !!o?.can_manage && o.status === "open";
  const attend = (value: "going" | "pending" | "declined") => {
    const parsed = budget.trim() ? Number(budget) : null;
    if (
      parsed !== null &&
      (!Number.isInteger(parsed) || parsed < 30 || parsed > 500)
    ) {
      setLocalError(
        "ميزانية الطلعة من ٣٠ إلى ٥٠٠ ريال، أو اتركها فارغة لاستخدام ذوقك المحفوظ.",
      );
      return;
    }
    setLocalError(null);
    void update(() => social.attendance(token, id, value, parsed)).catch(
      () => {},
    );
  };
  // PlanScreen only needs the plan and settings; membership remains in this screen.
  const planGroup: Group | null = o
    ? {
        id: o.id,
        title: o.title,
        invite_code: "",
        settings: o.settings,
        members: [],
        plan: o.plan,
      }
    : null;
  const pocket = o?.plan.pocket ?? [];
  const detailDecision =
    detail && o?.plan.selected.find((d) => d.experience_id === detail.id);
  const detailPocket =
    detail && pocket.find((d) => d.experience_id === detail.id);
  return (
    <Page
      title={o?.title ?? "طلعتنا"}
      subtitle={
        o
          ? `${o.status === "closed" ? "طلعة محفوظة" : "طلعة مفتوحة"} · ${ar(o.participants.filter((p) => p.attendance === "going").length)} حاضر · ${ar(o.settings.slots ?? 3)} خانات`
          : undefined
      }
      back={back}
    >
      <ErrorNotice
        error={r.error ?? localError}
        retry={() => {
          setLocalError(null);
          void r.refresh();
        }}
      />
      {r.loading && <Loading />}
      {o && (
        <>
          {o.status === "closed" && (
            <Notice text="حفظنا هذه الطلعة كما كانت. تغيير الأذواق لاحقًا ما يغيّر ذكرياتها." />
          )}
          {o.cards.map((card) => (
            <Bench
              key={card.target_id}
              card={card}
              mine={card.target_id === o.my_member_id}
              busy={r.busy}
              dismiss={() => {
                void update(() => social.dismissFun(token, id)).catch(() => {});
              }}
            />
          ))}
          {o.status === "open" && me?.attendance !== "going" && (
            <Panel>
              <T weight="semibold">لك مكان… بتجي؟</T>
              <T style={s.muted}>
                ذوقك ما يدخل في خطة هذه الطلعة حتى تؤكد حضورك.
              </T>
              <Button
                label="أنا حاضر"
                busy={r.busy}
                onPress={() => attend("going")}
              />
            </Panel>
          )}
          <View style={s.wrap}>
            {["خطتنا", "الاختيار", "الحضور", "اكتشف", "الجيب"].map((label) => (
              <Chip
                key={label}
                label={label}
                selected={tab === label}
                onPress={() => setTab(label)}
              />
            ))}
          </View>
          {tab === "خطتنا" && planGroup && (
            <PlanScreen
              group={planGroup}
              catalog={catalog}
              update={safeSettings}
              busy={r.busy}
              onOpen={setDetail}
              onPocket={() => setTab("الجيب")}
              readOnly={!manage}
            />
          )}
          {tab === "الاختيار" && (
            <RoundPanel
              outing={o}
              catalog={catalog}
              token={token}
              busy={r.busy}
              error={r.error}
              update={update}
            />
          )}
          {tab === "الحضور" && (
            <View style={{ gap: 18 }}>
              <Panel glass>
                <Row>
                  <UsersRound size={30} color={c.green} />
                  <View style={{ flex: 1 }}>
                    <T weight="semibold" style={s.heading}>
                      مين على الطاولة؟
                    </T>
                    <T style={s.muted}>
                      الحضور لهذه الطلعة فقط. الأعضاء الغائبون يبقون في القروب.
                    </T>
                  </View>
                </Row>
              </Panel>
              {me && o.status === "open" && (
                <Panel>
                  <T weight="semibold">حضوري وميزانيتي</T>
                  <View style={s.wrap}>
                    {Object.entries(attendanceNames).map(([value, label]) => (
                      <Chip
                        key={value}
                        label={label}
                        selected={me.attendance === value}
                        onPress={
                          r.busy
                            ? undefined
                            : () =>
                                attend(value as keyof typeof attendanceNames)
                        }
                      />
                    ))}
                  </View>
                  <Field
                    label="ميزانية هذه الطلعة فقط"
                    value={budget}
                    onChangeText={setBudget}
                    keyboardType="number-pad"
                    maxLength={3}
                    placeholder={`المحفوظة: ${ar(me.preferences?.budget ?? 200)} ر.س`}
                  />
                  <T style={s.muted}>
                    اتركها فارغة لاستخدام ميزانيتك المحفوظة. تغيير الحضور أو
                    الميزانية يعيد مراجعة جولة الاختيار.
                  </T>
                  <Button
                    secondary
                    label="حفظ ميزانية الطلعة"
                    busy={r.busy}
                    onPress={() => attend(me.attendance)}
                  />
                </Panel>
              )}
              {o.participants.map((person) => (
                <Panel key={person.member_id}>
                  <Row>
                    <View style={{ flex: 1 }}>
                      <T weight="semibold" style={{ fontSize: 20 }}>
                        {person.name}
                        {person.is_me ? " · أنت" : ""}
                      </T>
                      <T style={s.muted}>
                        {attendanceNames[person.attendance]}
                        {person.is_coordinator ? " · قائد الطلعة" : ""}
                        {!person.claimed ? " · ينتظر ربط الحساب" : ""}
                      </T>
                    </View>
                    {person.is_coordinator && (
                      <Crown color={c.green} size={22} />
                    )}
                  </Row>
                  {person.preferences && (
                    <View style={s.wrap}>
                      <Chip
                        label={`حتى ${ar(person.preferences.budget ?? 200)} ر.س`}
                      />
                      {person.preferences.vegetarian && <Chip label="نباتي" />}
                      {person.preferences.allergies?.map((allergy) => (
                        <Chip key={allergy} label={`حساسية ${allergy}`} />
                      ))}
                      {person.preferences.cuisines?.map((cuisine) => (
                        <Chip key={cuisine} label={cuisine} />
                      ))}
                    </View>
                  )}
                  {o.is_owner &&
                    manage &&
                    person.attendance === "going" &&
                    person.claimed &&
                    !person.is_coordinator && (
                      <Button
                        small
                        secondary
                        label={`قيادة الطلعة لـ${person.name}`}
                        onPress={() =>
                          setConfirm({
                            title: "نغيّر قائد الطلعة؟",
                            text: `${person.name} يقدر يعدّل الخطة ويدير جولة الاختيار. ملكية القروب تبقى كما هي.`,
                            label: "تعيين القائد",
                            run: () =>
                              update(() =>
                                social.coordinator(token, id, person.member_id),
                              ),
                          })
                        }
                      />
                    )}
                  {o.status === "open" &&
                    me?.attendance === "going" &&
                    me.fun_opt_in &&
                    person.attendance === "going" &&
                    person.fun_opt_in &&
                    !person.is_me &&
                    !person.fun_used && (
                      <Button
                        small
                        secondary
                        label={`مقعد الاحتياط لـ${person.name} 😄`}
                        icon={Smile}
                        busy={r.busy}
                        onPress={() => {
                          void update(() =>
                            social.fun(token, id, person.member_id),
                          ).catch(() => {});
                        }}
                      />
                    )}
                </Panel>
              ))}
              <Notice text="الأذواق التفصيلية تظهر لصاحبها ومالك القروب وقائد الطلعة. فعّل المزاح من صفحة القروب إذا ودّك تشارك." />
              {manage && (
                <Button
                  secondary
                  label="إنهاء الطلعة وحفظها"
                  onPress={() =>
                    setConfirm({
                      title: "نحفظ حكاية الطلعة؟",
                      text: "تُقفل التعديلات والتصويت، ونحفظ الخطة وأذواق الحاضرين كما هي. للمرّة الجاية افتح طلعة جديدة.",
                      label: "إنهاء وحفظ",
                      run: () => update(() => social.closeOuting(token, id)),
                    })
                  }
                />
              )}
            </View>
          )}
          {tab === "اكتشف" && (
            <View style={{ gap: 18 }}>
              <T weight="semibold" style={s.heading}>
                شيء يستاهل اللَمّة
              </T>
              <T style={s.muted}>
                كل تجربة لها لحظة. افتحها وشوف مكانها في خطّتكم.
              </T>
              {catalog.map((e) => (
                <ExperienceCard
                  key={e.id}
                  experience={e}
                  onOpen={() => setDetail(e)}
                  priority={
                    o.plan.selected.find((d) => d.experience_id === e.id)
                      ?.priority
                  }
                />
              ))}
            </View>
          )}
          {tab === "الجيب" && (
            <View style={{ gap: 18 }}>
              <T weight="semibold" style={s.heading}>
                اللي خرج ما ضاع.
              </T>
              {!pocket.length && (
                <Empty
                  icon={Bookmark}
                  title="الجيب ينتظر طموحكم"
                  text="التجارب المؤجلة تظهر هنا مع سبب تأجيلها."
                />
              )}
              {pocket.map((item) => {
                const e = catalog.find((x) => x.id === item.experience_id);
                return e ? (
                  <View key={e.id} style={{ gap: 9 }}>
                    <ExperienceCard
                      experience={e}
                      compact
                      onOpen={() => setDetail(e)}
                    />
                    <Notice warning={item.blocked} text={item.reason} />
                  </View>
                ) : null;
              })}
            </View>
          )}
          <Sheet
            title={detail?.title ?? "التجربة"}
            visible={!!detail}
            onClose={() => setDetail(null)}
          >
            {detail && (
              <>
                <Image
                  source={photos[detail.image]}
                  style={{ width: "100%", height: 210, borderRadius: 22 }}
                />
                <T style={s.muted}>
                  {detail.venue} · {detail.cuisine} · {ar(detail.price)} ر.س
                  للشخص
                </T>
                <T style={{ lineHeight: 28 }}>{detail.description}</T>
                <Notice
                  text={
                    detailDecision?.reason ?? detailPocket?.reason ?? detail.why
                  }
                  warning={detailPocket?.blocked}
                />
                {detailDecision?.adaptations?.map((text) => (
                  <Notice key={text} text={text} />
                ))}
                {manage &&
                  !(o.settings.completed_ids ?? []).includes(detail.id) && (
                    <>
                      <Button
                        icon={Sparkles}
                        label={
                          o.settings.anchor_id === detail.id
                            ? "هذه ركيزتكم"
                            : "اختيارها ركيزة يدويًا"
                        }
                        disabled={
                          r.busy ||
                          o.settings.anchor_id === detail.id ||
                          !o.eligible_ids.includes(detail.id)
                        }
                        onPress={() => {
                          const e = detail;
                          setDetail(null);
                          setConfirm({
                            title: "نغيّر الركيزة؟",
                            text: `ستصبح «${e.title}» ركيزة الطلعة باختيار القائد. تُلغى صلاحية جولة التصويت السابقة، ويظهر السبب للجميع.`,
                            label: "اعتماد الركيزة",
                            run: () =>
                              settings({ ...o.settings, anchor_id: e.id }),
                          });
                        }}
                      />
                      {o.settings.anchor_id !== detail.id && (
                        <Button
                          secondary
                          icon={Bookmark}
                          busy={r.busy}
                          label={
                            (o.settings.pocket_ids ?? []).includes(detail.id)
                              ? "إرجاعها للاختيارات"
                              : "حفظها في الجيب"
                          }
                          onPress={() => {
                            const ids = o.settings.pocket_ids ?? [];
                            void settings({
                              ...o.settings,
                              pocket_ids: ids.includes(detail.id)
                                ? ids.filter((x) => x !== detail.id)
                                : [...ids, detail.id],
                            })
                              .then(() => setDetail(null))
                              .catch(() => {});
                          }}
                        />
                      )}
                    </>
                  )}
                <ErrorNotice error={r.error} />
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
