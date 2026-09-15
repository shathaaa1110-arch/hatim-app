# 09 · كيف تعمل الأدوات وملفات الإعداد؟

[الفهرس](README.ar.md) · [التالي: الاختبارات](10-testing.ar.md)

## ملفات المشروع

package.json يسمي التطبيق ونقطة index.ts، ويعلن dependencies للتشغيل وdevDependencies للتطوير وscripts للأوامر. package-lock.json يثبت شجرة npm الفعلية. `npm ci` يثبت وفق القفل؛ لا تكتبي إصدارات عشوائية داخل lock يدويًا.

pyproject.toml نظيره لـPython: اسم الحزمة، requires-python، FastAPI وUvicorn وpsycopg، ثم pytest وhttpx2 وruff للتطوير. uv.lock يثبت الإصدارات الفعلية. `.python-version` تختار 3.14.4 في هذه اللقطة، بينما requires-python يقبل 3.14 فما بعد. ruff للتنسيق والفحص، ولا يثبت صحة منطق القرار.

| عائلة مكتبات npm | سبب وجودها في المشروع |
|---|---|
| react، react-native، expo | وصف الواجهة وربطها بالمنصات وأدوات Expo |
| react-dom، react-native-web | تشغيل الواجهة المشتركة في المتصفح |
| @expo/ui | Host وSlider وSwitch |
| expo-glass-effect، expo-blur، expo-linear-gradient | المادة الأصلية والبديل الضبابي والتدرج فوق الصور |
| expo-font، @expo-google-fonts/... | تحميل خط IBM Plex Arabic وأوزانه |
| expo-device | تمييز المحاكي من الجهاز الحقيقي لاختيار عنوان API |
| expo-secure-store، AsyncStorage | حفظ مفاتيح الوصول حسب المنصة |
| expo-clipboard، expo-status-bar | نسخ الدعوة ومظهر شريط النظام |
| safe-area-context | حدود شاشة الآيفون الآمنة |
| lucide-react-native، react-native-svg | الأيقونات ورسمها |
| expo-linking | اعتماد موجود؛ لا يوجد استيراد مباشر له في كود الواجهة الحالي |
| TypeScript، @types/react | فحص الأنواع وقت التطوير |
| Playwright | اختبار رحلة الويب |
| Prettier | تنسيق النص البرمجي |

overrides في package.json يضبط نسخة uuid التابعة لحزمة xcode. هذا لا يعني أن التطبيق يستعمل uuid لتوليد مفاتيح الخادم؛ Python تستخدم secrets.

app.json يحدد الاسم والأيقونة والاتجاه العمودي والمظهر الفاتح ومعرف com.hatim.app واسم «حاتم» على iOS. يعلن إعداد أيقونات Android وweb output=single وMetro وplugins للخط والتخزين وسلسلة URL scheme=hatim. وجود scheme لا يثبت وجود تدفق فتح دعوة native؛ App الحالية تستخرج `/join` للمتصفح.

tsconfig يرث إعداد Expo ويضيف strict ورفض JavaScript والأنواع/المعاملات غير المستخدمة. include يضم ts وtsx، وexclude يبعد المكتبات والبناء والمشاريع الأصلية المولدة. `.gitignore` يمنع رفع بيانات DB وenv المحلية ومخرجات البناء والمفاتيح الخاصة وملفات الاختبار.

## ثلاث ملفات env مختلفة

| الملف | القارئ | ما يحتويه؟ |
|---|---|---|
| .env.postgres.local | Docker Compose | اسم DB والمستخدم وكلمة مرور PostgreSQL المحلية |
| backend/.env.local | uv ثم Python | DATABASE_URL وربما إعدادات الخادم الاختيارية |
| .env.local في الجذر | Expo | EXPO_PUBLIC_API_URL العام الذي يمكن أن يصل للعميل |

كلها ignored. ملفات `.env.example` نماذج بأسماء توضيحية، لا كلمات مرور تشغيل. لا تنقلي DATABASE_URL إلى EXPO_PUBLIC: متغيرات Expo العامة تدخل حزمة العميل ويمكن قراءتها.

## compose.yaml وdatabase.mjs

Compose يشغّل صورة postgres:18.4-alpine ضمن مشروع hatim. ينشر منفذ 5432 على loopback فقط. volume المسماة تحفظ البيانات في `/var/lib/postgresql` داخل حاوية PostgreSQL 18. healthcheck يستعمل pg_isready؛ `$$` يمنع Compose من استبدال متغير الصدفة قبل تنفيذه داخل الحاوية. restart=unless-stopped يتعلق بإعادة تشغيل الخدمة، وليس backup للبيانات.

database.mjs تستخرج جذر المستودع من import.meta.url، وتختار فعل up أو stop أو status فقط. عند up تنشئ env الخاصة إن غابت بكلمة مرور randomBytes، وmode 0600 وflag wx تمنعان كتابة ملف موجود وتحدان أذونات القراءة. encodeURIComponent يحمي أجزاء URL من الأحرف الخاصة. ثم spawnSync تشغّل docker compose بمصفوفة معاملات وتعيد exit code. لا تحذف volume عند stop، ولا تغير بيانات اتصال موجودة تلقائيًا.

## تشغيل النسخة المرجعية — ليس إعادة بنائها

الأوامر من جذر المستودع بعد تثبيت الأدوات المطلوبة. إذا كان التطبيق الجاري يعمل، لا تحتاجين إعادة تنفيذها لمجرد قراءة الدليل.

```sh
npm ci
uv sync --project backend --locked
npm run db:up
npm run web:build
npm run api
```

web:build يصدر dist؛ api تشغل Uvicorn بعنوان 127.0.0.1:8000 وتحمل env الخاصة بالخادم. `/api/health` يفحص الاتصال الفعلي بالقاعدة. `npm start` يشغل Metro للتطوير، لكنه لا يشغل Python ولا PostgreSQL. `npm run web` أيضًا لا يقوم بإعداد proxy للـAPI؛ مسار الويب المستخدم هنا export + FastAPI في origin واحدة.

## public-test.mjs خطوة خطوة

1. يجرب المنفذ 8000. إن كان مشغولًا يفحص health ومحتوى الصفحة ويتأكد أنها نسخة Hatim Python/PostgreSQL؛ لا يفترض أن أي عملية على المنفذ مناسبة.
2. يحتفظ بعملياته الأبناء في Set، وstop يرسل SIGTERM إليها فقط. API المعاد استخدامها ليست من أبنائه.
3. يشغّل cloudflared من .tools أو PATH عبر HTTP2 ويقرأ العنوان المؤقت من سجلها، مع مهلة 45 ثانية.
4. يحدّث EXPO_PUBLIC_API_URL في env الجذر ويحتفظ ببقية إعداداته، ثم ينفذ uv sync والبناء للويب.
5. يبدأ Uvicorn إن لم يكن يعيد استخدام خادم مناسب، ويترك العمليات تعمل. إيقاف النفق لا يحذف PostgreSQL.

إعادة استعمال API جارية لا تحمل تعديلات Python تلقائيًا؛ أعيدي تشغيلها عند تغيير الكود. النفق المؤقت يعرض HTTP للآخرين، ولا يثبت تطبيق الآيفون ولا يستضيف DB. عنوانه يتغير عند إنشاء نفق جديد، وله حدود خدمة اختبار. [توثيق Quick Tunnels](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/trycloudflare/).

## Xcode وRelease

Expo prebuild يولد مشروع ios من app.json والمكتبات. افتحي `ios/Hatim.xcworkspace`، اختاري Scheme Hatim وجهازك وفريق توقيعك. Debug عادة يستعمل Metro. Release يضم JavaScript والأصول، لكنه يبقى محتاجًا إلى خادم Python وPostgreSQL للوصول للبيانات.

إذا تغير EXPO_PUBLIC_API_URL أعيدي بناء Release كي تحمل رابط الدعوة الجديد. المحاكي يستعمل localhost للـAPI، لكن الدعوة المنسوخة منه تستعمل العنوان العام. إعدادات signing الحقيقية خاصة بجهازك وحسابك؛ لا ترفعي مفاتيحها إلى GitHub. المشاريع ios/android مولّدة وغير متتبعة هنا؛ حفظ التعديلات الدائمة يكون عبر إعداد Expo مناسب بدل تعديل ناتج سيُستبدل.

## توليد عقد API

export_openapi.py يستورد app ويكتب `app.openapi()` كJSON عربي مقروء دون بدء lifespan؛ لا يتصل بالقاعدة. generate-types.mjs ينفذه ثم openapi-typescript لينتج schema.d.ts. TypeScript 5 للمولّد معزولة عن TypeScript 6 في التطبيق، ثم Prettier تنسق الناتج. هذا يولد وصف أنواع لمسارات كتبناها، وليس backend تلقائية من جداول DB.

scripts/make-icon.swift أداة AppKit للماك: ترسم خلفية 1024×1024 وحرف ح ونقطة ثم تحفظ PNG. ليست باك إند Swift ولا مولّد صور AI. الصور الأخرى محلية ومراجعها في assets/ATTRIBUTION.md، وأسماء الأماكن توضيحية. LICENSE يصف ترخيص المصدر؛ attribution يوثق مصادر الأصول.

AGENTS.md وCLAUDE.md و.claude/settings.json تخص أدوات مساعدة كانت مستخدمة في تطوير المرجع؛ ليست جزءًا من تشغيل حاتم ولا متطلبًا لنسختك اليدوية. لا تحتاجين استخدامها لبناء المشروع بنفسك.
