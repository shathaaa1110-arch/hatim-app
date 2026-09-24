import { OutingContextForm } from "./OutingContextForm";
import { View } from "react-native";
import type {
  Experience,
  Group,
  Preferences,
  OutingContext,
} from "../../shared/contracts";
import { emptyPreferences } from "../../shared/preferences";
import { ar } from "../../shared/theme";
import { Chip, Notice, T } from "../../shared/ui/primitives";
import { PreferencesForm } from "../../shared/ui/PreferencesForm";

export type StartIntent = { kind: "anchor" | "pocket"; id: string };

export function PlanSetupContent({
  group,
  accountName,
  busy,
  initialSlots,
  setInitialSlots,
  startIntent,
  catalog,
  context,
  setContext,
  onSave,
}: {
  group: Group | null;
  accountName: string;
  busy: boolean;
  initialSlots: number;
  setInitialSlots: (slots: number) => void;
  startIntent: StartIntent | null;
  catalog: Experience[];
  context: OutingContext;
  setContext: (context: OutingContext) => void;
  onSave: (preferences: Preferences) => Promise<void>;
}) {
  return (
    <>
      {!group && (
        <>
          <Notice text="نراعي ذوقك وقيودك قبل ترتيب الخطة. تضيف رفقة هذه الطلعة لاحقًا، والقروب الدائم اختياري." />
          <T weight="semibold">كم خانة وجبات عندك؟</T>
          <View
            style={{
              flexDirection: "row-reverse",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            {[1, 3, 5, 9].map((slots) => (
              <Chip
                key={slots}
                label={slots === 1 ? "عشاء واحد" : `${ar(slots)} خانات`}
                selected={initialSlots === slots}
                onPress={() => setInitialSlots(slots)}
              />
            ))}
          </View>
          <OutingContextForm
            value={context}
            onChange={setContext}
            disabled={busy}
          />
          {startIntent && (
            <Notice
              text={`اختيارك محفوظ: ${catalog.find((e) => e.id === startIntent.id)?.title ?? "التجربة"} ${startIntent.kind === "anchor" ? "ستكون الركيزة" : "ستُحفظ في الجيب"}.`}
            />
          )}
        </>
      )}
      <PreferencesForm
        initial={
          group?.members.find((m) => m.organizer)?.preferences ?? {
            ...emptyPreferences,
            name: accountName,
          }
        }
        busy={busy}
        label={group ? "حفظ ذوقي" : "ابنِ خطتي"}
        onSave={onSave}
      />
    </>
  );
}
