import { useState } from "react";
import { OutingContextForm, emptyOutingContext } from "./OutingContextForm";
import { Image, Pressable, StyleSheet, View } from "react-native";
import {
  Bookmark,
  Check,
  ChevronLeft,
  CircleCheck,
  Leaf,
  Sparkles,
  Utensils,
} from "lucide-react-native";
import {
  type Experience,
  type Group,
  type Settings,
  type OutingContext,
} from "../../shared/contracts";
import { ar, colors as c, photos } from "../../shared/theme";
import {
  Button,
  Chip,
  Empty,
  Notice,
  Row,
  Sheet,
  T,
} from "../../shared/ui/primitives";
import { MealControl } from "../../shared/ui/MealControl";

export function PlanScreen({
  group,
  catalog,
  update,
  busy,
  onOpen,
  onPocket,
  readOnly = false,
}: {
  group: Group;
  catalog: Experience[];
  update: (s: Settings) => Promise<void>;
  busy: boolean;
  onOpen: (e: Experience) => void;
  onPocket: () => void;
  readOnly?: boolean;
}) {
  const [contextDraft, setContextDraft] = useState<OutingContext | null>(null);
  const [contextError, setContextError] = useState<string | null>(null);
  const safeUpdate = async (value: Settings) => {
    try {
      await update(value);
    } catch {
      /* Parent displays error. */
    }
  };
  return (
    <View style={{ gap: 23 }}>
      <View>
        <T style={{ fontSize: 12, color: c.muted }}>
          على قدّ وقتكم، وعلى ذوقكم
        </T>
        <T weight="semibold" style={{ fontSize: 34 }}>
          خطّة تعرف تتغيّر.
        </T>
        <T style={{ color: c.muted, lineHeight: 25 }}>
          الأهم يبقى. وكل اختيار له سبب واضح.
        </T>
      </View>
      {!readOnly && (
        <MealControl
          slots={group.settings.slots ?? 9}
          consumed={group.plan.consumed}
          onChange={(slots) => safeUpdate({ ...group.settings, slots })}
          busy={busy}
        />
      )}
      <OutingContextForm value={group.settings.context ?? emptyOutingContext} />
      {!readOnly && (
        <Button
          secondary
          small
          label="تعديل جوّ الطلعة"
          disabled={busy}
          onPress={() => {
            setContextError(null);
            setContextDraft(group.settings.context ?? emptyOutingContext);
          }}
        />
      )}
      <Sheet
        title="تفضيلات هذه الطلعة"
        visible={!!contextDraft}
        onClose={() => {
          if (!busy) setContextDraft(null);
        }}
      >
        {contextDraft && (
          <>
            <OutingContextForm
              value={contextDraft}
              onChange={setContextDraft}
              disabled={busy}
            />
            <Notice text="حفظ التفضيلات يعيد ترتيب التجارب مع بقاء الركيزة والقيود. في طلعات القروبات تُلغى جولة الاختيار المتأثرة لتبدؤوا جولة جديدة." />
            {contextError && <Notice warning text={contextError} />}
            <Button
              label="حفظ تفضيلات الطلعة"
              busy={busy}
              onPress={async () => {
                setContextError(null);
                try {
                  await update({ ...group.settings, context: contextDraft });
                  setContextDraft(null);
                } catch (e) {
                  setContextError(
                    e instanceof Error ? e.message : "تعذّر الحفظ.",
                  );
                }
              }}
            />
          </>
        )}
      </Sheet>
      {group.plan.anchor_issue && (
        <View style={{ gap: 9 }}>
          <Notice warning text={group.plan.anchor_issue} />
          <T style={{ fontSize: 12, color: c.warning }}>
            خانة الركيزة محفوظة. غيّر الركيزة بنفسك من تفاصيل تجربة، أو راجع
            قيود المجموعة.
          </T>
        </View>
      )}
      <Row style={{ justifyContent: "space-between" }}>
        <T weight="semibold" style={{ fontSize: 22 }}>
          اللي يبقى في خطّتكم
        </T>
        <Chip label={`${ar(group.plan.selected.length)} تجارب`} />
      </Row>
      {group.plan.selected.map((decision, index) => {
        const e = catalog.find((x) => x.id === decision.experience_id);
        if (!e) return null;
        const anchor = decision.priority === "ركيزة";
        return (
          <View
            key={e.id}
            style={[
              s.planCard,
              anchor && { borderColor: "#C4D3B9", backgroundColor: "#F3F6EE" },
            ]}
          >
            <Row style={{ alignItems: "flex-start", gap: 15 }}>
              <Pressable
                onPress={() => onOpen(e)}
                accessibilityRole="button"
                accessibilityLabel={`تفاصيل ${e.title}`}
              >
                <Image source={photos[e.image]} style={s.thumb} />
              </Pressable>
              <View style={{ flex: 1, gap: 5 }}>
                <Row style={{ justifyContent: "space-between" }}>
                  <Row style={{ gap: 5 }}>
                    {anchor && <Sparkles size={13} color={c.green} />}
                    <T
                      weight="semibold"
                      style={{
                        fontSize: 12,
                        color: anchor ? c.green : c.coral,
                      }}
                    >
                      {decision.priority}
                    </T>
                  </Row>
                  <T style={{ color: c.muted, fontSize: 11 }}>
                    خانة {ar(group.plan.consumed + index + 1)}
                  </T>
                </Row>
                <T weight="semibold" style={{ fontSize: 21 }}>
                  {e.title}
                </T>
                <T style={{ color: c.muted, fontSize: 12 }}>
                  {e.venue} · {ar(e.price)} ر.س للشخص
                </T>
              </View>
            </Row>
            <View style={s.reason}>
              <T weight="medium" style={{ fontSize: 12, marginBottom: 4 }}>
                ليش {decision.priority}؟
              </T>
              <T style={{ color: "#66776A", fontSize: 13, lineHeight: 24 }}>
                {decision.reason}
              </T>
            </View>
            {decision.adaptations?.map((text, i) => (
              <Row key={i} style={{ alignItems: "flex-start" }}>
                <Leaf size={16} color={c.green} />
                <T
                  style={{
                    flex: 1,
                    fontSize: 12,
                    color: c.green,
                    lineHeight: 23,
                  }}
                >
                  {text}
                </T>
              </Row>
            ))}
            <Row>
              {!readOnly && (
                <View style={{ flex: 1 }}>
                  <Button
                    small
                    label="عشناها"
                    icon={Check}
                    secondary
                    busy={busy}
                    onPress={() =>
                      safeUpdate({
                        ...group.settings,
                        completed_ids: [
                          ...(group.settings.completed_ids ?? []),
                          e.id,
                        ],
                      })
                    }
                  />
                </View>
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`عرض ${e.title}`}
                onPress={() => onOpen(e)}
                style={{ padding: 12 }}
              >
                <ChevronLeft size={20} color={c.green} />
              </Pressable>
            </Row>
          </View>
        );
      })}
      {group.plan.selected.length === 0 && (
        <Empty
          icon={Utensils}
          title={
            group.plan.available === 0
              ? "لحظات عشتوها، وحكايات بقيت."
              : "نحتاج نراجعها مع بعض"
          }
          text={
            group.plan.available === 0
              ? "استهلكتم خاناتكم. باقي الطموح محفوظ في الجيب."
              : "ما فيه تجربة مناسبة للخانات الحالية. القيود والركيزة واضحة فوق، وما غيّرنا حلمكم بصمت."
          }
        />
      )}
      {group.plan.unfilled > 0 && (
        <Notice
          text={`${ar(group.plan.unfilled)} خانات ما عبّيناها؛ ما نفرض تجربة على حساب قيودكم.`}
        />
      )}
      {group.plan.pocket.length > 0 && (
        <Pressable
          onPress={onPocket}
          accessibilityRole="button"
          accessibilityLabel="افتح الجيب"
          style={s.pocket}
        >
          <Bookmark size={23} color={c.green} />
          <View style={{ flex: 1 }}>
            <T weight="semibold">
              {ar(group.plan.pocket.length)} تجارب محفوظة في الجيب
            </T>
            <T style={{ color: c.muted, fontSize: 12 }}>
              اللي خرج من الخطة، ما ضاع.
            </T>
          </View>
          <ChevronLeft size={20} color={c.green} />
        </Pressable>
      )}
      {!!group.settings.completed_ids?.length && (
        <View style={{ gap: 12 }}>
          <T weight="semibold" style={{ fontSize: 22 }}>
            لحظات عشتوها
          </T>
          {group.settings.completed_ids.map((id) => (
            <Row key={id} style={s.completed}>
              <CircleCheck size={20} color={c.green} />
              <T style={{ flex: 1 }}>
                {catalog.find((e) => e.id === id)?.title}
              </T>
              {!readOnly && (
                <Pressable
                  disabled={busy}
                  accessibilityRole="button"
                  onPress={() =>
                    safeUpdate({
                      ...group.settings,
                      completed_ids: group.settings.completed_ids?.filter(
                        (x) => x !== id,
                      ),
                    })
                  }
                  style={{ padding: 10 }}
                >
                  <T style={{ color: c.muted, fontSize: 12 }}>تراجع</T>
                </Pressable>
              )}
            </Row>
          ))}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  planCard: {
    padding: 20,
    borderRadius: 24,
    backgroundColor: c.white,
    borderWidth: 1,
    borderColor: c.line,
    gap: 14,
  },
  thumb: { width: 85, height: 90, borderRadius: 15 },
  reason: { paddingTop: 14, borderTopWidth: 1, borderColor: c.line },
  pocket: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 14,
    borderRadius: 20,
    backgroundColor: c.sage,
    padding: 20,
  },
  completed: {
    padding: 12,
    backgroundColor: c.white,
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 16,
  },
});
