import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { Clock3 } from "lucide-react-native";
import type {
  Experience,
  Group,
  OutingContext,
  Preferences,
} from "../../shared/contracts";
import { emptyPreferences } from "../../shared/preferences";
import { ar, colors } from "../../shared/theme";
import { Button, Chip, Notice, Row, T } from "../../shared/ui/primitives";
import { PreferencesForm } from "../../shared/ui/PreferencesForm";
import { ExperienceCard } from "../experiences";
import { OutingContextForm, emptyOutingContext } from "../planning";
import { quickDecision, type QuickResult } from "./api";

export function QuickDecision({
  catalog,
  group,
  accountName,
  busy,
  onChoose,
  onStageChange,
}: {
  catalog: Experience[];
  group: Group | null;
  accountName: string;
  busy: boolean;
  onStageChange: () => void;
  onChoose: (
    experience: Experience,
    context: OutingContext,
    preferences: Preferences,
  ) => Promise<void>;
}) {
  const [minutes, setMinutes] = useState(60);
  const [neighborhood, setNeighborhood] = useState<string | null>(null);
  const [context, setContext] = useState<OutingContext>(
    group?.settings.context ?? emptyOutingContext,
  );
  const [preferences, setPreferences] = useState<Preferences>({
    ...emptyPreferences,
    name: accountName,
  });
  const [editing, setEditing] = useState(!group);
  const [result, setResult] = useState<QuickResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [choosing, setChoosing] = useState<Experience | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pending = useRef<AbortController | null>(null);
  const currentSignature = useRef("");
  const members = group
    ? group.members.map((m) => m.preferences)
    : [preferences];
  const excluded = [
    ...(group?.settings.completed_ids ?? []),
    ...(group?.settings.pocket_ids ?? []),
  ];
  const signature = JSON.stringify([
    group?.id,
    group?.settings,
    members,
    catalog,
    minutes,
    neighborhood,
    context,
  ]);
  currentSignature.current = signature;
  // Polling the same data does not reset the form; actual constraints changing do.
  useEffect(() => {
    pending.current?.abort();
    setSearching(false);
    setResult(null);
    setChoosing(null);
    return () => pending.current?.abort();
  }, [signature]);
  useEffect(() => {
    onStageChange();
  }, [!!result, !!choosing, editing, onStageChange]);
  const search = async () => {
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    const version = currentSignature.current;
    setSearching(true);
    setError(null);
    setResult(null);
    setChoosing(null);
    try {
      const next = await quickDecision(
        {
          minutes,
          neighborhood,
          context,
          members,
          excluded_ids: excluded,
        },
        controller.signal,
      );
      if (!controller.signal.aborted && version === currentSignature.current)
        setResult(next);
    } catch (e) {
      if (!controller.signal.aborted)
        setError(e instanceof Error ? e.message : "تعذّر البحث.");
    } finally {
      if (pending.current === controller) setSearching(false);
    }
  };
  return (
    <View style={{ gap: 20 }}>
      <Row>
        <Clock3 size={25} color={colors.green} />
        <T weight="semibold" style={{ fontSize: 22 }}>
          وقت قليل، واختيار يستاهل.
        </T>
      </Row>
      {!result && (
        <>
          <T style={{ color: colors.muted, lineHeight: 25 }}>
            حدد وقت التجربة بعد خصم الطريق والانتظار. نختصرها إلى ثلاث تجارب كحد
            أقصى.
          </T>
          <T weight="semibold">كم دقيقة عندك للتجربة؟</T>
          <View
            style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 }}
          >
            {[30, 45, 60, 90, 120].map((n) => (
              <Chip
                key={n}
                label={`${ar(n)} دقيقة`}
                selected={minutes === n}
                onPress={() => setMinutes(n)}
              />
            ))}
          </View>
          <T weight="semibold">أي حي يناسبك؟</T>
          <View
            style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 }}
          >
            {[
              null,
              ...Array.from(new Set(catalog.map((e) => e.neighborhood))),
            ].map((n) => (
              <Chip
                key={n ?? "all"}
                label={n ?? "أي حي"}
                selected={neighborhood === n}
                onPress={() => setNeighborhood(n)}
              />
            ))}
          </View>
          <OutingContextForm
            value={context}
            onChange={setContext}
            disabled={busy}
          />
          {group ? (
            <Notice
              text={`نراعي قيود كل رفقة خطتك الحالية: ${members.map((p) => p.name).join("، ")}. الجيب واللحظات المكتملة مستثناة. تعديل قيودهم من «رفقة الطلعة وذوقي».`}
            />
          ) : (
            <Notice text="بدون حساب أو قروب. نبدأ بقيودك، وتقدر تعزم رفقة بعد حفظ الاختيار." />
          )}
          {!group && editing ? (
            <PreferencesForm
              initial={preferences}
              busy={searching || busy}
              label="اعتماد ذوقي للبحث"
              onSave={async (p) => {
                setPreferences(p);
                setEditing(false);
                setResult(null);
              }}
            />
          ) : (
            <>
              {!group && (
                <Button
                  small
                  secondary
                  label="تعديل ذوقي وقيودي"
                  onPress={() => {
                    setResult(null);
                    setChoosing(null);
                    setEditing(true);
                  }}
                />
              )}
              <Button
                label="اعرض الخيارات المناسبة"
                busy={searching}
                disabled={busy || !catalog.length}
                onPress={() => void search()}
              />
            </>
          )}
        </>
      )}
      {error && <Notice warning text={error} />}
      {group?.plan.available === 0 && (
        <Notice text="كل خانات خطتك مكتملة. تقدر تتصفح النتائج؛ اعتماد تجربة أخرى يحتاج خانة جديدة في الخطة أو خطة جديدة من حسابي." />
      )}
      {!result && (
        <Notice text="تجارب توضيحية في نسخة تجريبية؛ أوقات الفتح والتوفر والازدحام غير متصلة ببيانات مباشرة." />
      )}
      {result && !choosing && (
        <View style={{ gap: 18 }} testID="quick-results">
          <Row>
            <Chip label={`${ar(minutes)} دقيقة`} />
            <Chip label={neighborhood ?? "أي حي"} />
          </Row>
          <OutingContextForm value={context} />
          <Button
            secondary
            small
            label="تعديل البحث"
            onPress={() => {
              setResult(null);
              setError(null);
            }}
          />
          <T style={{ color: colors.muted, fontSize: 12, lineHeight: 23 }}>
            بيانات توضيحية · تحقق من توفر التجربة قبل الذهاب.
          </T>
          {!result.choices.length && <Notice text={result.message} />}
          {result.choices.map((choice) => {
            const e = catalog.find((x) => x.id === choice.experience_id);
            if (!e) return null;
            return (
              <View key={e.id} style={{ gap: 10 }}>
                <ExperienceCard
                  experience={e}
                  compact
                  onOpen={() => setChoosing(e)}
                />
                <T style={{ lineHeight: 24 }}>{choice.reason}</T>
                {choice.adaptations?.map((text, i) => (
                  <Notice key={i} text={text} />
                ))}
                <Button
                  secondary
                  label={`أختار ${e.title}`}
                  disabled={busy}
                  onPress={() => setChoosing(e)}
                />
              </View>
            );
          })}
          <T style={{ color: colors.muted, fontSize: 12, lineHeight: 23 }}>
            {result.duration_note}
          </T>
        </View>
      )}
      {choosing && result && (
        <View
          style={{
            gap: 12,
            padding: 18,
            borderRadius: 22,
            backgroundColor: colors.sage,
          }}
        >
          <T weight="semibold">نعتمد «{choosing.title}»؟</T>
          <T style={{ lineHeight: 24 }}>{choosing.description}</T>
          <T>
            {choosing.venue} · {choosing.neighborhood} · {ar(choosing.price)}{" "}
            ر.س للشخص · نحو {ar(choosing.minutes)} دقيقة
          </T>
          <T style={{ lineHeight: 24 }}>
            {group
              ? `ستصبح ركيزة خطتك الحالية بدل «${catalog.find((e) => e.id === group.settings.anchor_id)?.title ?? "بدون ركيزة"}»، وتُحفظ تفضيلات الطلعة المختارة. خاناتك وبقية اختياراتك تبقى كما هي.`
              : "نحفظها ركيزة لخطة من خانة واحدة، مع ذوقك وتفضيلات هذه الطلعة. تقدر تعزم الرفقة بعدها."}
          </T>
          <T style={{ color: colors.muted, fontSize: 12, lineHeight: 23 }}>
            تجربة توضيحية؛ المدة لا تشمل الطريق والانتظار والتوفر غير مباشر.
          </T>
          <Button
            label={group ? "اعتمدها ركيزة لخطتي" : "ابدأ خطة بهذه التجربة"}
            busy={busy}
            onPress={async () => {
              setError(null);
              try {
                await onChoose(choosing, context, preferences);
              } catch (e) {
                setError(
                  e instanceof Error ? e.message : "تعذّر حفظ الاختيار.",
                );
              }
            }}
          />
          <Button
            secondary
            label="أراجع الاختيارات"
            disabled={busy}
            onPress={() => setChoosing(null)}
          />
        </View>
      )}
    </View>
  );
}
