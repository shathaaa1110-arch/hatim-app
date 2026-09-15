import { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Platform,
  View,
} from "react-native";
import { Check, Dices, Vote } from "lucide-react-native";
import type { Experience } from "../api/client";
import { Button, Chip, Notice, Row, Sheet, T } from "../components/ui";
import { ar, colors as c } from "../theme";
import { social, type Outing } from "./client";
import { Confirm, type Confirmation, ErrorNotice, Panel, s } from "./ui";

export function RoundPanel({
  outing: o,
  catalog,
  token,
  busy,
  error,
  update,
}: {
  outing: Outing;
  catalog: Experience[];
  token: string;
  busy: boolean;
  error: string | null;
  update: (operation: () => Promise<Outing>) => Promise<Outing>;
}) {
  const [creating, setCreating] = useState(false);
  const [mode, setMode] = useState<"vote" | "draw">("vote");
  const [choices, setChoices] = useState<string[]>([]);
  const [confirm, setConfirm] = useState<Confirmation | null>(null);
  const [spinning, setSpinning] = useState(false);
  const rotation = useRef(new Animated.Value(0)).current;
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      rotation.stopAnimation();
    };
  }, [rotation]);
  const round = o.round;
  const manage = o.can_manage && o.status === "open";
  const name = (id: string) => catalog.find((e) => e.id === id)?.title ?? id;
  const drawing = async () => {
    if (!round || spinning) return;
    setSpinning(true);
    const reduced = await AccessibilityInfo.isReduceMotionEnabled().catch(
      () => true,
    );
    rotation.setValue(0);
    const animation = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: Platform.OS !== "web",
      }),
    );
    if (!reduced) animation.start();
    try {
      await update(() => social.draw(token, round.id));
    } finally {
      animation.stop();
      if (alive.current) setSpinning(false);
    }
  };
  return (
    <View style={{ gap: 18 }}>
      <Panel glass>
        <Row>
          <Vote color={c.green} size={30} />
          <View style={{ flex: 1 }}>
            <T weight="semibold" style={s.heading}>
              اختياركم له كلمة.
            </T>
            <T style={s.muted}>
              التصويت أو القرعة يحدد الركيزة. حاتم يرتّب الباقي حسب ذوق الحاضرين
              وخاناتكم.
            </T>
          </View>
        </Row>
      </Panel>
      {round?.status === "invalidated" && (
        <Notice
          warning
          text="تغيّرت معطيات الاختيار أو أُلغيت الجولة. النتيجة السابقة محفوظة، وتحتاج جولة جديدة إذا تبغون حسمًا جديدًا. الركيزة الحالية لم تُستبدل تلقائيًا."
        />
      )}
      {round && round.status !== "invalidated" && (
        <Panel>
          <Row>
            <Chip
              label={round.mode === "vote" ? "تصويت القروب" : "قرعة مشتركة"}
            />
            <Chip
              label={
                round.status === "resolved"
                  ? "اختيار محفوظ"
                  : round.status === "tied"
                    ? "تعادل"
                    : "الجولة مفتوحة"
              }
            />
          </Row>
          {round.mode === "vote" && (
            <T style={s.muted}>
              {ar(round.voted_count)} من {ar(round.voter_count)} صوّتوا ·{" "}
              {round.status === "open"
                ? "تقدر تغيّر صوتك حتى إغلاق الجولة."
                : "الجولة مغلقة."}
            </T>
          )}
          {round.options.map((option) => (
            <View key={option.experience_id} style={{ gap: 6 }}>
              <Button
                secondary={
                  !round.can_vote || round.my_vote !== option.experience_id
                }
                label={`${name(option.experience_id)}${round.mode === "vote" ? ` · ${ar(option.votes)} أصوات` : ""}`}
                icon={
                  round.my_vote === option.experience_id ? Check : undefined
                }
                disabled={!round.can_vote || busy}
                onPress={() => {
                  void update(() =>
                    social.vote(token, round.id, option.experience_id),
                  ).catch(() => {});
                }}
              />
            </View>
          ))}
          {round.can_vote && round.my_vote && (
            <Button
              small
              secondary
              label="سحب صوتي"
              disabled={busy}
              onPress={() => {
                void update(() => social.withdraw(token, round.id)).catch(
                  () => {},
                );
              }}
            />
          )}
          {round.status === "tied" && (
            <Notice text="تساوت أعلى الأصوات. القرعة بين المتعادلين فقط، والأصوات الآن مغلقة." />
          )}
          {round.status === "resolved" && round.result_id && !spinning && (
            <View accessibilityLiveRegion="polite" style={{ gap: 9 }}>
              <T weight="bold" style={[s.heading, { color: c.green }]}>
                ركيزتكم: {name(round.result_id)}
              </T>
              <T style={s.muted}>
                {round.resolved_by === "vote"
                  ? "فازت بأعلى عدد من الأصوات."
                  : round.resolved_by === "only_option"
                    ? "هذا الخيار الوحيد في الجولة."
                    : "نتيجة قرعة واحدة محفوظة لكل القروب."}{" "}
                تغيير عدد الخانات يحافظ على الاختيار.
              </T>
            </View>
          )}
          {spinning && (
            <View style={{ alignItems: "center", gap: 12 }}>
              <Animated.View
                style={{
                  transform: [
                    {
                      rotate: rotation.interpolate({
                        inputRange: [0, 1],
                        outputRange: ["0deg", "360deg"],
                      }),
                    },
                  ],
                }}
              >
                <Dices size={58} color={c.green} />
              </Animated.View>
              <T>نحسم اختيار اللمّة…</T>
            </View>
          )}
          {manage && round.status === "open" && round.mode === "vote" && (
            <Button
              label="إغلاق التصويت واعتماد النتيجة"
              disabled={round.voted_count === 0}
              busy={busy}
              onPress={() =>
                setConfirm({
                  title: "نعتمد اختياركم؟",
                  text: `صوّت ${ar(round.voted_count)} من ${ar(round.voter_count)}. الفائز يصير الركيزة بدل الاختيار الحالي. التعادل يحتاج قرعة منفصلة.`,
                  label: "إغلاق واعتماد",
                  run: () => update(() => social.resolve(token, round.id)),
                })
              }
            />
          )}
          {manage &&
            (round.status === "tied" ||
              (round.status === "open" && round.mode === "draw")) && (
              <Button
                label={
                  round.options.length === 1
                    ? "اعتماد الخيار الوحيد"
                    : "لفّ القرعة"
                }
                icon={Dices}
                busy={busy || spinning}
                onPress={() =>
                  setConfirm({
                    title: "الحظ يختار من المناسب",
                    text: "كل خيار مشارك له فرصة متساوية. النتيجة ستُحفظ وتصبح ركيزة الطلعة للجميع.",
                    label: "اعتمد القرعة",
                    run: drawing,
                  })
                }
              />
            )}
          {manage && ["open", "tied"].includes(round.status) && (
            <Button
              secondary
              label="إلغاء هذه الجولة"
              disabled={busy}
              onPress={() =>
                setConfirm({
                  title: "إلغاء الجولة؟",
                  text: "نوقف التصويت ونحتفظ بسجله. تقدر تبدأ جولة جديدة بعدها.",
                  label: "إلغاء الجولة",
                  run: () => update(() => social.cancel(token, round.id)),
                })
              }
            />
          )}
        </Panel>
      )}
      {manage &&
        (!round || ["resolved", "invalidated"].includes(round.status)) && (
          <>
            <Button
              label={round ? "جولة اختيار جديدة" : "نختار ركيزتنا مع بعض"}
              icon={Vote}
              disabled={!o.eligible_ids.length || o.plan.available === 0}
              onPress={() => {
                setChoices(o.eligible_ids.slice(0, 3));
                setCreating(true);
              }}
            />
            {(!o.eligible_ids.length || o.plan.available === 0) && (
              <Notice text="نحتاج حاضرًا وخانة متبقية وتجربة مناسبة خارج الجيب لبدء الاختيار." />
            )}
          </>
        )}
      {!round && !manage && (
        <Notice text="قائد الطلعة يفتح جولة التصويت أو القرعة بعد تأكيد حضوركم." />
      )}
      <Sheet
        title="وش ندخل في الاختيار؟"
        visible={creating}
        onClose={() => {
          if (!busy) setCreating(false);
        }}
      >
        <Row>
          <Chip
            label="تصويت"
            selected={mode === "vote"}
            onPress={() => setMode("vote")}
          />
          <Chip
            label="قرعة"
            selected={mode === "draw"}
            onPress={() => setMode("draw")}
          />
        </Row>
        <T style={s.muted}>
          من تجربة إلى ٥. تظهر التجارب المتوافقة مع الحاضرين فقط. تأكدوا أن كل
          حاضر ربط حسابه أولًا.
        </T>
        <View style={{ gap: 10 }}>
          {o.eligible_ids.map((id) => (
            <Chip
              key={id}
              label={name(id)}
              selected={choices.includes(id)}
              onPress={() =>
                setChoices((previous) =>
                  previous.includes(id)
                    ? previous.filter((x) => x !== id)
                    : previous.length < 5
                      ? [...previous, id]
                      : previous,
                )
              }
            />
          ))}
        </View>
        <Notice text="الجولة الجديدة تستبدل الجولة السابقة. الركيزة تبقى حتى تعتمدون نتيجة جديدة." />
        <ErrorNotice error={error} />
        <Button
          label="افتح الجولة"
          busy={busy}
          disabled={choices.length === 0}
          onPress={() => {
            void update(() => social.round(token, o.id, mode, choices))
              .then(() => setCreating(false))
              .catch(() => {});
          }}
        />
      </Sheet>
      <Confirm
        value={confirm}
        busy={busy || spinning}
        close={() => setConfirm(null)}
      />
    </View>
  );
}
