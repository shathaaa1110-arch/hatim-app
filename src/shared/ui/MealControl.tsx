import { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import { Host, Slider } from "@expo/ui";
import { Clock3, Sparkles, Utensils } from "lucide-react-native";
import { colors as c, ar } from "../theme";
import { Button, Chip, Row, T } from "./primitives";

export function MealControl({
  slots,
  consumed,
  onChange,
  busy,
}: {
  slots: number;
  consumed: number;
  onChange: (slots: number) => Promise<void>;
  busy?: boolean;
}) {
  const [draft, setDraft] = useState(slots);
  useEffect(() => setDraft(slots), [slots]);
  return (
    <View style={s.card}>
      <Row style={{ justifyContent: "space-between" }}>
        <Row>
          <View style={s.icon}>
            <Clock3 size={23} color={c.green} strokeWidth={1.5} />
          </View>
          <View>
            <T weight="semibold" style={{ fontSize: 20 }}>
              تغيّر وقتكم؟ عادي.
            </T>
            <T style={{ color: c.muted, fontSize: 12 }}>
              نصغّر الخطة، ونحفظ اللي يستاهل.
            </T>
          </View>
        </Row>
        <T weight="semibold" style={s.number}>
          {ar(draft)}
        </T>
      </Row>
      <Row style={{ flexWrap: "wrap", marginTop: 8 }}>
        {[
          { n: 9, label: "٤ أيام · ٩ خانات" },
          { n: 5, label: "يومين · ٥ خانات" },
          { n: 1, label: "عشاء واحد" },
        ].map(({ n, label }) => (
          <Chip
            key={n}
            label={label}
            selected={draft === n}
            onPress={consumed <= n ? () => setDraft(n) : undefined}
          />
        ))}
      </Row>
      {consumed < 9 && (
        <Host seedColor={c.green} colorScheme="light" style={{ height: 45 }}>
          <Slider
            testID="meal-slider"
            value={draft}
            onValueChange={(v) => setDraft(Math.round(v))}
            min={Math.max(1, consumed)}
            max={9}
            step={1}
            disabled={busy}
          />
        </Host>
      )}
      <Row style={{ justifyContent: "space-between" }}>
        <Row style={{ gap: 6 }}>
          <Utensils size={13} color={c.muted} />
          <T style={{ fontSize: 12, color: c.muted }}>
            {ar(consumed)} استُهلكت · {ar(draft - consumed)} متبقية
          </T>
        </Row>
        <T style={{ fontSize: 11, color: c.muted }}>نعدّ الوجبات، مو الأيام</T>
      </Row>
      {draft !== slots && (
        <Button
          small
          label={`حدّث الخطة إلى ${ar(draft)} خانات`}
          icon={Sparkles}
          busy={busy}
          onPress={() => onChange(draft)}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    borderRadius: 25,
    padding: 23,
    backgroundColor: "#EFF3E9",
    borderWidth: 1,
    borderColor: "#E2E9DB",
    gap: 10,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: "#DFE8D7",
    alignItems: "center",
    justifyContent: "center",
  },
  number: { fontSize: 43, lineHeight: 60, color: c.green },
});
