# شرح `src/components/ui.tsx`

[فهرس الكود](README.ar.md) · [دروس البداية](../README.ar.md) · [قاموس الرموز](../01-foundations.ar.md) · [التنسيق](../08-components.ar.md)

المصدر: [الملف في النسخة المرجعية](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/components/ui.tsx) · [خريطة الملفات الحالية](../../architecture-modules.ar.md). عدد الأسطر: 355. المقاطع التالية تعرض المصدر نفسه دون تعديل، والشرح خارج الكود.

## أدوات المكوّنات الأساسية

[الأسطر 1–20](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/components/ui.tsx#L1): استيرادات React Native و Expo تبني الكتابة واللمس والتمويه والـ Modal. Lucide للأيقونات. ربط الألوان والخطوط بالـ theme يجعل هذه المكوّنات متسقة.

```tsx
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

```

## T: النص المشترك

[الأسطر 21–29](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/components/ui.tsx#L21): Wrapper فوق Text يضع الخط واتجاه الكتابة واللون، ثم يقبل props بقية Text. children هو النص أو العقد التي نضعها داخل <T>. الأنماط اللاحقة تستطيع تخصيص الافتراضي.

```tsx
export function T({
  style,
  weight = "regular",
  ...props
}: TextProps & { weight?: keyof typeof fonts }) {
  return (
    <Text {...props} style={[s.text, { fontFamily: fonts[weight] }, style]} />
  );
}
```

## Row: صف عربي

[الأسطر 30–32](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/components/ui.tsx#L30): View صغير يطبق صفًا باتجاه مناسب للواجهة. لا يكرر الأب ترتيب كل عنصر يدويًا.

```tsx
export function Row({ style, ...props }: ViewProps) {
  return <View {...props} style={[s.row, style]} />;
}
```

## Glass: اختيار التأثير المتاح

[الأسطر 33–56](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/components/ui.tsx#L33): نفحص المنصة وتوفر Liquid Glass وقت التشغيل. عند الدعم نستعمل GlassView، وإلا BlurView مع ألوان شفافة. الشفافية وحدها ليست تأثير iOS الأصلي. props تسمح بتخصيص الإطار دون نسخ منطق التوافق.

```tsx
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
```

## Button: عقد الاستخدام

[الأسطر 57–73](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/components/ui.tsx#L57): نوع Button يعلن label و onPress، ثم secondary و icon و busy و disabled و small اختيارات. icon افتراضيها ArrowLeft. العلامة ? تجعل الخاصية اختيارية. لا توجد props باسم title أو variant في هذه النسخة.

```tsx
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
```

## Button: العرض والاستجابة

[الأسطر 74–104](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/components/ui.tsx#L74): Pressable يستدعي onPress عند التفاعل ما لم يكن معطّلًا. style دالة ترى pressed فتغير المظهر. التحميل يعرض مؤشرًا ويمنع التكرار. accessibilityRole وحالة التعطيل يساعدان قارئ الشاشة.

```tsx
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
```

## IconButton

[الأسطر 105–138](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/components/ui.tsx#L105): IconButton تعرض مكوّن Icon داخل هدف 44×44. label اسم وصول يشرح الرمز، active تغير الخلفية والتعبئة و light تغير الخلفية. onPress من الأب؛ هذا المكوّن لا يملك disabled ضمن عقده الحالي.

```tsx
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
```

## Chip

[الأسطر 139–188](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/components/ui.tsx#L139): خيار مختصر يظهر selected وتبديل onPress. يستخدم في المطابخ والفلاتر. اللون المحدد يعكس prop قادمة من الأب؛ Chip لا تحفظ اختيارًا دائمًا بنفسها.

```tsx
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
```

## Sheet

[الأسطر 189–234](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/components/ui.tsx#L189): Modal فوق الصفحة مع خلفية يمكن إغلاقها ولوحة محتوى. KeyboardAvoidingView تساعد عند فتح لوحة المفاتيح. SafeArea والحجم يراعيان الشاشة. visible و onClose مملوكان للأب، و children تسمح بأي نموذج.

```tsx
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
```

## Notice

[الأسطر 235–258](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/components/ui.tsx#L235): Notice تستقبل text و warning boolean. warning تغير الخلفية ولون النص ودور الوصول إلى alert، وإلا رسالة عادية. لا أيقونة ولا أنواع success/info منفصلة في هذا المكوّن.

```tsx
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
```

## Empty

[الأسطر 259–282](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/components/ui.tsx#L259): Empty تعرض icon و title و text في حاوية مركزية عند غياب النتائج. لا زر إجراء مدمج؛ تستطيع الشاشة إضافة زر بجوارها حسب الرحلة.

```tsx
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

```

## التنسيق البصري

[الأسطر 283–355](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/components/ui.tsx#L283): هذه الأنماط تحدد أبعاد الأزرار والزجاج والشرائح واللوحة والحالات الفارغة؛ borderRadius يدوّر الحواف و opacity يبين التعطيل. كل خاصية تنسيق مشروحة في جدول الدرس 08. الكائنات هنا أسماء أنماط نمررها إلى style؛ لا ترسل طلبات ولا تعدل DB. ترتيب مصفوفة style يسمح للخصائص اللاحقة بتعديل الأساسية.

```tsx
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
```

## تأكدي من فهمك

اختاري مقطعًا واشرحي مدخلاته ونتيجته وما الذي يغيّره. ثم اكتبي مثالًا أصغر بنفس الفكرة في مجلد تدريب، واذكري ما يجب اختباره قبل دمجه.
