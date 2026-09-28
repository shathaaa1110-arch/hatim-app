# شرح `App.tsx`

[فهرس الكود](README.ar.md) · [دروس البداية](../README.ar.md) · [قاموس الرموز](../01-foundations.ar.md) · [التنسيق](../08-components.ar.md)

المصدر: [الملف في النسخة المرجعية](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/App.tsx) · [الملف المحلي](../../../App.tsx). عدد الأسطر: 44. المقاطع التالية تعرض المصدر نفسه دون تعديل، والشرح خارج الكود.

## تجميع المداخل

[الأسطر 1–13](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/App.tsx#L1): import تجلب الخطوط والمكوّنات من ملفات أخرى. SafeAreaProvider يعطي معلومات حواف الجهاز، وليس مزودًا للبيانات. استيراد WebDocument يختار Metro نسخته المناسبة للمنصة.

```tsx
import { ActivityIndicator, Platform, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import { IBMPlexSansArabic_400Regular } from "@expo-google-fonts/ibm-plex-sans-arabic/400Regular";
import { IBMPlexSansArabic_500Medium } from "@expo-google-fonts/ibm-plex-sans-arabic/500Medium";
import { IBMPlexSansArabic_600SemiBold } from "@expo-google-fonts/ibm-plex-sans-arabic/600SemiBold";
import { IBMPlexSansArabic_700Bold } from "@expo-google-fonts/ibm-plex-sans-arabic/700Bold";
import { Organizer } from "./src/screens/Organizer";
import { InviteScreen } from "./src/screens/InviteScreen";
import { colors } from "./src/theme";
import { WebDocument } from "./src/components/WebDocument";

```

## انتظار الخط

[الأسطر 14–20](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/App.tsx#L14): App مكوّن React. useFonts يبدأ تحميل ملفات الخط ويرجع جاهزية أو خطأ. ننتظر ما دام التحميل مستمرًا؛ الخطأ يسمح بإظهار التطبيق بخط بديل بدل شاشة انتظار دائمة.

```tsx
export default function App() {
  const [loaded, fontError] = useFonts({
    IBMPlexSansArabic_400Regular,
    IBMPlexSansArabic_500Medium,
    IBMPlexSansArabic_600SemiBold,
    IBMPlexSansArabic_700Bold,
  });
```

## اختيار الرحلة

[الأسطر 21–28](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/App.tsx#L21): على الويب نقرأ pathname و querystring لاختيار صفحة الدعوة. ?preview=organizer باب معاينة تطوير للواجهة، وليس تجاوزًا لصلاحيات الخادم. regex تقبل رمزًا من حروف وأرقام وشرطة وشرطة سفلية مع شرطة مائلة طرفية اختيارية؛ ?.[1] تقرأ مجموعة الالتقاط و?? null تعالج غياب التطابق. على iPhone نعرض Organizer.

```tsx
  const web = Platform.OS === "web";
  const organizerPreview =
    web &&
    new URLSearchParams(window.location.search).get("preview") === "organizer";
  const inviteCode = web
    ? (window.location.pathname.match(/^\/join\/([A-Za-z0-9_-]+)\/?$/)?.[1] ??
      null)
    : null;
```

## شجرة الواجهة

[الأسطر 29–44](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/App.tsx#L29): JSX يصف مكوّنات متداخلة. WebDocument يضبط صفحة الويب، و StatusBar يضبط شريط النظام. الشرط يختار Organizer أو InviteScreen. قراءة هذا الملف من الخارج للداخل تكشف نقطة دخول العرض فقط؛ منطق كل شاشة في ملفها.

```tsx
  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <WebDocument />
        <StatusBar style="dark" />
        {!loaded && !fontError ? (
          <ActivityIndicator style={{ flex: 1 }} color={colors.green} />
        ) : web && !organizerPreview ? (
          <InviteScreen code={inviteCode} />
        ) : (
          <Organizer />
        )}
      </View>
    </SafeAreaProvider>
  );
}
```

## تأكدي من فهمك

اختاري مقطعًا واشرحي مدخلاته ونتيجته وما الذي يغيّره. ثم اكتبي مثالًا أصغر بنفس الفكرة في مجلد تدريب، واذكري ما يجب اختباره قبل دمجه.
