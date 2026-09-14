# معمارية حاتم — نسخة .NET الحالية

مرجع هذا الوصف: الفرع `codex/dotnet-backend` عند `508219d326ec2f2ec5fa8c18dba3b35d49ef5fc0`. هذا مخطط للتنفيذ الموجود، لا لخدمات مستقبلية مفترضة.

## ١. مخطط النظام

```mermaid
flowchart TB
    O[المنظّم] --> I[تطبيق iPhone<br/>React Native + Expo + TypeScript]
    M[أعضاء المجموعة] --> W[صفحة الدعوة في المتصفح<br/>React Native Web]
    I -->|HTTPS + JSON| T[Cloudflare Temporary Tunnel]
    W -->|HTTPS: الصفحة وطلبات API| T
    subgraph MAC[الماك أثناء الاختبار]
        T -->|HTTP إلى 127.0.0.1:8000| API[ASP.NET Core 10<br/>C# API Controller]
        API --> STORE[Store<br/>استعلامات SQL بمعاملات]
        STORE --> DB[(SQLite<br/>groups + members)]
        API --> PLANNER[Planner<br/>فحص القيود وحساب ترتيب الخطة]
        CAT[catalog.json<br/>تجارب توضيحية مختارة] --> PLANNER
        API --> WEB[dist<br/>ملفات صفحة الدعوة المبنية]
        SIM[محاكي iPhone] -->|HTTP مباشر: localhost:8000| API
    end
```

الأسهم بين الواجهات والخادم تمثل الطلبات؛ الردود تعود في الاتجاه المقابل. التطبيق الأصلي يحصل على JSON، والمتصفح يحصل أولًا على ملفات الواجهة ثم يطلب JSON. Cloudflare لا يحسب التوصيات ولا يخزن قاعدة البيانات. عمل النفق يعتمد على تشغيل الماك والخدمة والنفق.

## ٢. الطبقات ومسؤولياتها

| الطبقة | التنفيذ | المسؤولية |
|---|---|---|
| العرض | React Native، Expo 57، React Native Web، TypeScript | استقبال التفضيلات، عرض التجارب والخطة والجيب، حالات الانتظار والخطأ |
| الاتصال والحالة | `client.ts`، `storage.ts`، `useOrganizer.ts` | HTTP، حفظ مفتاح الوصول محليًا، تحديث المجموعة كل ٦ ثوانٍ |
| مدخل الخادم | `Program.cs`، `ApiController.cs` | التوجيه، قراءة JSON، التحقق من المدخلات والصلاحيات، توحيد الردود |
| قواعد المنتج | `Models.cs`، `Planner.cs` | تعريف البيانات، القيود الصلبة، البدائل المحددة، النقاط والرتب والانكماش |
| الوصول إلى البيانات | `Store.cs` + Microsoft.Data.Sqlite | استعلامات محددة المعاملات، التحقق من المفاتيح، معاملات القراءة والكتابة |
| التخزين | SQLite محلية | المجموعات والأعضاء والتفضيلات والإعدادات وبصمات المفاتيح |
| المحتوى التحريري | `catalog.json` وصور محلية | تسع تجارب وهمية ثابتة؛ ليس كتالوج مطاعم مباشرًا |
| توثيق العقد | OpenAPI → `schema.d.ts` | ربط أنواع الواجهة بعقد خادم .NET |

هذه بنية **خادم واحد منظم إلى أجزاء صغيرة (modular monolith بسيط)**. كل وحدات .NET تعمل في نفس العملية. لا توجد microservices أو queue أو Redis أو Temporal أو نموذج AI في مسار القرار. لا يوجد ORM؛ الاستعلامات مكتوبة مباشرة.

## ٣. مكونات الواجهة

```mermaid
flowchart TD
    ROOT[index.ts] --> APP[App.tsx]
    APP -->|iPhone أو معاينة المنظّم| ORG[Organizer.tsx]
    APP -->|مسار الويب join| INV[InviteScreen.tsx]
    ORG --> DISC[Discover<br/>عرض الكتالوج والبحث]
    ORG --> PLAN[PlanScreen<br/>الوقت والركيزة والأسباب]
    ORG --> POCK[الجيب داخل Organizer<br/>ما خرج ولماذا]
    ORG --> GROUP[GroupScreen<br/>الأعضاء والدعوة]
    ORG --> HOOK[useOrganizer<br/>استعادة وتحديث وحفظ]
    HOOK --> CLIENT[api/client.ts]
    INV --> CLIENT
    ORG --> PREF[PreferencesForm]
    INV --> PREF
    PLAN --> MEAL[MealControl]
```

`ui.tsx` يوفر النصوص والأزرار والأوراق والملاحظات والزجاج لكل الشاشات. `theme.ts` يوفر الألوان والخطوط والصور. Liquid Glass مسؤول عن المظهر على iOS المدعوم، ولا يغيّر قرار الخطة.

## ٤. أين تعيش البيانات؟

```mermaid
erDiagram
    groups ||--o{ members : has
    groups {
        TEXT id PK
        TEXT title
        TEXT invite_code UK
        TEXT owner_hash UK
        TEXT settings
        TEXT created_at
    }
    members {
        TEXT id PK
        TEXT group_id FK
        TEXT token_hash UK
        TEXT preferences
        INTEGER organizer
        TEXT created_at
    }
```

علاقة مجموعة واحدة إلى عدة أعضاء. `settings` نص JSON يحتوي الخانات والركيزة والحفظ اليدوي والتجارب المكتملة. `preferences` نص JSON يحتوي الاسم والمطابخ والحساسيات والنباتية والحرارة والميزانية وسياق الإقامة. الخطة نفسها تُحسب، ولا تُحفظ كجدول مستقل.

على الهاتف يُحفظ مفتاح المنظّم في SecureStore. في المتصفح يُحفظ مفتاح العضو في تخزين ذلك المتصفح. الخادم يحتفظ ببصمات المفاتيح. هذه مفاتيح عشوائية للوصول، ولا توجد حاليًا حسابات بكلمات مرور أو JWT.

## ٥. مثال: تقليص الخطة إلى عشاء واحد

```mermaid
sequenceDiagram
    participant O as المنظّم
    participant UI as تطبيق iPhone
    participant API as ASP.NET Core
    participant DB as SQLite
    participant P as Planner
    participant M as متصفح العضو
    O->>UI: اختيار خانة واحدة ثم الحفظ
    UI->>API: PUT /api/groups/{id}/settings + Bearer
    API->>API: فحص المدخلات ومعرفات التجارب
    API->>DB: فحص الملكية وحفظ الإعدادات وقراءة الأعضاء داخل معاملة
    API->>P: احسب الخطة من الإعدادات والأعضاء والكتالوج
    P->>P: قيود صلبة ثم ترتيب ثم أخذ السعة المتاحة
    P-->>API: المختار والجيب والأسباب
    API->>DB: Commit
    API-->>UI: GroupView
    UI-->>O: عرض الخطة الجديدة
    M->>API: GET /api/invites/{code} في دورة التحديث
    API-->>M: خطة مشتركة دون تفضيلات الآخرين
```

النقاط لا تعتمد على عدد الخانات، ولذلك تقليل الوقت وحده يأخذ مقدمة نفس القائمة المرتبة. إذا كانت الركيزة ممنوعة، يظهر السبب وتُحجز خانتها بدل استبدالها تلقائيًا. كل تجربة تستخدم خانة واحدة؛ لا توجد جدولة تقويم أو حجوزات.

## ٦. حدود الوصول

| صاحب الطلب | ما يستطيع الوصول إليه؟ |
|---|---|
| حامل رمز الدعوة | أسماء الأعضاء والخطة المشتركة والانضمام ضمن حد المجموعة |
| حامل مفتاح عضو مع الدعوة | قراءة وتعديل ملف ذلك العضو |
| حامل مفتاح المنظّم | قراءة كل قيود المجموعة، تعديل ملفه والإعدادات، إزالة عضو غير المنظّم |

هذه الحدود تُفرض في API. لا يُرسل العرض العام تفضيلات الأعضاء أو تعديلاتهم الشخصية؛ يحصل على سبب تحريري وتنبيه عام للركيزة. امتلاك رابط الدعوة يتيح العرض المشترك، لذلك لا يعامل كقائمة عامة قابلة للفهرسة.

## ٧. البنية المناسبة للتسليم الأكاديمي المقترح

البنية أعلاه هي الحالية. استنادًا إلى [المتطلبات التقنية](https://hoblertonschool.notion.site/Portfolio-Project-Technical-Requirements-311204290bfc8076ac82d9867899af46) و[خطة الاجتماعات](https://hoblertonschool.notion.site/Portfolio-Project-Meetings-Plan-397204290bfc8077b41fe6333d5b9f16)، يحتاج التسليم حسابات وتسجيل دخول وخروج وقاعدة بيانات على خادم وتوثيق التصميم والتعلّم. الاقتراح التالي **لم يُنفّذ في هذه النسخة**:

```mermaid
flowchart LR
    I[تطبيق المنظّم] -->|HTTPS| A[ASP.NET Core على استضافة ثابتة]
    W[موقع دعوات الأعضاء] -->|HTTPS| A
    A --> AU[تسجيل ودخول وخروج<br/>وصلاحيات مكتوبة داخل الخادم]
    A --> P[Planner]
    A --> D[(PostgreSQL أو SQL Server<br/>مخطط ومهاجرات تصممينها)]
```

لا يلزم تقسيمه إلى خدمات كثيرة. حافظي على خادم واحد، واجعلي تصميم الحسابات والمجموعات والمحتوى واضحًا، وأضيفي استضافة دائمة ونسخًا احتياطية مناسبة. النقاش التفصيلي في [متطلبات المدرسة](learning-dotnet/00-school-and-scope.md)، وشرح الملفات في [دليل تعلّم نسخة .NET](learning-dotnet/README.md).
