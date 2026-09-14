# ٧ — الإعدادات والسكريبتات والتشغيل

[الفهرس](README.md) · [التالي: الاختبارات](08-tests-and-debugging.md)

هذه أوامر لفهم **النسخة الموجودة**. البناء المستقل من مجلد فارغ في الفصل التاسع. الأوامر التي تشغّل API أو نفقًا تبقى تعمل؛ لا تغلقي طرفيتها قبل انتهاء التجربة.

## ملفات مشروع الواجهة

### package.json وpackage-lock.json

[package.json](../../package.json) يصف المشروع: name للاسم البرمجي، version للنسخة، main لنقطة دخول `index.ts`، وprivate يمنع نشر حزمة npm بطريق الخطأ. dependencies مكتبات البرنامج، وdevDependencies أدوات تطوير. lock يسجل الإصدارات المحلولة وشجرة اعتمادها وintegrity كي يعيد `npm ci` تثبيتها. لا تكتبي آلاف أسطر lock يدويًا.

`~57.0.20` يسمح بتحديثات patch في نفس minor، و`^` يسمح بمجال أوسع حسب الإصدار الرئيسي، والقيمة بلا بادئة تثبيت محدد. ما يُثبت فعليًا عند `npm ci` محكوم بالـlock. لا تخلطي نسخ React Native وExpo اعتباطيًا؛ [مرجع Expo 57](https://docs.expo.dev/versions/v57.0.0/) يحدد توافق SDK مع React Native وReact ومتطلبات النظام.

| المكتبة أو المجموعة | السبب في حاتم |
|---|---|
| `expo`, `react`, `react-native` | الأدوات الأساسية والمكونات ودورة رسم الواجهة |
| `react-dom`, `react-native-web` | تشغيل نفس وصف المكونات في المتصفح |
| `@expo/ui` | Host وSlider وSwitch |
| `expo-glass-effect`, `expo-blur` | زجاج أصلي عند التوفر، وتمويه بديل |
| `expo-linear-gradient` | تدرج فوق صورة المقدمة |
| `expo-font`, `@expo-google-fonts/ibm-plex-sans-arabic` | تحميل الخط العربي بأوزانه |
| `expo-device` | التفريق بين محاكي iOS والهاتف الفعلي |
| `expo-clipboard` | نسخ دعوة المجموعة |
| `expo-secure-store`, `@react-native-async-storage/async-storage` | حفظ مفتاح الوصول محليًا حسب المنصة |
| `expo-status-bar`, `react-native-safe-area-context` | شريط النظام والمسافات الآمنة |
| `lucide-react-native`, `react-native-svg` | الأيقونات والرسم المتجهي الذي تعتمد عليه |
| `expo-linking` | اعتماد موجود؛ لا يوجد نداء مباشر له في ملفات التطبيق الحالية |
| `typescript`, `@types/react` | فحص الأنواع ووصف React |
| `prettier` | تنسيق كود الواجهة والأدوات |
| `@playwright/test` | اختبارات رحلات المتصفح |

`overrides.xcode.uuid` يثبت اعتماد uuid ضمن مكتبة xcode المستعملة للبناء إلى مجال 11.1.1 فأعلى في الرئيسي نفسه. هذا إعداد شجرة اعتمادات، وليس مكتبة منطق مستخدم. السبب المسجل في README إصلاح اعتماد بناء؛ لا تحتاجين تقليد override في مشروع آخر بلا فحص شجرته وإصداراته.

### جميع scripts

| الأمر بعد `npm run` | ما يشغله؟ |
|---|---|
| `start` | Metro/Expo للتطوير |
| `android`, `ios` | بناء وتشغيل أصلي عبر Expo CLI |
| `web` | خادم Expo لتطوير الويب؛ لا يغيّر إعداد same-origin في client تلقائيًا |
| `ios:release` | بناء iOS Release مع JavaScript مضمنة |
| `web:build` | تصدير ملفات المتصفح إلى dist |
| `api` | `dotnet run` لمشروع API بلا launch profile |
| `test:api` | `dotnet test` للحل |
| `test:e2e` | اختبارات Playwright؛ تحتاج API وweb جاهزين |
| `types:api` | تصدير OpenAPI وتوليد أنواع TS |
| `check` | typecheck ثم اختبارات API؛ لا يشمل E2E تلقائيًا |
| `typecheck` | `tsc --noEmit`: فحص دون إخراج JavaScript |
| `public:test` | سكريبت النفق والبناء وتشغيل الخدمة |
| `format`, `format:check` | تعديل تنسيق ملفات الواجهة المحددة / التحقق فقط |
| `format:api`, `format:api:check` | dotnet format / فحص التنسيق بلا تغيير |

`npm run web` وحده يقدم واجهة على منفذ Expo، لكن client.ts في الويب يرسل `/api` إلى أصله الحالي. سير العمل الموثوق الحالي للويب هو export ثم خدمة dist من API نفسها. لا تتوقعي أن CORS وحدها تصلح إرسال الطلب إلى منفذ خاطئ؛ CORS إذن قراءة، وليست proxy.

### app.json

[الملف](../../app.json) إعداد Expo، وليس كود الشاشة. name وslug وversion تعرف التطبيق. orientation=portrait، وuserInterfaceStyle=light، وicon مسار الأيقونة. ios يضبط supportsTablet=false وbundleIdentifier وهوية التثبيت. `CFBundleDisplayName` الاسم العربي أسفل الأيقونة. `ITSAppUsesNonExemptEncryption` بيان إعداد للتطبيق؛ لا يعني تعطيل HTTPS.

android يحدد package وصور adaptiveIcon الملونة والأمامية والخلفية وأحادية اللون، وخيار predictiveBackGestureEnabled. وجود هذه الإعدادات لا يثبت اختبار Android في كل جهاز.

web يحدد favicon وMetro bundler وoutput=single: تطبيق ويب بمدخل index واحد، ومن هنا حاجة الخادم لإرجاعه عند `/join/{code}`. plugins تضبط تكامل الخط والتخزين الآمن في المشروع الأصلي. scheme=hatim يسجل مخطط روابط التطبيق، لكن App الحالي لا يملك رحلة deep-link عامة لكل الشاشات؛ الرابط العام للأعضاء HTTPS في المتصفح.

### tsconfig.json

[الملف](../../tsconfig.json) يمدد إعداد Expo، ويفعل strict، ويمنع ملفات JavaScript ضمن مصدر التطبيق، ويحذر عن locals/parameters غير المستعملة. include لكل ts/tsx، وexclude لمجلدات الاعتماد والبناء والتشغيل. scripts `.mjs` ينفذها Node بشكل مستقل؛ ليست شاشات TSX.

## ملفات مشروع .NET

[global.json](../../global.json) يطلب SDK أساس 10.0.100 مع `rollForward=latestFeature` ضمن السياسة المحددة وعدم السماح بالإصدارات التجريبية؛ ليس تثبيتًا حرفيًا على patch واحد. SDK المثبت عند إعداد الدليل 10.0.103. الـSDK أداة البناء، وTargetFramework في csproj يحدد منصة الاستهداف.

[Hatim.slnx](../../backend/Hatim.slnx) ملف حل بصيغة XML يجمع مشروع API ومشروع الاختبارات. `.csproj` يصف إعدادات المشروع واعتماداته:

| الخاصية | معناها |
|---|---|
| `Sdk="Microsoft.NET.Sdk.Web"` | مشروع ويب ASP.NET Core |
| `TargetFramework=net10.0` | استهداف .NET 10 |
| `Nullable=enable` | تحليل القيم القابلة للغياب |
| `ImplicitUsings=enable` | تضمين أسماء شائعة تلقائيًا؛ ليس غياب using خطأ دائمًا |
| `TreatWarningsAsErrors=true` | لا يمر البناء بتحذيرات المشروع |
| `RestorePackagesWithLockFile=true` | تسجيل اعتماد NuGet في lock |
| `PackageReference` | اسم حزمة NuGet وإصدارها |
| `CopyToOutputDirectory=PreserveNewest` | نسخ المورد عند الحاجة إلى مجلد الناتج |

[مشروع API](../../backend/Hatim.Api/Hatim.Api.csproj) يعتمد Microsoft.AspNetCore.OpenApi وMicrosoft.Data.Sqlite 10.0.12 وينسخ catalog.json. [مشروع الاختبارات](../../backend/Hatim.Api.Tests/Hatim.Api.Tests.csproj) يستعمل SDK العادي وIsPackable=false، ويعتمد Mvc.Testing 10.0.12 وMicrosoft.NET.Test.Sdk 17.14.1 وxunit 2.9.3 وrunner 3.1.1. `PrivateAssets=all` يمنع نشر اعتماد runner إلى مستهلكي الحزمة. ProjectReference يربط الاختبار بالـAPI. ملفا parity وlegacy يُنسخان ليقرأهما الاختبار.

`packages.lock.json` في المشروعين يسجل dependencies المباشرة وغير المباشرة، نوع الاعتماد وإصداره وcontentHash. أدوات NuGet تكتبه، ولا يضم قاعدة بيانات مستخدمين. `dotnet restore --locked-mode` مفيد للتحقق من عدم انحراف الوصف عن lock.

## scripts/generate-types.mjs، ١٠١ سطر

[الملف](../../scripts/generate-types.mjs) يعمل في Node. `node:child_process` لتشغيل برامج أخرى، وfs للملفات، وos لمجلد مؤقت، وpath/url لمسارات قابلة للتعامل الصحيح.

| الأسطر | العمل وسبب وجوده |
|---|---|
| ١–١٣ | تحديد جذر المشروع نسبة للسكريبت، ثم بناء API Release بـspawnSync، والتوقف عند الفشل |
| ١٥–٣٦ | إنشاء مجلد DB مؤقت، وتشغيل DLL على loopback بمنفذ 0 كي يختار النظام منفذًا متاحًا؛ لا يفتح DB المجموعات |
| ٣٧–٦١ | قراءة stdout حتى «Now listening on»، بمهلة ٣٠ ثانية ومعالجة فشل العملية |
| ٦٢–٧٤ | GET OpenAPI بمهلة ١٠ ثوانٍ، حذف servers ذي المنفذ المؤقت، وكتابة backend/openapi.json بتنسيق ثابت |
| ٧٥–٧٩ | finally يوقف العملية وينتظر خروجها ويحذف المجلد المؤقت |
| ٨٠–٩٥ | تشغيل openapi-typescript 7.13.0 مع TypeScript 5.9.3 في بيئة npx معزولة، وإخراج schema.d.ts |
| ٩٦–١٠١ | تنسيق الناتج بـPrettier وإرجاع كود خروج العملية |

العزل هنا لأن أداة التوليد لها peer dependency على TS5 بينما التطبيق TS6. `spawnSync` ينتظر عملية قصيرة حتى نهايتها؛ `spawn` يتيح التعامل مع عملية خادم مستمرة وأحداثها. `{stdio:"inherit"}` يعرض خرج البرنامج مباشرة. 0 في منفذ الاستماع ليست API تعمل على port صفر؛ هي طلب اختيار منفذ شاغر.

## scripts/public-test.mjs، ١٥٣ سطرًا

[الملف](../../scripts/public-test.mjs) أداة تشغيل محلية، لا جزء من حساب التوصيات.

1. الأسطر ١–٧ تستورد الأدوات وتنتقل إلى جذر المستودع.
2. ٩–٤٣ تحاول حجز 8000 ثم تغلق فحص المنفذ. إن كان مستخدمًا، تفحص health وأنها نسخة Hatim .NET المعروفة، ثم أن `/` يقدم HTML. عند ذلك تعيد استخدام الخدمة. منفذ مشغول لخدمة أخرى يعطي خطأ بدل قتلها.
3. ٤٥–٦٤ تحفظ العمليات التي أطلقتها في Set. `stop` يرسل SIGTERM لهذه العمليات فقط، ويمنع تكرار الإغلاق. SIGINT من Ctrl+C وSIGTERM يمران منه. `launch` يغلف spawn ويضيف معالجة الخطأ والخروج.
4. ٦٦–٨٣ تختار `.tools/cloudflared` إن وُجد وإلا cloudflared من PATH، وتشغل tunnel إلى loopback8000 ببروتوكول http2 ودون تحديث ذاتي في هذه العملية. خروج النفق غير المتوقع ينهي التشغيل.
5. ٨٤–١٠٩ تراقب stdout/stderr بحثًا عن رابط trycloudflare عبر regex، بمهلة ٤٥ ثانية. ظهوره يمنح origin، ولا يعني وحده أن API انتهت من الإقلاع بعد.
6. ١١٠–١٣٣ تقرأ `.env.local` إن وجدت، وتحافظ على الأسطر الأخرى وتستبدل EXPO_PUBLIC_API_URL، ثم تبني .NET Release.
7. ١٣٤–١٥٣ تبني الويب. إن لم تُعد استخدام API تطلق DLL مع contentRoot الصحيح. تطبع الرابط وتطلب بقاء الطرفية مفتوحة وإعادة بناء التطبيق الأصلي عند تغير العنوان.

إذا أعادت استخدام عملية API موجودة، فهي لا تستبدل الكود المحمّل في تلك العملية لمجرد إعادة build. بعد تعديل backend أوقفي الخدمة التي تشغلينها بالطريقة المعتادة ثم شغلي النسخة الجديدة. السكريبت جيد لإعادة نفق لخدمة صحيحة موجودة، وليس نظام نشر دائمًا أو hot reload للخادم.

الرابط يتغير عند إعادة Quick Tunnel، والماك يجب أن يبقى متصلًا. هذا نظام اختبار مؤقت حسب [توثيق Cloudflare Quick Tunnels](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/trycloudflare/). لا تثبتي رابطًا قديمًا داخل كودك.

## scripts/make-icon.swift، ١٦ سطرًا

[الملف](../../scripts/make-icon.swift) أداة رسم للأيقونة على macOS، ليست باك إند Swift. `AppKit` يعطي أدوات الصور والخطوط. ينشئ NSImage 1024×1024، وlockFocus يبدأ الرسم عليها. يملأ خلفية خضراء، يضبط محاذاة نص وسطية وخط GeezaPro-Bold أو خط نظام بديل، ثم يرسم حرف «ح» بلون فاتح. يرسم دائرة مرجانية بـNSBezierPath، وينهي الرسم، ويحول الصورة إلى NSBitmapImageRep ثم PNG في assets/icon.png.

`let` رابط ثابت، و`??` بديل عند غياب الخط، و`!` force unwrap يفترض وجود الصورة الناتجة وقد يفشل إن خالف الواقع؛ هذا سكريبت محلي صغير، وليس طريقة عامة لمعالجة مدخل مستخدم. `try` قد يرمي خطأ كتابة ملف. يمكن تصميم الأيقونة يدويًا في Figma وتصديرها بدل تعلم Swift لبناء هذا التطبيق.

## الملفات الأخرى والمولّدة

`.env.example` يوثق العنوان فقط. `.env.local` قيمة جهازك الحالية ويُتجاهل في Git. `.gitignore` يمنع dependencies، نواتج Expo والـnative والبناء والاختبارات، ملفات مفاتيح التوقيع، DB المجموعات ومجلد التشغيل المحلي. أنماط مخابئ النسخة القديمة لا تعني استمرار اعتماد الخادم عليها.

`ios/` و`android/` مشاريع أصلية يولدها prebuild. `dist/` ناتج الويب، `bin/obj` نواتج .NET، `node_modules/` مكتبات مثبتة. لا تتعلمي التطبيق بقراءة ملايين أسطر هذه المجلدات أولًا، ولا تضعي تعديلًا دائمًا في ملف مولّد ثم تنسي مصدره.

`AGENTS.md` و`CLAUDE.md` و`.claude/settings.json` إعدادات لأدوات المساعدة المستخدمة تاريخيًا؛ لا يشغلها التطبيق ولا تحتاجينها لتكتبي مشروعك بلا AI. README للتشغيل، ودليل backend-dotnet للنقل، وLICENSE نص الرخصة الموجود. `assets/ATTRIBUTION.md` يربط صور الطعام بمصادرها؛ الصور توضيحية لا تدّعي تصوير الأماكن المسماة. أيقونة التطبيق وfavicon وأيقونات Android وsplash-icon موارد صور، لا دوال. وجود splash-icon لا يعني أن كل إعداد شاشة البداية يقرأه؛ راجعي الربط الفعلي في app.json.

## تشغيل النسخة الموجودة

من جذر المستودع، بعد تثبيت Node المتوافق و.NET 10 SDK وXcode وأدوات iOS وcloudflared عند الحاجة:

```sh
npm ci
dotnet restore backend/Hatim.slnx
npm run web:build
npm run api
```

`npm ci` يستعمل lock ويتطلب وجوده وتوافقه، وrestore يجلب NuGet، وweb:build ينشئ dist، وapi يبقى قيد التشغيل على 8000. افتحي `http://127.0.0.1:8000/?preview=organizer` لمعاينة المنظّم. `/` صفحة دخول الدعوات، وليست صفحة المنظّم الرئيسية. لا تبدلي origin بين localhost و127.0.0.1 متوقعة اشتراك storage المتصفح؛ هما أصلان مختلفان.

للمحاكي في طرفية ثانية:

```sh
npm run ios:release
```

Release لا تحتاج Metro لعرض JavaScript المضمّنة، لكنها تحتاج API لبيانات المجموعة. Debug للتطوير يحتاج مسار تحميل الحزمة وأدواته.

لرابط أعضاء عام، شغلي بدل تشغيل خدمة أخرى متعارضة:

```sh
npm run public:test
```

ثم إنشاء/فتح المجموعة، «لَمّتنا» ← «اعزم الربع»، ونسخ `/join/<code>` الفعلي. الملف `.env.local` يحمل العنوان الجديد. للتثبيت على iPhone عبر Xcode بعد إعداد العنوان:

```sh
npx expo prebuild --platform ios
open ios/Hatim.xcworkspace
```

اختاري Hatim scheme والهاتف المتصل وفريق التطوير في Signing & Capabilities. لنسخة مستقلة للتجربة اختاري Run configuration=Release ثم Run. تثبيت التطبيق على الآيفون لا يضع خادم .NET داخل الهاتف. كلاهما يبقى جزءًا منفصلًا من النظام.
