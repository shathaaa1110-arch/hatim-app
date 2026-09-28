# شرح `src/useOrganizer.ts`

[فهرس الكود](README.ar.md) · [دروس البداية](../README.ar.md) · [قاموس الرموز](../01-foundations.ar.md) · [التنسيق](../08-components.ar.md)

المصدر: [الملف في النسخة المرجعية](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/useOrganizer.ts) · [خريطة الملفات الحالية](../../architecture-modules.ar.md). عدد الأسطر: 121. المقاطع التالية تعرض المصدر نفسه دون تعديل، والشرح خارج الكود.

## Hook لإدارة رحلة المنظّم

[الأسطر 1–12](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/useOrganizer.ts#L1): يجمع الاستيراد API والتخزين وأنواع البيانات. هذا custom hook: دالة use... تستخدم Hooks ثم ترجع حالة وعمليات. لا يعرض JSX ولا يفتح اتصال PostgreSQL.

```typescript
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import {
  api,
  ApiError,
  type Group,
  type Preferences,
  type Session,
  type Settings,
} from "./api/client";
import { readSession, storage } from "./storage";

```

## ذاكرة الواجهة

[الأسطر 13–20](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/useOrganizer.ts#L13): useState تحفظ session و group و loading و busy و error. useRef تحفظ writing كقيمة boolean و epoch كعدد؛ تعديل ref لا يطلب إعادة عرض. هذه ذاكرة العميل الحالية، و DB مصدر بيانات المجموعة الدائم.

```typescript
export function useOrganizer() {
  const [session, setSession] = useState<Session | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const writing = useRef(false);
  const epoch = useRef(0);
```

## استعادة المجموعة

[الأسطر 21–39](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/useOrganizer.ts#L21): restore تقرأ الجلسة المحلية ثم تطلب المجموعة. عند 404 تمسح جلسة لم تعد صالحة. عند فشل شبكة نحتفظ بالمفتاح كي نستطيع المحاولة لاحقًا. finally تنهي مؤشر التحميل.

```typescript
  const restore = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const saved = await readSession();
      if (saved) {
        setSession(saved);
        setGroup(await api.group(saved));
      }
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        await storage.remove("hatim.organizer.v1");
        setSession(null);
        setGroup(null);
      } else setError(e instanceof Error ? e.message : "تعذّر تحميل المجموعة.");
    } finally {
      setLoading(false);
    }
  }, []);
```

## أول تشغيل

[الأسطر 40–42](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/useOrganizer.ts#L40): useEffect مع اعتماد restore يبدأ الاستعادة. useCallback أعلاه يثبت مرجع الدالة بحسب اعتماداته؛ لا يعني تخزين نتيجة API إلى الأبد.

```typescript
  useEffect(() => {
    void restore();
  }, [restore]);
```

## بدء التحديث الدوري

[الأسطر 43–46](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/useOrganizer.ts#L43): التأثير لا يعمل بلا session. alive تحدد أن التأثير ما زال صالحًا و fetching تمنع تداخل قراءتين. هذا المسار لا يمرر AbortSignal؛ يحمي تطبيق الرد بدل إلغاء fetch فعليًا.

```typescript
  useEffect(() => {
    if (!session) return;
    let alive = true;
    let fetching = false;
```

## حماية القراءة القديمة

[الأسطر 47–64](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/useOrganizer.ts#L47): refresh تتجنب القراءة أثناء writing أو fetching أو وجود التطبيق في الخلفية. تلتقط epoch قبل GET ولا تطبق النجاح إذا تغير أو انتهى التأثير. هكذا لا تكتب قراءة بدأت قبل الحفظ حالة أقدم فوق نتيجة الحفظ.

```typescript
    const refresh = async () => {
      if (writing.current || fetching || AppState.currentState === "background")
        return;
      fetching = true;
      const version = epoch.current;
      try {
        const next = await api.group(session);
        if (alive && !writing.current && version === epoch.current) {
          setGroup(next);
          setError(null);
        }
      } catch (e) {
        if (alive)
          setError(e instanceof Error ? e.message : "تعذّر تحديث المجموعة.");
      } finally {
        fetching = false;
      }
    };
```

## موعد إعادة القراءة

[الأسطر 65–68](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/useOrganizer.ts#L65): setInterval تقرأ كل 6 ثوانٍ. AppState listener يقرأ أيضًا عند عودة التطبيق إلى active. هذه طلبات polling منفصلة، لا WebSocket.

```typescript
    const interval = setInterval(refresh, 6000);
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") void refresh();
    });
```

## إنهاء التأثير

[الأسطر 69–74](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/useOrganizer.ts#L69): التنظيف يضع alive=false ويمسح المؤقت ويزيل AppState listener. الطلب الذي بدأ قد ينتهي لكن لا يطبق نجاحه بعد الإغلاق. تغير session ينشئ تأثيرًا جديدًا.

```typescript
    return () => {
      alive = false;
      clearInterval(interval);
      listener.remove();
    };
  }, [session]);
```

## غلاف عمليات الحفظ

[الأسطر 75–90](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/useOrganizer.ts#L75): run ترفض بدء كتابة ثانية أثناء writing، ثم تزيد epoch وتضبط busy وتمسح error. تنتظر operation، والدالة الممررة نفسها تحدث group. catch تحفظ الرسالة وتعيد الخطأ؛ finally تعيد writing و busy. هذا منع تداخل محلي وليس دمج تعديلات من جهازين.

```typescript
  const run = async (operation: () => Promise<void>) => {
    if (writing.current) return;
    writing.current = true;
    epoch.current++;
    setBusy(true);
    setError(null);
    try {
      await operation();
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذّر حفظ التغيير.");
      throw e;
    } finally {
      writing.current = false;
      setBusy(false);
    }
  };
```

## ما يحصل عليه المكوّن

[الأسطر 91–96](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/useOrganizer.ts#L91): الكائن المرجع يجمع الحالة و restore مع عمليات عالية المستوى. تستطيع Organizer استعماله دون معرفة تفاصيل fetch.

```typescript
  return {
    group,
    loading,
    busy,
    error,
    restore,
```

## إنشاء المجموعة وحفظ المفتاح

[الأسطر 97–107](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/useOrganizer.ts#L97): create تنتظر POST، ثم تكتب Session في التخزين المحلي وتحدّث الحالة. المفتاح الخام يحتاجه الجهاز لإثبات الإدارة في الطلب القادم؛ الخادم يحتفظ ببصمته.

```typescript
    create: (preferences: Preferences) =>
      run(async () => {
        const result = await api.create(preferences);
        const next = {
          groupId: result.group.id,
          token: result.organizer_token,
        };
        await storage.set("hatim.organizer.v1", JSON.stringify(next));
        setSession(next);
        setGroup(result.group);
      }),
```

## تعديل الإعدادات والملف والعضوية

[الأسطر 108–121](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/useOrganizer.ts#L108): الدوال تستدعي api عبر run. يُقرأ الملف الناتج من الخادم بعد كل كتابة. updateSettings تستقبل Settings كاملة وليست رقعة حقول؛ الشاشة تنسخ القيم السابقة وتغيّر المطلوب.

```typescript
    settings: (settings: Settings) =>
      run(async () => {
        if (session) setGroup(await api.settings(session, settings));
      }),
    profile: (preferences: Preferences) =>
      run(async () => {
        if (session) setGroup(await api.profile(session, preferences));
      }),
    remove: (id: string) =>
      run(async () => {
        if (session) setGroup(await api.remove(session, id));
      }),
  };
}
```

## تأكدي من فهمك

اختاري مقطعًا واشرحي مدخلاته ونتيجته وما الذي يغيّره. ثم اكتبي مثالًا أصغر بنفس الفكرة في مجلد تدريب، واذكري ما يجب اختباره قبل دمجه.
