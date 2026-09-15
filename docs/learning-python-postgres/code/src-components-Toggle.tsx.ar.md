# شرح `src/components/Toggle.tsx`

[فهرس الكود](README.ar.md) · [دروس البداية](../README.ar.md) · [قاموس الرموز](../01-foundations.ar.md) · [التنسيق](../08-components.ar.md)

المصدر: [الملف في النسخة المرجعية](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/components/Toggle.tsx) · [الملف المحلي](../../../src/components/Toggle.tsx). عدد الأسطر: 42. المقاطع التالية تعرض المصدر نفسه دون تعديل، والشرح خارج الكود.

## سويتش Expo UI

[الأسطر 1–5](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/components/Toggle.tsx#L1): Switch و Host من Expo UI تعطيان التحكم البصري. Pressable و View من React Native لتنظيم لمس ووصول واحد؛ لا يستورد هذا الملف Row أو T.

```tsx
import { Pressable, View } from "react-native";
import { Host, Switch } from "@expo/ui";
import { colors } from "../theme";

// One accessible 44pt target; the Expo UI control provides the native visual.
```

## مدخلات واضحة

[الأسطر 6–16](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/components/Toggle.tsx#L6): value الحالة الحالية، onValueChange دالة الحالة التالية، label اسم الوصول، و testID معرف الاختبار. جميعها مطلوبة. لا description أو disabled في العقد الحالي.

```tsx
export function Toggle({
  value,
  onValueChange,
  label,
  testID,
}: {
  value: boolean;
  onValueChange: (value: boolean) => void;
  label: string;
  testID: string;
}) {
```

## ضغط الصف

[الأسطر 17–26](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/components/Toggle.tsx#L17): Pressable مساحة واحدة 54×44 ودورها switch وحالتها checked. الضغط يستدعي onValueChange(!value). أيقونة التحكم داخلها لا تلتقط ضغطًا ثانيًا لأن View الداخلية تعطل pointerEvents.

```tsx
  return (
    <Pressable
      testID={testID}
      accessible
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      onPress={() => onValueChange(!value)}
      style={{ width: 54, height: 44, justifyContent: "center" }}
    >
```

## عرض التحكم والوصف

[الأسطر 27–42](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/components/Toggle.tsx#L27): pointerEvents=none يمنع ضغط الأبناء وإخفاء وصولهم يمنع تكرار المفتاح لقارئ الشاشة. Host يحدد اللون والسياق والحجم، و Switch تأخذ value و onValueChange. المظهر يتبع قيمة الأب، بلا شبكة أو تخزين.

```tsx
      <View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Host
          seedColor={colors.green}
          colorScheme="light"
          style={{ width: 54, height: 34 }}
        >
          <Switch value={value} onValueChange={onValueChange} />
        </Host>
      </View>
    </Pressable>
  );
}
```

## تأكدي من فهمك

اختاري مقطعًا واشرحي مدخلاته ونتيجته وما الذي يغيّره. ثم اكتبي مثالًا أصغر بنفس الفكرة في مجلد تدريب، واذكري ما يجب اختباره قبل دمجه.
