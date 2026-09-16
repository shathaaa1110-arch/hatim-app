import { type ReactNode } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type TextProps,
  type ViewProps,
  KeyboardAvoidingView,
} from "react-native";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { BlurView } from "expo-blur";
import { X, ArrowLeft, type LucideIcon } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors as c, fonts } from "../theme";

export function T({
  style,
  weight = "regular",
  ...props
}: TextProps & { weight?: keyof typeof fonts }) {
  return (
    <Text {...props} style={[s.text, { fontFamily: fonts[weight] }, style]} />
  );
}
export function Row({ style, ...props }: ViewProps) {
  return <View {...props} style={[s.row, style]} />;
}
export function Glass({ children, style, ...props }: ViewProps) {
  if (Platform.OS === "ios" && isLiquidGlassAvailable())
    return (
      <GlassView
        {...props}
        glassEffectStyle="regular"
        colorScheme="light"
        tintColor="rgba(255,255,255,0.2)"
        style={[s.glass, style]}
      >
        {children}
      </GlassView>
    );
  return (
    <BlurView
      {...props}
      intensity={45}
      tint="light"
      style={[s.glass, { backgroundColor: "rgba(255,255,255,.83)" }, style]}
    >
      {children}
    </BlurView>
  );
}
export function Button({
  label,
  onPress,
  secondary,
  icon: Icon = ArrowLeft,
  busy,
  disabled,
  small,
}: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  icon?: LucideIcon;
  busy?: boolean;
  disabled?: boolean;
  small?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        secondary && s.secondary,
        small && { paddingVertical: 9, minHeight: 44 },
        (disabled || busy) && { opacity: 0.55 },
        pressed && { opacity: 0.8, transform: [{ scale: 0.985 }] },
      ]}
    >
      <T
        weight="semibold"
        style={{
          color: secondary ? c.ink : c.white,
          fontSize: small ? 13 : 15,
        }}
      >
        {label}
      </T>
      {busy ? (
        <ActivityIndicator size="small" color={secondary ? c.ink : c.white} />
      ) : (
        <Icon size={18} strokeWidth={1.8} color={secondary ? c.ink : c.white} />
      )}
    </Pressable>
  );
}
export function IconButton({
  icon: Icon,
  label,
  onPress,
  active,
  light,
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  active?: boolean;
  light?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        s.iconButton,
        light && { backgroundColor: "rgba(255,255,255,.91)" },
        active && { backgroundColor: c.sageDark },
        pressed && { opacity: 0.65 },
      ]}
    >
      <Icon
        size={20}
        color={c.ink}
        fill={active ? c.ink : "none"}
        strokeWidth={1.65}
      />
    </Pressable>
  );
}
export function Chip({
  label,
  selected,
  onPress,
  icon: Icon,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: LucideIcon;
}) {
  const content = (
    <>
      <T
        weight={selected ? "semibold" : "medium"}
        style={{ fontSize: 13, color: selected ? c.white : c.ink }}
      >
        {label}
      </T>
      {Icon && <Icon size={15} color={selected ? c.white : c.ink} />}
    </>
  );
  return onPress ? (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        s.chip,
        selected && { backgroundColor: c.green, borderColor: c.green },
      ]}
    >
      {content}
    </Pressable>
  ) : (
    <View
      style={[
        s.chip,
        {
          backgroundColor: c.sage,
          borderColor: "transparent",
          minHeight: 29,
          paddingVertical: 2,
        },
      ]}
    >
      {content}
    </View>
  );
}
export function Sheet({
  title,
  visible,
  onClose,
  children,
}: {
  title: string;
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={s.backdrop}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          accessibilityLabel="إغلاق النافذة"
          onPress={onClose}
        />
        <SafeAreaView edges={["bottom"]} style={s.sheet}>
          <View style={s.handle} />
          <Row style={s.sheetHeader}>
            <T weight="semibold" style={{ fontSize: 23, flex: 1 }}>
              {title}
            </T>
            <IconButton icon={X} label="إغلاق" onPress={onClose} />
          </Row>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 24, paddingTop: 8 }}
          >
            <View style={{ gap: 20 }}>{children}</View>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
export function Notice({
  text,
  warning = false,
}: {
  text: string;
  warning?: boolean;
}) {
  return (
    <View
      accessibilityRole={warning ? "alert" : "text"}
      style={[s.notice, warning && { backgroundColor: c.peach }]}
    >
      <T
        style={{
          fontSize: 13,
          lineHeight: 24,
          color: warning ? c.warning : c.green,
        }}
      >
        {text}
      </T>
    </View>
  );
}
export function Empty({
  icon: Icon,
  title,
  text,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
}) {
  return (
    <View style={{ padding: 38, alignItems: "center", gap: 13 }}>
      <View style={{ padding: 20, backgroundColor: c.sage, borderRadius: 30 }}>
        <Icon size={32} color={c.green} strokeWidth={1.4} />
      </View>
      <T weight="semibold" style={{ fontSize: 23, textAlign: "center" }}>
        {title}
      </T>
      <T style={{ color: c.muted, textAlign: "center", lineHeight: 25 }}>
        {text}
      </T>
    </View>
  );
}

const s = StyleSheet.create({
  text: {
    fontSize: 15,
    color: c.ink,
    textAlign: "right",
    writingDirection: "rtl",
  },
  row: { flexDirection: "row-reverse", alignItems: "center", gap: 10 },
  glass: {
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.55)",
    borderRadius: 24,
  },
  button: {
    flexDirection: "row-reverse",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 22,
    paddingVertical: 12,
    minHeight: 52,
    borderRadius: 17,
    backgroundColor: c.green,
  },
  secondary: { backgroundColor: c.sage },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: c.sage,
  },
  chip: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    minHeight: 42,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: c.line,
    backgroundColor: "transparent",
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(20,42,33,.4)",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  sheet: {
    backgroundColor: c.background,
    width: "100%",
    maxWidth: 620,
    maxHeight: "93%",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: "hidden",
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#CCD4C8",
    alignSelf: "center",
    marginTop: 12,
  },
  sheetHeader: { paddingHorizontal: 24, paddingVertical: 15 },
  notice: { padding: 16, borderRadius: 16, backgroundColor: c.sage },
});
