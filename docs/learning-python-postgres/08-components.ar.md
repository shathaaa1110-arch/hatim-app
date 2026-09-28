# 08 · المكونات والتنسيق والزجاج

[الفهرس](README.ar.md) · [التالي: التشغيل](09-tooling.ar.md)

## مكونات ui.tsx المشتركة

| المكوّن | كيف يعمل؟ |
|---|---|
| T | يلف Text، يختار fontFamily من weight، يضيف اتجاه النص العربي، ثم style المستدعية |
| Row | View بترتيب row-reverse ومحاذاة وسط ومسافة gap |
| Glass | يفحص iOS وتوفر Liquid Glass، ثم GlassView أو BlurView بخلفية شبه شفافة |
| Button | Pressable له اسم وصول، يتعطل عند disabled أو busy، ويعرض spinner بدل الأيقونة وقت الحفظ |
| IconButton | هدف 44×44 وأيقونة، مع لون/تعبئة للحالة active |
| Chip | إن وصل onPress يصبح زر اختيار؛ وإلا شارة عرض ثابتة |
| Sheet | Modal شفافة تنزلق من الأسفل، خلفية تغلق عند الضغط، عنوان وزر إغلاق وتمرير ومراعاة لوحة المفاتيح |
| Notice | رسالة عادية أو تحذير بلون مختلف ودور وصول alert |
| Empty | أيقونة وعنوان وتفسير عندما لا توجد نتائج |

في `T({style, weight, ...props})` التفكيك يأخذ حقولًا ويجمع الباقي. `{...props}` يمرر مثل numberOfLines وselectable إلى Text. `style={[s.text, fontStyle, style]}` يطبق الطبقات بالترتيب؛ الخاصية اللاحقة تتغلب على السابقة. `TextProps & {...}` يجمع خصائص Text القياسية مع weight الخاصة بنا. `keyof typeof fonts` يربط النوع بأسماء الأوزان في theme.

## Expo UI وLiquid Glass

Liquid Glass أصلية تحتاج دعم النظام؛ [توثيق Expo](https://docs.expo.dev/versions/v57.0.0/sdk/glass-effect/) يحدد توفر GlassView على iOS 26 فما بعد. كودنا يفحص isLiquidGlassAvailable أيضًا، ويختار BlurView عند غيابها. الخلفية الشفافة وحدها ليست نفس المادة الأصلية. Glass تستعمل هنا في شريط التنقل وبعض العناصر العائمة، ولا ترتبط بPostgreSQL.

Host وSlider وSwitch مستوردة من `@expo/ui` في النسخة 57. Host يحدد اللون والسياق والمساحة لمكوناته. الميزانية تستعمل Slider من 30 إلى 500 وخطوة 10، والخانات Slider من 1 إلى 9 مع حد أدنى يعتمد على المكتمل. نستخدم Math.round لإرسال أعداد صحيحة. الدرس يشرح API الموجودة في المستودع، ولا يطلب ترقية الحزم إلى إصدار آخر أثناء التعلم.

Toggle تلف Switch داخل Pressable واحد قابل للوصول. View الداخلية `pointerEvents="none"` تمنع التقاط الضغط داخليًا، وإخفاء وصول أبنائها يمنع ظهور مفتاحين لقارئ الشاشة. Pressable تعلن role=switch وchecked وتستدعي `onValueChange(!value)`. لا يتحول الزر إلى مصدر صلاحيات؛ هو فقط يغير قيمة نموذج.

## PreferencesForm

initial تدخل إلى useState كمسودة. patch تأخذ Partial من Preferences وتدمجه مع القيمة السابقة باستعمال updater `v => ({...v,...p})`. ما لم ترسلي onSave، لم تحفظي شيئًا على الخادم. initial هي قيمة البداية عند تركيب المكوّن، وليست أمرًا بمزامنة كل تعديل props تلقائيًا.

save ترفض name فارغة بعد trim، ثم تنتظر onSave. عند خطأ تعرض الرسالة. حقول المطابخ والحساسية تستخدم map لإنتاج Chips؛ الضغط يزيل القيمة بـfilter إن وجدت، أو يضيفها بنسخة قائمة. الحقل مقيم/زائر اختيار واحد، والنباتي وبدون حار قيمتان مستقلتان. ظهور تحذير الحساسية يعتمد وجود عناصر في allergies. أقصى طول الاسم 30 في UI يساند حد الخادم، لكنه لا يغني عنه.

## MealControl وExperienceCard

MealControl تحمل draft للسعة، اختصارات 9 و5 و1، وعدّ المستهلك والمتبقي، وزر حفظ فقط عند تغير القيمة. تختفي slider إذا استهلكت الخانات التسع. الاختصار الأقل من consumed لا يُعطى onPress. تحقق Pydantic يبقى الحكم حتى لو بعث عميل طلبًا يدويًا.

ExperienceCard تستقبل تجربة ولا تجلبها بنفسها. تعرض الصورة والفئة والحي والمطبخ/الرتبة والسعر والدقائق، وزر الجيب إذا وصل onSave. `experience: e` اسم محلي أقصر لنفس الخاصية. compact يغير ارتفاع الصورة، لا أهلية التجربة. صور theme مربوطة بـrequire ثابت حتى يستطيع Metro تضمينها.

## قاموس كل عائلات التنسيق المستعملة

كل StyleSheet.create في مرجع الكود يتكون من كائنات أسماء ثم خصائص من الجدول التالي. القيمة هي اختيار بصري؛ مثل borderRadius=24 يجعل الركن أدور من 10، ولا يغير منطق العمل.

| الخاصية | ماذا تفعل؟ |
|---|---|
| flex: 1 | يتيح للعنصر ملء المساحة المتاحة ضمن تخطيط الأب |
| flexDirection | ترتيب الأبناء؛ row-reverse صف يبدأ من الجهة المقابلة |
| flexWrap: wrap | يسمح بنقل العناصر إلى صف آخر |
| justifyContent | توزيع على المحور الرئيسي؛ center أو space-between أو flex-end |
| alignItems / alignSelf | محاذاة الأبناء على المحور الآخر أو تخصيص عنصر واحد |
| gap | مسافة بين الأبناء؛ ليست هامشًا خارج الحاوية |
| width / height | أبعاد؛ رقم بوحدات تخطيط المنصة أو نسبة من الأب |
| minWidth / maxWidth / minHeight / maxHeight | حدود للأبعاد، مثل سقف عرض القراءة أو مساحة لمس دنيا |
| padding، Horizontal، Vertical، Top، Bottom | مساحة داخل حدود العنصر |
| margin، Top، Bottom، Left، Vertical | مساحة خارج العنصر؛ القيم السالبة تتداخل بها صور الأعضاء |
| backgroundColor / color | خلفية العنصر مقابل لون النص أو الأيقونة |
| #RRGGBB / rgba | لون ثابت؛ القيمة الرابعة في rgba شفافية اللون |
| borderWidth / borderColor | سمك الإطار ولونه؛ BorderTop/Bottom لجهة واحدة |
| borderRadius / borderTopLeftRadius / borderTopRightRadius | تدوير كل الزوايا أو العلويتين للنافذة |
| overflow: hidden | قص الصورة/الأبناء عند حدود البطاقة الدائرية |
| position: absolute | تموضع مستقل عن التدفق المعتاد داخل الحاوية |
| top / bottom / left / right | إزاحة عنصر مطلق التموضع |
| zIndex | ترتيب التراكب بين العناصر |
| StyleSheet.absoluteFill | جعل العنصر المطلق يغطي الحاوية |
| fontFamily / fontSize | الخط والحجم؛ family يجب أن يطابق الاسم المحمّل في App |
| lineHeight / letterSpacing | ارتفاع السطر وتباعد الحروف |
| textAlign / writingDirection | محاذاة النص واتجاه كتابته؛ الروابط LTR كي تُقرأ صحيحة |
| opacity | شفافية العنصر كله؛ تستخدم لحالة الضغط/التعطيل |
| transform: scale | تصغير طفيف أثناء الضغط لإشارة تفاعل |
| boxShadow | إزاحة الظل وتمويهه ولونه |
| resizeMode="cover" | خاصية Image تملأ الإطار مع احتمال قص أطراف الصورة |
| numberOfLines | خاصية Text تحد عدد الأسطر المعروضة |
| contentContainerStyle | تنسيق محتوى ScrollView، مقابل style لحاويتها |

`accessibilityLabel` يشرح الزر لمن يستعمل قارئ شاشة وللاختبارات. `testID` نقطة تعرّف للاختبار. `disabled` يمنع الضغط. `keyboardShouldPersistTaps="handled"` يسمح بالتعامل مع ضغطات محتوى التمرير عند ظهور لوحة المفاتيح. KeyboardAvoidingView يرفع المحتوى المناسب على iOS، وSafeAreaView تترك مناطق النظام.

WebDocument.tsx ترجع null في native. WebDocument.web.tsx تضبط عنوان الصفحة ولغتها وtheme-color وCSS بسيطًا لتركيز لوحة المفاتيح والتحديد، وتنظف ما أضافته عند الإزالة. اختيار `.web.tsx` تقوم به أدوات الحزم؛ لا حاجة لشرط document داخل الآيفون.

تمرين: ارسمي بطاقة بلا صورة، ثم أضيفي صورة وpadding وإطارًا. اشرحي أثر كل تغيير قبل الانتقال للزجاج. قارني عرض 393 و1440 بدل الحكم من شاشة واحدة.
