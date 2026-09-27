import { View } from "react-native";
import { Chip, T } from "../../shared/ui/primitives";
import { Field, s } from "../../shared/ui/layout";
import type { InvitationDetails } from "./api";
import { themes } from "./presentation";

export function InvitationForm({
  value,
  onChange,
  disabled,
}: {
  value: InvitationDetails;
  onChange: (value: InvitationDetails) => void;
  disabled: boolean;
}) {
  return (
    <View style={{ gap: 20 }}>
      <T weight="semibold">اختاري طابع الدعوة</T>
      <View style={s.wrap}>
        {Object.entries(themes).map(([key, theme]) => (
          <Chip
            key={key}
            label={theme.name}
            selected={value.theme === key}
            onPress={() => {
              if (!disabled)
                onChange({
                  ...value,
                  theme: key as InvitationDetails["theme"],
                });
            }}
          />
        ))}
      </View>
      <Field
        label="عنوان الدعوة"
        value={value.title}
        onChangeText={(title) => onChange({ ...value, title })}
        maxLength={60}
        editable={!disabled}
      />
      <Field
        label="رسالتك للرفقة"
        value={value.message ?? ""}
        onChangeText={(message) => onChange({ ...value, message })}
        maxLength={200}
        multiline
        editable={!disabled}
      />
      <Field
        label="متى نتلاقى؟ (اختياري)"
        value={value.when_label ?? ""}
        onChangeText={(when_label) => onChange({ ...value, when_label })}
        maxLength={80}
        placeholder="اليوم والوقت، مثل: الخميس ٨ مساءً"
        editable={!disabled}
      />
      <Field
        label="مكان التجمع (اختياري)"
        value={value.meeting_note ?? ""}
        onChangeText={(meeting_note) => onChange({ ...value, meeting_note })}
        maxLength={100}
        placeholder="مثل: عند مدخل المكان"
        editable={!disabled}
      />
      <T style={s.muted}>
        اتركي الموعد والمكان فارغين إذا ما اتفقتوا بعد. يظهر فقط اللي تكتبينه.
      </T>
    </View>
  );
}
