import { View } from "react-native";
import type { OutingContext } from "../../shared/contracts";
import { Chip, T } from "../../shared/ui/primitives";
import { colors } from "../../shared/theme";

export const emptyOutingContext: OutingContext = {
  kind: "any",
  priorities: [],
};
const kinds = {
  any: "على راحتنا",
  family: "عائلية",
  friends: "مع أصدقاء",
} as const;
const priorities = {
  quiet: "جلسة هادئة",
  sharing: "أطباق للمشاركة",
  discovery: "نكهات جديدة",
} as const;
const presets: Record<
  NonNullable<OutingContext["kind"]>,
  NonNullable<OutingContext["priorities"]>
> = {
  any: [],
  family: ["quiet", "sharing"],
  friends: ["sharing", "discovery"],
};

export function OutingContextForm({
  value,
  onChange,
  disabled = false,
}: {
  value: OutingContext;
  onChange?: (value: OutingContext) => void;
  disabled?: boolean;
}) {
  const editable = !!onChange && !disabled;
  if (!onChange)
    return (
      <View style={{ gap: 10 }}>
        <T weight="semibold">جوّ هذه الطلعة: {kinds[value.kind ?? "any"]}</T>
        <View
          style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 }}
        >
          {(value.priorities ?? []).map((key) => (
            <Chip key={key} label={priorities[key]} />
          ))}
        </View>
      </View>
    );
  return (
    <View style={{ gap: 12 }}>
      <T weight="semibold">جوّ هذه الطلعة</T>
      <View style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 }}>
        {Object.entries(kinds).map(([kind, label]) => (
          <Chip
            key={kind}
            label={label}
            selected={editable && (value.kind ?? "any") === kind}
            onPress={
              editable
                ? () =>
                    onChange!({
                      kind: kind as OutingContext["kind"],
                      priorities: presets[kind as keyof typeof presets],
                    })
                : undefined
            }
          />
        ))}
      </View>
      <T style={{ color: colors.muted, fontSize: 12, lineHeight: 23 }}>
        اخترنا تفضيلات كبداية؛ عدّلها على كيفكم. تخص هذه الطلعة فقط، وقيود كل
        شخص تبقى محفوظة.
      </T>
      <View style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 }}>
        {Object.entries(priorities).map(([key, label]) => {
          const priority = key as NonNullable<
            OutingContext["priorities"]
          >[number];
          const selected = value.priorities?.includes(priority);
          return (
            <Chip
              key={key}
              label={label}
              selected={editable && selected}
              onPress={
                editable
                  ? () =>
                      onChange!({
                        ...value,
                        priorities: selected
                          ? value.priorities?.filter((p) => p !== priority)
                          : [...(value.priorities ?? []), priority],
                      })
                  : undefined
              }
            />
          );
        })}
      </View>
      <T style={{ color: colors.muted, fontSize: 11, lineHeight: 22 }}>
        تفضيلات مرنة لترتيب التجارب؛ نوع الطلعة لا يضمن مرافق للأطفال أو جلسات
        خاصة.
      </T>
    </View>
  );
}
