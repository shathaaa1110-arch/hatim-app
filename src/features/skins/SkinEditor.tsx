import { useRef, useState, type ReactNode } from "react";
import { Image, Pressable, View } from "react-native";
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
import { clothes } from "./artwork";

const parts = {
  persona: "الشخصية",
  tone: "البشرة",
  outfit: "اللبس",
  headwear: "غطاء الرأس",
  expression: "التعبير",
  accessory: "النظارة",
  color: "الخلفية",
  phrase: "العبارة",
} as const;

/** Pick a part, then its appearance. All other choices stay in the same draft. */
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
  const [part, setPart] = useState<keyof typeof parts>("persona");
  const preview = (change: Partial<Skin>, bare = true) => (
    <SkinAvatar
      decorative
      bare={bare}
      name={name}
      skin={{ ...draft, ...change }}
      size={70}
    />
  );
  function choices<K extends keyof Skin>(
    field: K,
    items: readonly {
      value: Skin[K];
      label: string;
      look: ReactNode;
      detail?: string;
      wide?: boolean;
    }[],
  ) {
    return (
      <View style={{ gap: 10 }}>
        <T weight="semibold">{parts[part]}</T>
        <View style={s.wrap}>
          {items.map(({ value, label, look, detail, wide }) => {
            const selected = draft[field] === value;
            return (
              <Pressable
                key={String(value)}
                accessibilityRole="button"
                accessibilityLabel={
                  field === "persona" ? `شخصية ${label}` : label
                }
                accessibilityState={{ selected, disabled: busy }}
                aria-pressed={selected}
                disabled={busy}
                onPress={() => {
                  if (!busy) onChange({ ...draft, [field]: value });
                }}
                style={{
                  minWidth: 80,
                  minHeight: 80,
                  flexGrow: 1,
                  flexBasis: wide ? "44%" : "25%",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 5,
                  padding: 8,
                  borderRadius: 18,
                  borderWidth: 2,
                  borderColor: selected ? c.green : c.line,
                  backgroundColor: selected ? c.sage : c.white,
                  opacity: busy ? 0.65 : 1,
                }}
              >
                {look}
                {!wide && (
                  <T
                    weight="semibold"
                    style={{ textAlign: "center", fontSize: 12 }}
                  >
                    {label}
                  </T>
                )}
                {detail && (
                  <T
                    style={{ textAlign: "center", fontSize: 10, color: c.ink }}
                  >
                    {detail}
                  </T>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }
  const panel = {
    persona: () =>
      choices(
        "persona",
        Object.entries(personas).map(([key, p]) => ({
          value: key as Skin["persona"],
          label: p.name,
          detail: p.detail,
          look: preview({ persona: key as Skin["persona"] }, false),
        })),
      ),
    tone: () =>
      choices(
        "tone",
        Object.entries(tones).map(([key, t]) => ({
          value: key as Skin["tone"],
          label: t.name,
          look: preview({ tone: key as Skin["tone"] }),
        })),
      ),
    outfit: () =>
      choices(
        "outfit",
        Object.entries(outfits).map(([key, label]) => ({
          value: key as Skin["outfit"],
          label,
          look: (
            // Focus the thumbnail on the garment; full-canvas padding is for assembly.
            <View style={{ width: 70, height: 54, overflow: "hidden" }}>
              <Image
                source={clothes[key as Skin["outfit"]]}
                accessible={false}
                aria-hidden
                resizeMode="contain"
                fadeDuration={0}
                style={{
                  position: "absolute",
                  width: 126,
                  height: 126,
                  left: -28,
                  top: -77,
                }}
              />
            </View>
          ),
        })),
      ),
    headwear: () =>
      choices(
        "headwear",
        Object.entries(headwears).map(([key, label]) => ({
          value: key as Skin["headwear"],
          label,
          look: preview({ headwear: key as Skin["headwear"] }),
        })),
      ),
    expression: () =>
      choices(
        "expression",
        Object.entries(expressions).map(([key, e]) => ({
          value: key as Skin["expression"],
          label: e.name,
          look: preview({ expression: key as Skin["expression"] }),
        })),
      ),
    accessory: () =>
      choices(
        "accessory",
        Object.entries(accessories).map(([key, a]) => ({
          value: key as Skin["accessory"],
          label: a.name,
          look: preview({ accessory: key as Skin["accessory"] }),
        })),
      ),
    color: () =>
      choices(
        "color",
        Object.entries(palettes).map(([key, p]) => ({
          value: key as Skin["color"],
          label: p.name,
          look: (
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: p.light,
                borderWidth: 5,
                borderColor: p.ink,
              }}
            />
          ),
        })),
      ),
    phrase: () =>
      choices(
        "phrase",
        Object.entries(personas[draft.persona].phrases).map(([key, text]) => ({
          value: key as Skin["phrase"],
          label: text,
          wide: true,
          look: <T style={{ textAlign: "center", fontSize: 13 }}>«{text}»</T>,
        })),
      ),
  };
  return (
    <View style={{ gap: 16 }}>
      <View
        style={{
          alignItems: "center",
          gap: 6,
          padding: 14,
          borderRadius: 24,
          backgroundColor: palettes[draft.color ?? "palm"].light,
        }}
      >
        <SkinAvatar skin={draft} name={name} size={184} />
        <T weight="semibold" style={{ fontSize: 19 }}>
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
      <T style={s.muted}>
        اختاري الجزء اللي تبغين تغيّرينه. باقي شخصيتك يبقى مثل ما هو.
      </T>
      <View style={s.wrap}>
        {Object.entries(parts).map(([key, label]) => (
          <Pressable
            key={key}
            accessibilityRole="button"
            accessibilityLabel={`تعديل ${label}`}
            accessibilityState={{ selected: part === key, disabled: busy }}
            aria-pressed={part === key}
            disabled={busy}
            onPress={() => setPart(key as keyof typeof parts)}
            style={[
              {
                minHeight: 44,
                paddingHorizontal: 14,
                paddingVertical: 9,
                borderRadius: 22,
                borderWidth: 1,
                borderColor: c.line,
                justifyContent: "center",
                backgroundColor: c.white,
              },
              part === key && {
                backgroundColor: c.green,
                borderColor: c.green,
              },
            ]}
          >
            <T
              weight="medium"
              style={{ fontSize: 13, color: part === key ? c.white : c.ink }}
            >
              {label}
            </T>
          </Pressable>
        ))}
      </View>
      {panel[part]()}
    </View>
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
  initial: Skin | null;
  effective: Skin | null;
  title: string;
  note: string;
  notice?: string;
  clearLabel: string;
  save: (value: Skin | null, expected: Skin | null) => Promise<unknown>;
  close: () => void;
}) {
  // Baseline is frozen while editing; polling must not replace a user's draft.
  const [expected] = useState(initial);
  const [draft, setDraft] = useState<Skin>(() => ({
    ...defaultSkin,
    ...(initial ?? effective),
  }));
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (value: Skin | null) => {
    if (inFlight.current) return;
    inFlight.current = true;
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
      inFlight.current = false;
      setBusy(false);
    }
  };
  return (
    <Sheet
      title={title}
      visible
      onClose={() => {
        if (!inFlight.current) close();
      }}
      footer={
        <View style={{ gap: 8 }}>
          <ErrorNotice error={error} />
          <Button
            label="حفظ الشخصية"
            busy={busy}
            onPress={() => {
              void submit(draft);
            }}
          />
          <Button
            small
            secondary
            label={clearLabel}
            disabled={busy}
            onPress={() => {
              void submit(null);
            }}
          />
        </View>
      }
    >
      <T style={s.muted}>{note}</T>
      <SkinPicker
        name={name}
        value={draft}
        onChange={setDraft}
        disabled={busy}
      />
      {notice && <Notice text={notice} />}
    </Sheet>
  );
}
