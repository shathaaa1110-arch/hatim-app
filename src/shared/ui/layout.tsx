import { type ReactNode, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowRight, Sparkles } from "lucide-react-native";
import { Button, Glass, IconButton, Notice, Row, Sheet, T } from "./primitives";
import { colors as c, fonts } from "../theme";

export function Page({
  children,
  title,
  subtitle,
  back,
  action,
}: {
  children: ReactNode;
  title: string;
  subtitle?: string;
  back?: () => void;
  action?: ReactNode;
}) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={s.page}
      >
        <Row style={{ justifyContent: "space-between", marginBottom: 12 }}>
          <Row>
            <Sparkles color={c.green} size={21} />
            <T weight="bold" style={{ fontSize: 24 }}>
              حاتم
            </T>
          </Row>
          {back ? (
            <IconButton icon={ArrowRight} label="رجوع" onPress={back} />
          ) : (
            action
          )}
        </Row>
        <View style={{ gap: 5 }}>
          <T weight="bold" style={s.title}>
            {title}
          </T>
          {subtitle && <T style={s.subtitle}>{subtitle}</T>}
        </View>
        {back && action}
        <View style={{ gap: 20 }}>{children}</View>
        <T style={s.footnote}>تجارب توضيحية · ذوقكم محفوظ، ووقتكم يتغيّر.</T>
      </ScrollView>
    </SafeAreaView>
  );
}
export function Panel({
  children,
  glass = false,
}: {
  children: ReactNode;
  glass?: boolean;
}) {
  return glass ? (
    <Glass style={s.panel}>{children}</Glass>
  ) : (
    <View style={s.panel}>{children}</View>
  );
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: 7 }}>
      <T weight="medium">{label}</T>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={c.muted}
        {...props}
        style={[s.input, props.style]}
      />
    </View>
  );
}
export function Loading() {
  return <ActivityIndicator color={c.green} style={{ padding: 45 }} />;
}
export function ErrorNotice({
  error,
  retry,
}: {
  error: string | null;
  retry?: () => void;
}) {
  return error ? (
    <View style={{ gap: 10 }}>
      <Notice warning text={error} />
      {retry && (
        <Button secondary small label="حاول مرة ثانية" onPress={retry} />
      )}
    </View>
  ) : null;
}
export type Confirmation = {
  title: string;
  text: string;
  label: string;
  run: () => Promise<unknown>;
};
/** Keep confirmation inside the current sheet when switching between member actions. */
export function ConfirmationContent({
  value,
  busy,
  done,
  back,
}: {
  value: Confirmation;
  busy: boolean;
  done: () => void;
  back: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const inFlight = useRef(false);
  useEffect(() => setError(null), [value]);
  const submit = async () => {
    if (busy || inFlight.current) return;
    inFlight.current = true;
    setSaving(true);
    setError(null);
    try {
      await value.run();
      done();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "تعذّر تنفيذ الإجراء. حاول مجددًا.",
      );
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  };
  return (
    <>
      <T style={{ lineHeight: 26 }}>{value.text}</T>
      <ErrorNotice error={error} />
      <Button
        label={value.label}
        busy={busy || saving}
        onPress={() => {
          void submit();
        }}
      />
      <Button secondary label="رجوع" disabled={busy || saving} onPress={back} />
    </>
  );
}
export function Confirm({
  value,
  busy,
  close,
}: {
  value: Confirmation | null;
  busy: boolean;
  close: () => void;
}) {
  return (
    <Sheet
      title={value?.title ?? ""}
      visible={!!value}
      onClose={() => {
        if (!busy) close();
      }}
    >
      {value && (
        <ConfirmationContent
          value={value}
          busy={busy}
          done={close}
          back={close}
        />
      )}
    </Sheet>
  );
}
export const s = StyleSheet.create({
  page: {
    padding: 24,
    paddingBottom: 40,
    gap: 22,
    width: "100%",
    maxWidth: 850,
    alignSelf: "center",
  },
  title: { fontSize: 34, lineHeight: 50 },
  subtitle: { fontSize: 14, color: c.muted, lineHeight: 26 },
  panel: {
    padding: 21,
    backgroundColor: c.white,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: c.line,
    gap: 15,
  },
  input: {
    minHeight: 52,
    padding: 14,
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 15,
    backgroundColor: c.white,
    color: c.ink,
    fontFamily: fonts.regular,
    textAlign: "right",
    fontSize: 16,
  },
  footnote: {
    color: c.muted,
    fontSize: 11,
    textAlign: "center",
    marginTop: 20,
  },
  heading: { fontSize: 22, lineHeight: 34 },
  muted: { color: c.muted, fontSize: 13, lineHeight: 24 },
  wrap: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 },
});
