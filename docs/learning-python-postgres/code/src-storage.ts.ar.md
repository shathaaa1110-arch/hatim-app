# شرح `src/storage.ts`

[فهرس الكود](README.ar.md) · [دروس البداية](../README.ar.md) · [قاموس الرموز](../01-foundations.ar.md) · [التنسيق](../08-components.ar.md)

المصدر: [الملف في النسخة المرجعية](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/storage.ts) · [الملف المحلي](../../../src/storage.ts). عدد الأسطر: 39. المقاطع التالية تعرض المصدر نفسه دون تعديل، والشرح خارج الكود.

## اختيار التخزين المحلي

[الأسطر 1–5](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/storage.ts#L1): SecureStore للمفتاح على الجهاز الأصلي و AsyncStorage لنسخة الويب. هذا تخزين بيانات وصول صغيرة، وليس قاعدة مجموعات التطبيق. Platform.OS يختار التنفيذ.

```typescript
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import type { Session } from "./api/client";

```

## واجهة تخزين موحدة

[الأسطر 6–20](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/storage.ts#L6): get و set و remove تقدم نفس الوعود Promise بغض النظر عن المنصة. المنادي ينتظرها بـ await. مفتاح المتصفح يتبع الموقع وملف المستخدم؛ رابط Cloudflare جديد لا يرى تخزين نطاق قديم.

```typescript
export const storage = {
  get: (key: string) =>
    Platform.OS === "web"
      ? AsyncStorage.getItem(key)
      : SecureStore.getItemAsync(key),
  set: (key: string, value: string) =>
    Platform.OS === "web"
      ? AsyncStorage.setItem(key, value)
      : SecureStore.setItemAsync(key, value),
  remove: (key: string) =>
    Platform.OS === "web"
      ? AsyncStorage.removeItem(key)
      : SecureStore.deleteItemAsync(key),
};

```

## قراءة جلسة المنظّم

[الأسطر 21–24](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/storage.ts#L21): نقرأ hatim.organizer.v1. عدم وجود قيمة يرجع null. JSON.parse يحول النص إلى قيمة unknown وقد يرمي خطأ إن كانت تالفة.

```typescript
export async function readSession(): Promise<Session | null> {
  const raw = await storage.get("hatim.organizer.v1");
  if (!raw) return null;
  try {
```

## رفض جلسة تالفة

[الأسطر 25–39](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/storage.ts#L25): نفحص أن القيمة كائن غير null وبها groupId و token من نوع string. هذا الفحص لا يفرض نصًا غير فارغ، ولا يحذف القيمة المحلية عند الفشل؛ يرجع null فقط. useOrganizer تحذف الجلسة إذا قرأت المجموعة ورد الخادم 404. صلاحية المفتاح لا يحسمها JSON.parse بل API.

```typescript
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed &&
      "groupId" in parsed &&
      "token" in parsed &&
      typeof parsed.groupId === "string" &&
      typeof parsed.token === "string"
    )
      return parsed as Session;
  } catch {
    /* A malformed local session can be safely replaced. */
  }
  return null;
}
```

## تأكدي من فهمك

اختاري مقطعًا واشرحي مدخلاته ونتيجته وما الذي يغيّره. ثم اكتبي مثالًا أصغر بنفس الفكرة في مجلد تدريب، واذكري ما يجب اختباره قبل دمجه.
