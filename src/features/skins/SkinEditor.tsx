import { useState, type ReactNode } from "react";
import { Pressable, View } from "react-native";
import { Dices } from "lucide-react-native";
import { Button, Notice, Sheet, T } from "../../shared/ui/primitives";
import { ErrorNotice, s } from "../../shared/ui/layout";
import { colors as c } from "../../shared/theme";
import {
  accessories,
  defaultSkin,
  expressions,
  headwears,
  outfits,
  palettes,
  personas,
  skinPhrase,
  surprise,
  tones,
  type Skin,
} from "./catalog";
import { SkinAvatar } from "./SkinAvatar";

/** The choices themselves, usable inside a sheet or inline in another form. */
export function SkinPicker({
  name,
  value: draft,
  onChange,
  disabled: busy = false,
}: {
  name: string;
  value: Skin;
  onChange: (value: Skin) => void;
  disabled?: boolean;
}) {
  const pick = <K extends keyof Skin>(field: K, value: Skin[K]) => {
    if (!busy) onChange({ ...draft, [field]: value });
  };
  // Every choice is shown as what it looks like; the spoken label keeps its words.
  function choices<K extends keyof Skin>(
    field: K,
    heading: string,
    items: readonly {
      value: Skin[K];
      label: string;
      look: ReactNode;
      wide?: boolean;
    }[],
  ) {
    return (
      <View style={{ gap: 8 }}>
        <T weight="semibold">{heading}</T>
        <View style={s.wrap}>
          {items.map(({ value, label, look, wide }) => {
            const selected = draft[field] === value;
            return (
              <Pressable
                key={String(value)}
                accessibilityRole="button"
                accessibilityLabel={label}
                accessibilityState={{ selected }}
                aria-pressed={selected}
                disabled={busy}
                onPress={() => pick(field, value)}
                style={{
                  minWidth: 58,
                  minHeight: 58,
                  flexGrow: wide ? 1 : 0,
                  flexBasis: wide ? "40%" : undefined,
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 6,
                  borderRadius: 18,
                  borderWidth: 2,
                  borderColor: selected ? c.green : c.line,
                  backgroundColor: selected ? c.sage : c.white,
                }}
              >
                {look}
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }
  const emoji = (value: string) => (
    <T style={{ fontSize: 30, lineHeight: 38 }}>{value}</T>
  );
  const dot = (fill: string, ring: string) => (
    <View
      style={{
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: fill,
        borderWidth: 5,
        borderColor: ring,
      }}
    />
  );
  const preview = (change: Partial<Skin>) => (
    <SkinAvatar
      decorative
      bare
      name={name}
      skin={{ ...draft, ...change }}
      size={60}
    />
  );
  return (
    <>
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
        <Button
          small
          secondary
          icon={Dices}
          label="فاجئني"
          disabled={busy}
          onPress={() => onChange(surprise(draft))}
        />
      </View>
      <View style={{ flexDirection: "row-reverse", gap: 8, flexWrap: "wrap" }}>
        {Object.entries(personas).map(([key, persona]) => (
          <Pressable
            key={key}
            accessibilityRole="button"
            accessibilityLabel={`شخصية ${persona.name}`}
            accessibilityState={{ selected: draft.persona === key }}
            disabled={busy}
            onPress={() =>
              onChange({ ...draft, persona: key as Skin["persona"] })
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
              decorative
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
      {choices(
        "tone",
        "✋ البشرة",
        Object.entries(tones).map(([key, tone]) => ({
          value: key as Skin["tone"],
          label: tone.name,
          look: dot(tone.fill, "#FFF9EA"),
        })),
      )}
      {choices(
        "outfit",
        "👕 اللبس",
        Object.entries(outfits).map(([key, label]) => ({
          value: key as Skin["outfit"],
          label,
          look: preview({ outfit: key as Skin["outfit"] }),
        })),
      )}
      {choices(
        "headwear",
        "🧣 غطاء الرأس",
        Object.entries(headwears).map(([key, label]) => ({
          value: key as Skin["headwear"],
          label,
          look: preview({ headwear: key as Skin["headwear"] }),
        })),
      )}
      {choices(
        "color",
        "🎨 اللون",
        Object.entries(palettes).map(([key, p]) => ({
          value: key as Skin["color"],
          label: p.name,
          look: dot(p.ink, p.light),
        })),
      )}
      {choices(
        "expression",
        "😊 التعبير",
        Object.entries(expressions).map(([key, e]) => ({
          value: key as Skin["expression"],
          label: e.name,
          look: emoji(e.emoji),
        })),
      )}
      {choices(
        "accessory",
        "👓 الإكسسوار",
        Object.entries(accessories).map(([key, a]) => ({
          value: key as Skin["accessory"],
          label: a.name,
          look: emoji(a.emoji),
        })),
      )}
      {choices(
        "phrase",
        "💬 العبارة",
        Object.entries(personas[draft.persona].phrases).map(([key, text]) => ({
          value: key as Skin["phrase"],
          label: text,
          wide: true,
          look: <T style={{ textAlign: "center", fontSize: 13 }}>«{text}»</T>,
        })),
      )}
    </>
  );
}

export function SkinEditor({
  name,
  initial,
  effective,
  title,
  note,
  notice,
  clearLabel,
  save,
  close,
}: {
  name: string;
  /** The stored value the caller compares against; null when nothing is stored. */
  initial: Skin | null;
  /** What is shown today, for example an inherited group look. */
  effective: Skin | null;
  title: string;
  note: string;
  notice?: string;
  clearLabel: string;
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
  return (
    <Sheet
      title={title}
      visible
      onClose={() => {
        if (!busy) close();
      }}
    >
      <T style={s.muted}>{note}</T>
      <SkinPicker
        name={name}
        value={draft}
        onChange={setDraft}
        disabled={busy}
      />
      {notice && <Notice text={notice} />}
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
        label={clearLabel}
        disabled={busy}
        onPress={() => {
          void submit(null);
        }}
      />
    </Sheet>
  );
}
