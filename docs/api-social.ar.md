# عقد API — القروبات والطلعات

هذا عقد الإضافة الاختيارية للقروبات الدائمة. المسار الأساسي للاكتشاف والخطة ورفقة الطلعة موضح في [عقد الخطة المباشرة](api-planning.ar.md)، ولا يتطلب حسابًا أو إنشاء قروب دائم.

هذا مرجع النسخة المنفذة على `codex/persistent-groups`. المصدر الدقيق القابل للآلة هو [backend/openapi.json](../backend/openapi.json)، وتعرضه FastAPI في `/api/docs`. أعيد ترتيب الكود في16سبتمبر2026 إلى features/accounts وfeatures/groups وfeatures/experiences دون تغيير العقد. [شرح حدود الوحدات](architecture-modules.ar.md). جميع المسارات أدناه تحت `/api/v2`، وتتعامل مع JSON. أنواع الواجهة في [schema.d.ts](../src/shared/api/schema.d.ts) تُولّد بالأمر `npm run types:api` ولا تُكتب يدويًا.

## الهوية والأخطاء

المسارات الخاصة تتطلب `Authorization: Bearer <session-token>`. التسجيل والدخول يعيدان `{token, account: {id, handle, name}}`. كلمة المرور ١٠–١٢٨ حرفًا، واسم المستخدم ٣–٤٠ من الأحرف الإنجليزية والأرقام و`_.-`؛ يُوحّد إلى أحرف صغيرة. الاسم المعروض مختلف عن اسم الدخول. الجلسة تنتهي بعد ٣٠ يومًا وتُلغى عند الخروج.

الأخطاء: 401 للجلسة غير المقبولة، 403 لعدم الصلاحية، 404 لمورد غير موجود أو غير متاح لهذا الحساب، 409 لتعارض حالة أو امتلاء أو عضوية موقوفة، 422 لمدخلات غير صالحة، 429 لتجاوز حد المحاولات. الرسالة في `detail`. لا تفسر الواجهة فشل الشبكة باعتباره انتهاء جلسة، ولا تحذف بيانات الدخول عند 5xx.

## الحسابات والكتالوج

| الطريقة والمسار | المدخل | الناتج |
|---|---|---|
| `POST /auth/register` | handle، password، name | 201 AccountSession |
| `POST /auth/login` | handle، password | AccountSession |
| `GET /auth/me` | جلسة | Account |
| `PUT /auth/me` | جلسة وname من1 إلى30 حرفًا | تعديل اسم العرض للحساب نفسه، ثم Account |
| `POST /auth/logout` | جلسة، حتى لو منتهية | `{ok: true}` وإلغاء مفتاحها |
| `GET /experiences` | عام | Experience[] من PostgreSQL |

المصادقة مشتركة بين «حسابي» والقروبات والتخطيط المباشر المحفوظ، رغم بقاء اسم مساراتها /api/v2/auth للتوافق. لا يغير تعديل اسم الحساب تفضيلات رفقة أو عضويات سابقة بصمت؛ لكل منها Preferences مستقلة. مصدر الكتالوج موحد في experience_store.py بين الاكتشاف والتخطيط المباشر والطلعات. حفظ خطة ضيف للحساب دون قروب موثق في [API التخطيط](api-planning.ar.md)، وهو مختلف عن legacy/claim.

## القروبات

| الطريقة والمسار | المدخل/الصلاحية | الناتج |
|---|---|---|
| `GET /groups` | حساب | CircleSummary[]، تشمل المثبت والمؤرشف |
| `POST /groups` | title وpreferences | 201 CircleView، المنشئ مالك وعضو |
| `GET /groups/{id}` | عضو نشط | CircleView |
| `PUT /groups/{id}/title` | title، المالك | CircleView |
| `PUT /groups/{id}/me/preferences` | Preferences للعضو نفسه | CircleView |
| `PATCH /groups/{id}/me/options` | pinned و/أو fun_opt_in | CircleView؛ الحقل غير المرسل يبقى كما هو |
| `GET /invites/{code}` | عام | PublicCircle: id، title، member_count فقط |
| `POST /invites/{code}/join` | preferences وlegacy_token اختياري | CircleView؛ الانضمام المتكرر لا يكرر العضو |
| `POST /groups/{id}/members/{member}/remove` | المالك | إزالة منطقية وCircleView |
| `POST /groups/{id}/members/{member}/restore` | المالك | إعادة العضوية وCircleView |
| `POST /groups/{id}/transfer` | member_id لحساب نشط، المالك | CircleView بمالك جديد |
| `POST /groups/{id}/archive` | المالك، دون طلعات مفتوحة | CircleView مؤرشفة |
| `POST /legacy/claim` | group_id، owner_token وحساب جديد | ربط القروب السابق وإرجاع CircleView |

Preferences هي نفس البنية الأصلية: name، role بمعنى مقيم/زائر، cuisines، allergies، vegetarian، mild، budget. `role` هنا ليست صلاحية إدارية. تفضيلات الآخرين تساوي null إلا إذا كان القارئ مالك القروب. `is_me` و`is_owner` قيم يحسبها الخادم، وليستا تصريحًا يقبله من المتصفح.

## الطلعات

| الطريقة والمسار | المدخل/الصلاحية | الناتج |
|---|---|---|
| `POST /groups/{id}/outings` | عضو نشط، title وslots من١ إلى٩ وcoordinator_id اختياري | 201 OutingView، المنشئ حاضر، والقائد المختار أو المنشئ افتراضيًا |
| `GET /outings/{id}` | عضو نشط في القروب | OutingView بحسب صلاحياته |
| `PUT /outings/{id}/me/attendance` | attendance: pending/going/declined وbudget_override اختياري٣٠–٥٠٠ | OutingView؛ null يعيد الميزانية المحفوظة |
| `PUT /outings/{id}/settings` | `{settings, expected}`، مالك/قائد | OutingView، أو409 إذا تغيرت Settings منذ قراءتها |
| `PUT /outings/{id}/coordinator` | member_id، المالك أو قائد الطلعة الحالي | عضو نشط من نفس القروب وله حساب يصبح القائد؛ حضوره لا يتغير |
| `POST /outings/{id}/close` | مالك/قائد | لقطة مغلقة؛ تكراره لا يعيد حسابها |
| `POST /outings/{id}/fun/{member}` | الطرفان نشطان وحاضران ومشتركان بالمزاح | بطاقة٣٠ثانية، واحدة للمستهدف في الطلعة |
| `DELETE /outings/{id}/fun/me` | المستهدف | إغلاق بطاقته فورًا |

مثال حفظ خانات دون مسح تغيير جهاز آخر:

```json
{
  "expected": {"slots": 3, "anchor_id": "fire", "pocket_ids": [], "completed_ids": []},
  "settings": {"slots": 1, "anchor_id": "fire", "pocket_ids": [], "completed_ids": []}
}
```

يأتي `expected` من آخر OutingView، لا من قيم ابتدائية مفترضة. عند409 تُقرأ الطلعة مجددًا ويُراجع المستخدم التغيير. لا يعيد العميل الكتابة تلقائيًا فوق النتيجة الجديدة.

OutingView تعرض owner_name وcoordinator_name وcoordinator_id، وتحدد is_owner لكل Participant؛ لا تحتاج الواجهة تخمين المسؤول من ترتيب قائمة الأعضاء. OutingSummary تعرض coordinator_name في بطاقة الطلعة.

OutingView تحتوي settings وplan وparticipants وround وcards، إضافة إلى `can_manage` و`is_owner` و`my_member_id` و`eligible_ids` و`planning_revision`. مشارك الطلعة يتضمن claimed وfun_used حتى لا تعرض الواجهة تعيين قائد غير مرتبط أو مزحة مستهلكة. التفضيلات والميزانية الخاصة تظهر لصاحبها أو المالك أو قائد الطلعة. التجارب المؤهلة لفتح جولة ترجع للمدير في الطلعة المفتوحة فقط.

## جولات القرار

| الطريقة والمسار | المدخل/الصلاحية | الناتج |
|---|---|---|
| `POST /outings/{id}/rounds` | mode: vote/draw وexperience_ids من١ إلى٥، مالك/قائد | 201 OutingView بجولة مفتوحة |
| `PUT /rounds/{id}/my-vote` | experience_id، حاضر ضمن مصوتي الجولة | إنشاء/تغيير صوته الوحيد |
| `DELETE /rounds/{id}/my-vote` | نفس شرط التصويت | سحب الصوت |
| `POST /rounds/{id}/resolve` | مالك/قائد | فائز بالأصوات أو tied، ولا يحسم صفر أصوات |
| `POST /rounds/{id}/draw` | مالك/قائد | حسم القرعة المباشرة أو تعادل مُغلق مسبقًا |
| `POST /rounds/{id}/cancel` | مالك/قائد | إبطال الجولة مع بقاء السجل |

RoundView تحتوي خيارات الجولة وعدد أصوات كل تجربة، `my_vote`، عدد الحاضرين وقت الفتح `voter_count`، وعدد من صوّتوا `voted_count`، وحالة الجولة والنتيجة وطريقة الحسم. لا تُرسل خريطة «من صوّت لمن».

```mermaid
stateDiagram-v2
    [*] --> open
    open --> tied: أعلى الأصوات متساوية
    open --> resolved: فائز تصويت أو قرعة مباشرة
    tied --> resolved: قرعة معلنة بين المتعادلين
    open --> invalidated: إلغاء أو تغيّر المعطيات أو إغلاق الطلعة
    tied --> invalidated: إلغاء أو تغيّر المعطيات أو إغلاق الطلعة
    resolved --> invalidated: تغيّر المعطيات أو بدء جولة جديدة
```

`resolved_by` تساوي vote أو draw أو only_option. إعادة طلب الحسم تعيد النتيجة الموجودة؛ لا تسحب فائزًا جديدًا. عند تغيّر المعطيات تبقى الركيزة وتصبح الجولة invalidated، وتُراجع صلاحيتها قبل جولة جديدة. تغيير الخانات وحده لا يبطلها.

## التوافق والتشغيل

المسارات السابقة تحت `/api/groups` و`/api/invites` محفوظة للقروبات غير المرتبطة بعد. بعد claim تمنع الكتابة القديمة بـ409، ويصبح `/join/code` بوابة القروب الجديد. لا يتغير رمز الدعوة في DB. تغير نطاق Cloudflare يتطلب مشاركة الرابط بالنطاق الجديد وإعادة بناء نسخة iPhone إذا تغيّر EXPO_PUBLIC_API_URL.

`GET /api/health` يفحص DB ويرجع `api_generation: 2` إلى جانب version/backend/database/catalog_mode. سكربت النفق يرفض إعادة استخدام خادم قديم لا يدعم هذه الإضافة، لكن تعديل Python بعد بدء الخادم يظل يتطلب إعادة تشغيل العملية.

### نقل القيادة

`coordinator_id` في إنشاء الطلعة اختياري للحفاظ على توافق العملاء السابقين. null أو غيابه يختار المنشئ. معرف فارغ مرفوض422، أو عضو غير موجود/مزال/من قروب آخر/غير مرتبط بحساب مرفوض409. مسار coordinator يسمح للمالك والقائد الحالي فقط، ويمنع النقل في الطلعة المغلقة. القائد السابق يفقد can_manage بعد النقل ما لم يكن أيضًا مالك القروب. الحضور والتصويت والمراجعة والركيزة لا تتغير لمجرد نقل القيادة؛ لا تمنح القيادة حق طرد عضو من القروب.

إذا أعاد GET القروب أو الطلعة401/404، تمسح الواجهة العرض السابق وتظهر رسالة عدم الإتاحة؛ هذا يشمل العضو المزال عند التحديث التالي. 5xx أو انقطاع الشبكة يحتفظان بآخر عرض مع رسالة قابلة لإعادة المحاولة.

## تفضيلات خاصة بكل طلعة —24سبتمبر2026

أضيف OutingContext إلى Settings: نوع عائلية/أصدقاء/على راحتنا وأولويات هدوء/مشاركة/اكتشاف. لا يغير القيود الشخصية. إنشاء الطلعة الدائمة يقبل context أيضًا؛ تعديلها يبطل الجولة المتأثرة ويخضع للصلاحيات وexpected. [العقد المفصل وحدوده وقيمه الافتراضية](api-quick-decision.ar.md).

## شخصيات اللمّة —24سبتمبر2026

| المسار | الطلب والصلاحية | الاستجابة |
|---|---|---|
| `PUT /groups/{id}/me/skin` | عضو نشط يعدّل شخصيته؛ القروب مفتوح | CircleView |
| `PUT /outings/{id}/me/skin` | العضو نفسه موجود في الطلعة؛ القروب والطلعة مفتوحان | OutingView |

الطلب `{"skin": Skin أو null, "expected": Skin أو null}`. الحقلان إلزاميان. expected هي القيمة المحفوظة عند فتح المحرر: skin العضوية في مسار القروب، أو **skin_override الخام** في مسار الطلعة، وليست الشخصية الموروثة المعروضة. القفل ثم مقارنة النماذج بعد ملء قيمها الافتراضية يمنع ضياع تعديل جهاز آخر. 401 لجلسة مفقودة، 404 لغير العضو/العضو المزال، 409 للأرشفة أو تعارض التعديل، 422 لقيم غير معروفة أو حقول إضافية مثل member_id. لا مسار لتعديل شكل شخص آخر، حتى للمالك.

| حقل Skin | القيم | الافتراضي |
|---|---|---|
| version | 1 | 1 |
| persona | host / on_way / you_choose | مطلوب |
| tone | light / warm / deep | warm |
| outfit | thobe / abaya / casual | casual |
| color | palm / saffron / rose / sky | palm |
| accessory | none / glasses | none |
| expression | smile / wink / side_eye | smile |
| phrase | classic / extra | classic |

مثال اختيار المعزّب لأول مرة: `{"skin":{"persona":"host","outfit":"thobe"},"expected":null}`. استجابة CircleMember تضيف skin؛ استجابة Participant تضيف skin الفعلية وskin_override. كلاهما null افتراضيًا للتوافق. الأسماء والعبارات الثابتة والرسومات في الواجهة، وليست HTML أو رابط صورة مخزنًا. بيانات الشكل عامة للأعضاء الذين لهم حق قراءة القروب، وليست ضمن دعوة الزائر العامة أو Preferences.

skin=null في القروب تعني إزالة الشخصية الافتراضية. في الطلعة تعني إزالة التخصيص والعودة لشخصية القروب؛ لا تعني إخفاء شخصية موروثة. القروب الآخر له اختيار مستقل. عند إغلاق الطلعة تحفظ الشخصية الفعلية في skin_snapshot، وتبقى null لقطة صحيحة لعدم اختيار شخصية. تغيير شخصية القروب لاحقًا لا يغير الأرشيف، وإعادة الإغلاق لا تستبدل اللقطة. الشخصية لا تغيّر الحضور أو الحساسية أو الميزانية أو التصويت أو planning_revision، ولا تشغّل invalidate.

التحقق: [اختبارات الخادم](../backend/tests/test_skins.py) للصلاحيات والتزامن والميراث والأرشفة والقيود، و[اختبارات المتصفح](../tests/skins.spec.ts) للتحرير والمشاركة وإعادة المحاولة. شرح التنفيذ في [الفصل19](learning-python-postgres/19-outing-skins.ar.md).

## دعوة الطلعة المصممة —25سبتمبر2026

مالك القروب وقائد الطلعة الحالي يستطيعان إدارة `/api/plan-invitations/outing/{id}`؛ العضو العادي لا يستطيع النشر أو التعديل أو الإلغاء. يمكن مشاركة الطلعة المغلقة باستخدام لقطة خطتها القائمة. الرابط للعرض فقط بلا حساب؛ العضوية والحضور والشخصيات لا تُنشر فيه، ولا يحل محل `/join`. [عقد المشاركة](api-plan-sharing.ar.md) و[الفصل20](learning-python-postgres/20-designed-invitations.ar.md).
