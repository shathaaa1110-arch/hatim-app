import { useState } from "react";
import { Pressable, View } from "react-native";
import { Button, Chip, Notice, Sheet, T } from "../../../shared/ui/primitives";
import { ErrorNotice, s } from "../../../shared/ui/layout";
import { colors as c } from "../../../shared/theme";
import type { Skin } from "../api";
import { defaultSkin, palettes, personas, skinPhrase } from "./catalog";
import { SkinAvatar } from "./SkinAvatar";

export function SkinEditor({
  name,
  initial,
  effective,
  scope,
  save,
  close,
}: {
  name: string;
  initial: Skin | null;
  effective: Skin | null;
  scope: "circle" | "outing";
  save: (value: Skin | null, expected: Skin | null) => Promise<unknown>;
  close: () => void;
}) {
  // Mounted only while open. Polling must not replace a draft or its expected baseline.
  const [expected] = useState(initial);
  const [draft, setDraft] = useState<Skin>(() => ({
    ...defaultSkin,
    ...(initial ?? effective),
  }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (value: Skin | null) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await save(value, expected);
      close();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "تعذّر حفظ الشخصية. حاول مرة ثانية.",
      );
    } finally {
      setBusy(false);
    }
  };
  function options<K extends keyof Skin>(
    field: K,
    title: string,
    choices: readonly (readonly [Skin[K], string])[],
  ) {
    return (
      <View style={{ gap: 8 }}>
        <T weight="semibold">{title}</T>
        <View style={s.wrap}>
          {choices.map(([value, label]) => (
            <Chip
              key={String(value)}
              label={label}
              selected={draft[field] === value}
              onPress={() => {
                if (!busy) setDraft((d) => ({ ...d, [field]: value }));
              }}
            />
          ))}
        </View>
      </View>
    );
  }
  return (
    <Sheet
      title={scope === "circle" ? "شخصيتي في القروب" : "شخصيتي لهذه الطلعة"}
      visible
      onClose={() => {
        if (!busy) close();
      }}
    >
      <View
        style={{
          alignItems: "center",
          gap: 8,
          padding: 16,
          borderRadius: 24,
          backgroundColor: palettes[draft.color ?? "palm"].light,
        }}
      >
        <SkinAvatar skin={draft} name={name} size={152} />
        <T weight="semibold" style={{ fontSize: 21 }}>
          {name} · {personas[draft.persona].name}
        </T>
        <T style={{ textAlign: "center", color: c.ink }}>
          «{skinPhrase(draft)}»
        </T>
      </View>
      <T style={s.muted}>
        {scope === "circle"
          ? "شخصيتك المحفوظة لطلعات هذا القروب. تقدر تغيّرها لطلعة واحدة."
          : "تغيير هنا يخص هذه الطلعة فقط. شخصيتك المحفوظة للقروب تبقى مثل ما هي."}
      </T>
      <View style={{ flexDirection: "row-reverse", gap: 8, flexWrap: "wrap" }}>
        {Object.entries(personas).map(([key, persona]) => (
          <Pressable
            key={key}
            accessibilityRole="button"
            accessibilityLabel={`شخصية ${persona.name}`}
            accessibilityState={{ selected: draft.persona === key }}
            disabled={busy}
            onPress={() =>
              setDraft((d) => ({ ...d, persona: key as Skin["persona"] }))
            }
            style={{
              flex: 1,
              minWidth: 88,
              alignItems: "center",
              gap: 7,
              padding: 8,
              borderRadius: 18,
              borderWidth: 2,
              borderColor: draft.persona === key ? c.green : c.line,
              backgroundColor: c.white,
            }}
          >
            <SkinAvatar
              name={persona.name}
              skin={{ ...draft, persona: key as Skin["persona"] }}
              size={76}
            />
            <T weight="semibold" style={{ textAlign: "center", fontSize: 13 }}>
              {persona.name}
            </T>
            <T style={{ textAlign: "center", fontSize: 11, color: c.ink }}>
              {persona.detail}
            </T>
          </Pressable>
        ))}
      </View>
      {options("outfit", "اللبس", [
        ["thobe", "ثوب"],
        ["abaya", "عباية"],
        ["casual", "كاجوال"],
      ])}
      {options("tone", "لون البشرة", [
        ["light", "فاتح"],
        ["warm", "حنطي"],
        ["deep", "أسمر"],
      ])}
      {options(
        "color",
        "اللون",
        Object.entries(palettes).map(
          ([key, p]) => [key as Skin["color"], p.name] as const,
        ),
      )}
      {options("expression", "التعبير", [
        ["smile", "ابتسامة"],
        ["wink", "غمزة"],
        ["side_eye", "نظرة جانبية"],
      ])}
      {options("accessory", "الإكسسوار", [
        ["none", "بدون نظارة"],
        ["glasses", "نظارة"],
      ])}
      {options(
        "phrase",
        "عبارة الشخصية",
        Object.entries(personas[draft.persona].phrases).map(
          ([key, label]) => [key as Skin["phrase"], label] as const,
        ),
      )}
      <Notice text="شخصية للمزح تختارها بنفسك؛ ما تعطيك صلاحيات، وما تغيّر ذوقك أو صوتك. عبارتها جزء من الشخصية وليست تحديثًا عن موقعك." />
      <ErrorNotice error={error} />
      <Button
        label="حفظ الشخصية"
        busy={busy}
        onPress={() => {
          void submit(draft);
        }}
      />
      <Button
        secondary
        label={scope === "circle" ? "بدون شخصية" : "استخدام شخصية القروب"}
        disabled={busy}
        onPress={() => {
          void submit(null);
        }}
      />
    </Sheet>
  );
}
