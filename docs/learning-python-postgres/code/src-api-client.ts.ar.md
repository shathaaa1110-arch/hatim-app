# شرح `src/api/client.ts`

[فهرس الكود](README.ar.md) · [دروس البداية](../README.ar.md) · [قاموس الرموز](../01-foundations.ar.md) · [التنسيق](../08-components.ar.md)

المصدر: [الملف في النسخة المرجعية](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/api/client.ts) · [خريطة الملفات الحالية](../../architecture-modules.ar.md). عدد الأسطر: 135. المقاطع التالية تعرض المصدر نفسه دون تعديل، والشرح خارج الكود.

## أنواع من عقد الخادم

[الأسطر 1–13](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/api/client.ts#L1): import type يجلب وصفًا أثناء فحص TypeScript، لا مكتبة تشغيل. aliases تعطي أسماء قصيرة لأنواع components.schemas المولدة. Session نوع محلي بحقلين groupId و token؛ token هنا مفتاح المنظّم، وليس حساب مستخدم أو جلسة خادم.

```typescript
import { Platform } from "react-native";
import { isDevice } from "expo-device";
import type { components } from "./schema";

export type Preferences = components["schemas"]["Preferences"];
export type Experience = components["schemas"]["Experience"];
export type Group = components["schemas"]["GroupView"];
export type Settings = components["schemas"]["Settings"];
export type Member = components["schemas"]["Member"];
export type Decision = components["schemas"]["Decision"];
export type Invite = components["schemas"]["InviteView"];
export type Session = { groupId: string; token: string };

```

## عنوان API بحسب الجهاز

[الأسطر 14–27](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/api/client.ts#L14): configuredOrigin تقرأ EXPO_PUBLIC_API_URL أو localhost افتراضيًا كما هي. API_ORIGIN للمتصفح سلسلة فارغة، فتكون /api على موقع الصفحة نفسه؛ محاكي iOS يتصل بـ localhost:8000 والهاتف الحقيقي بالعنوان المهيأ. PUBLIC_ORIGIN منفصلة كي تكون دعوة المحاكي قابلة للفتح خارجه. لا تضع هذه القيم كلمة مرور DB.

```typescript
const configuredOrigin =
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8000";

// The iOS simulator reaches the Mac directly, even when the public tunnel stops.
export const API_ORIGIN =
  Platform.OS === "web"
    ? ""
    : Platform.OS === "ios" && !isDevice
      ? "http://localhost:8000"
      : configuredOrigin;
// Invitations still need the public address, including when copied in the simulator.
export const PUBLIC_ORIGIN =
  Platform.OS === "web" ? window.location.origin : configuredOrigin;

```

## خطأ يمكن تمييزه

[الأسطر 28–36](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/api/client.ts#L28): ApiError ترث Error وتضيف status. الواجهة تستخدم 404 مثلًا لمسح جلسة مجموعة حُذفت، بدل مساواة كل خطأ بانقطاع الشبكة.

```typescript
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

```

## دالة الطلب العامة

[الأسطر 37–45](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/api/client.ts#L37): request<T> تستقبل path وكائن options اختياريًا؛ method و token و body و signal حقول اختيارية. T وصف نوع النتيجة المتوقعة، و Promise<T> تعني نتيجة لاحقة. المهلة ثابتة 12 ثانية أدناه وليست خيارًا في العقد.

```typescript
async function request<T>(
  path: string,
  options: {
    method?: string;
    token?: string;
    body?: unknown;
    signal?: AbortSignal;
  } = {},
): Promise<T> {
```

## الإلغاء والانتظار

[الأسطر 46–49](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/api/client.ts#L46): AbortController ينهي طلبًا طويلًا. timeout يستدعي abort، وإشارة المستدعي تستطيع إلغاءه أيضًا. finally أدناه ينظف المؤقت والمستمع حتى عند الخطأ.

```typescript
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  const cancel = () => controller.abort();
  options.signal?.addEventListener("abort", cancel);
```

## إرسال HTTP

[الأسطر 50–60](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/api/client.ts#L50): fetch تجمع API_ORIGIN و/api و path. method افتراضيها GET. Content-Type يعلن JSON و Authorization يضاف عند وجود token. الجسم يحول بـ JSON.stringify إذا عُرف، و signal تربط الطلب بوحدة الإلغاء.

```typescript
  try {
    const response = await fetch(`${API_ORIGIN}/api${path}`, {
      method: options.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
    });
```

## رد فشل من الخادم

[الأسطر 61–75](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/api/client.ts#L61): إذا لم يكن الرد ناجحًا، فإن أي حالة 500 أو أعلى تتحول إلى رسالة عدم توفر دون محاولة تفسير الجسم. بقية الأخطاء تحاول قراءة JSON و detail نصية، وإلا رسالة تحقق عامة. status تحفظ مع ApiError لتستطيع الشاشة تمييز 404.

```typescript
    if (!response.ok) {
      if (response.status >= 500) {
        throw new ApiError(
          "حاتم غير متاح مؤقتًا. حاول مرة ثانية بعد شوي.",
          response.status,
        );
      }
      const data = await response.json().catch(() => ({}));
      throw new ApiError(
        typeof data.detail === "string"
          ? data.detail
          : "راجع البيانات وحاول مرة ثانية.",
        response.status,
      );
    }
```

## رد النجاح أو مشكلة اتصال

[الأسطر 76–82](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/api/client.ts#L76): مسار النجاح يتوقع JSON دائمًا ويصفها كـ T؛ as T لا يتحقق وقت التشغيل. المسارات الحالية حتى DELETE ترجع JSON. لا يوجد فرع 204 هنا. catch يحافظ على ApiError، ويحول فشل الشبكة أو الإلغاء أو JSON غير الصالحة إلى رسالة اتصال بحالة 0.

```typescript
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      "ما قدرنا نتصل بحاتم. تأكد من الاتصال وحاول مرة ثانية.",
      0,
    );
```

## تنظيف الموارد

[الأسطر 83–88](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/api/client.ts#L83): finally تعمل في النجاح والفشل. تمسح المؤقت وتزيل مستمع الإلغاء فلا يبقى callback بعد انتهاء الطلب.

```typescript
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener("abort", cancel);
  }
}

```

## عمليات الكتالوج والمجموعة

[الأسطر 89–109](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/api/client.ts#L89): api تجمع أسماء فوق request. catalog تقرأ و create ترسل preferences داخل كائن؛ عنوان المجموعة الافتراضي يأتي من الخادم. group و settings و profile تتطلب Session: s.token يدخل الرأس، و s.groupId يحدد المورد. settings و profile ترسلان PUT بأجسام كاملة.

```typescript
export const api = {
  catalog: () => request<Experience[]>("/experiences"),
  create: (preferences: Preferences) =>
    request<components["schemas"]["GroupCreated"]>("/groups", {
      method: "POST",
      body: { preferences },
    }),
  group: (s: Session) =>
    request<Group>(`/groups/${s.groupId}`, { token: s.token }),
  settings: (s: Session, body: Settings) =>
    request<Group>(`/groups/${s.groupId}/settings`, {
      method: "PUT",
      token: s.token,
      body,
    }),
  profile: (s: Session, body: Preferences) =>
    request<Group>(`/groups/${s.groupId}/profile`, {
      method: "PUT",
      token: s.token,
      body,
    }),
```

## حذف عضو وقراءة الدعوة

[الأسطر 110–114](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/api/client.ts#L110): remove يرسل DELETE لإدارة العضوية. invite تستخدم رمز الرابط للوصول إلى العرض المشترك. العضو لا يحصل من هذا المسار على ownerToken أو تفضيلات الآخرين.

```typescript
  remove: (s: Session, id: string) =>
    request<Group>(`/groups/${s.groupId}/members/${id}`, {
      method: "DELETE",
      token: s.token,
    }),
```

## ملف العضو

[الأسطر 115–126](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/api/client.ts#L115): join يرسل التفضيلات لأول مرة ويرجع memberToken. me تقرأ الملف الشخصي و preferences تستبدله باستخدام مفتاح ذلك العضو. نفس طريقة HTTP لا تعني نفس الصلاحية؛ المسار والمفتاح يحددان العملية.

```typescript
  invite: (code: string) => request<Invite>(`/invites/${code}`),
  join: (code: string, body: Preferences) =>
    request<components["schemas"]["MemberCreated"]>(
      `/invites/${code}/members`,
      { method: "POST", body },
    ),
  me: (code: string, token: string) =>
    request<Member>(`/invites/${code}/me`, { token }),
  updateMe: (code: string, token: string, body: Preferences) =>
    request<Member>(`/invites/${code}/me`, { method: "PUT", token, body }),
};

```

## قيم النموذج الأولية

[الأسطر 127–135](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/api/client.ts#L127): emptyPreferences كائن قيم بدء للنموذج: اسم فارغ، مقيم، قوائم فارغة، نباتي/حار false، ميزانية 200. النسخ داخل النموذج تمنع تعديل هذا الكائن مباشرة. لا يظهر عضو في PostgreSQL حتى ينجح POST.

```typescript
export const emptyPreferences: Preferences = {
  name: "",
  role: "مقيم",
  cuisines: [],
  allergies: [],
  vegetarian: false,
  mild: false,
  budget: 200,
};
```

## تأكدي من فهمك

اختاري مقطعًا واشرحي مدخلاته ونتيجته وما الذي يغيّره. ثم اكتبي مثالًا أصغر بنفس الفكرة في مجلد تدريب، واذكري ما يجب اختباره قبل دمجه.
