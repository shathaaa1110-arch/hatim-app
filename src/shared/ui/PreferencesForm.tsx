import { useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { Host, Slider } from "@expo/ui";
import { Check, Leaf, ShieldCheck } from "lucide-react-native";
import { type Preferences } from "../contracts";
import { colors as c, fonts, ar } from "../theme";
import { Button, Chip, Notice, Row, T } from "./primitives";
import { Toggle } from "./Toggle";

const cuisines: NonNullable<Preferences["cuisines"]> = [
  "سعودي",
  "ياباني",
  "إيطالي",
  "شامي",
  "آسيوي",
  "قهوة وحلى",
];
const allergens: NonNullable<Preferences["allergies"]> = [
  "مكسرات",
  "فول سوداني",
  "حليب",
  "قمح",
  "سمسم",
  "قشريات",
  "سمك",
  "بيض",
  "صويا",
];

export function PreferencesForm({
  initial,
  onSave,
  label = "حفظ ذوقي",
  busy = false,
}: {
  initial: Preferences;
  onSave: (p: Preferences) => Promise<void>;
  label?: string;
  busy?: boolean;
}) {
  const [value, setValue] = useState<Preferences>(initial);
  const [error, setError] = useState<string | null>(null);
  const patch = (p: Partial<Preferences>) => setValue((v) => ({ ...v, ...p }));
  const save = async () => {
    if (!value.name.trim()) {
      setError("وش الاسم اللي ينادونك فيه؟");
      return;
    }
    setError(null);
    try {
      await onSave({ ...value, name: value.name.trim() });
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذّر الحفظ. حاول مرة ثانية.");
    }
  };
  return (
    <View style={{ gap: 24 }}>
      <View style={{ gap: 8 }}>
        <T weight="medium">وش نناديك؟</T>
        <TextInput
          accessibilityLabel="اسمك"
          placeholder="اسمك بين الربع"
          placeholderTextColor={c.muted}
          value={value.name}
          onChangeText={(name) => patch({ name })}
          maxLength={30}
          autoComplete="given-name"
          style={s.input}
        />
      </View>
      <Row>
        <Chip
          label="مقيم في الرياض"
          selected={value.role === "مقيم"}
          onPress={() => patch({ role: "مقيم" })}
        />
        <Chip
          label="جاي أزورها"
          selected={value.role === "زائر"}
          onPress={() => patch({ role: "زائر" })}
        />
      </Row>
      <View style={{ gap: 10 }}>
        <T weight="semibold" style={s.heading}>
          وين يودّيك ذوقك؟
        </T>
        <T style={s.caption}>اختَر اللي تحبّه، ونخلّي مساحة للجديد.</T>
        <View style={s.wrap}>
          {cuisines.map((cuisine) => (
            <Chip
              key={cuisine}
              label={cuisine}
              selected={value.cuisines?.includes(cuisine)}
              onPress={() =>
                patch({
                  cuisines: value.cuisines?.includes(cuisine)
                    ? value.cuisines.filter((x) => x !== cuisine)
                    : [...(value.cuisines ?? []), cuisine],
                })
              }
            />
          ))}
        </View>
      </View>
      <View style={s.controlCard}>
        <Row>
          <Leaf size={20} color={c.green} />
          <View style={{ flex: 1 }}>
            <T weight="medium">أكلي نباتي</T>
            <T style={s.caption}>قيد أساسي، ونبحث عن خيار يناسبك.</T>
          </View>
          <Toggle
            testID="vegetarian-switch"
            label="أكلي نباتي"
            value={value.vegetarian ?? false}
            onValueChange={(vegetarian) => patch({ vegetarian })}
          />
        </Row>
        <View style={s.line} />
        <Row>
          <T style={{ flex: 1 }} weight="medium">
            أفضل الأكل بدون حار
          </T>
          <Toggle
            testID="mild-switch"
            label="أفضل الأكل بدون حار"
            value={value.mild ?? false}
            onValueChange={(mild) => patch({ mild })}
          />
        </Row>
      </View>
      <View style={{ gap: 10 }}>
        <Row>
          <ShieldCheck size={20} color={c.warning} />
          <T weight="semibold" style={s.heading}>
            حساسية أكل؟ نأخذها بجدّية.
          </T>
        </Row>
        <T style={s.caption}>
          اتركها فارغة إذا ما عندك حساسية. التفضيل شيء، والسلامة شيء ثاني.
        </T>
        <View style={s.wrap}>
          {allergens.map((allergy) => (
            <Chip
              key={allergy}
              label={allergy}
              selected={value.allergies?.includes(allergy)}
              onPress={() =>
                patch({
                  allergies: value.allergies?.includes(allergy)
                    ? value.allergies.filter((x) => x !== allergy)
                    : [...(value.allergies ?? []), allergy],
                })
              }
            />
          ))}
        </View>
        {!!value.allergies?.length && (
          <Notice
            warning
            text="بيانات هذه النسخة تجريبية وغير موثّقة للحساسية. ستُعلَّق التجارب التي لا نقدر نثبت توافقها؛ إزالة المكوّن وحدها ما تكفي."
          />
        )}
      </View>
      <View style={s.controlCard}>
        <Row style={{ justifyContent: "space-between" }}>
          <T weight="semibold">حدّ ميزانيتي لكل تجربة</T>
          <T weight="semibold" style={{ color: c.green }}>
            {ar(value.budget ?? 200)} ر.س
          </T>
        </Row>
        <Host seedColor={c.green} colorScheme="light" style={{ height: 42 }}>
          <Slider
            testID="budget-slider"
            value={value.budget ?? 200}
            min={30}
            max={500}
            step={10}
            onValueChange={(budget) => patch({ budget: Math.round(budget) })}
          />
        </Host>
        <T style={s.caption}>سقف للشخص الواحد، نلتزم فيه.</T>
      </View>
      {error && <Notice warning text={error} />}
      <Button label={label} onPress={save} icon={Check} busy={busy} />
      <T style={[s.caption, { textAlign: "center" }]}>
        المنظّم يشوف تفضيلاتك وقيودك لترتيب الخطة.
      </T>
    </View>
  );
}

const s = StyleSheet.create({
  input: {
    backgroundColor: c.white,
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 15,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: fonts.regular,
    fontSize: 16,
    color: c.ink,
    textAlign: "right",
    writingDirection: "rtl",
    minHeight: 52,
  },
  heading: { fontSize: 17 },
  caption: { color: c.muted, fontSize: 12, lineHeight: 22 },
  wrap: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 },
  controlCard: {
    padding: 17,
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 20,
    gap: 10,
    backgroundColor: c.white,
  },
  line: { height: 1, backgroundColor: c.line, marginVertical: 4 },
});
