# عقد الدعوة المصممة وملف الخطة —25سبتمبر2026

منفذ على فرع codex/persistent-groups؛ [OpenAPI](../backend/openapi.json) المصدر الكامل للأنواع. الدعوة للعرض فقط، مستقلة عن `/join/{code}` الذي يسجل رفقة الطلعة وتفضيلاتهم. لا حساب مطلوب لقراءة الدعوة العامة.

| المسار | الغرض والصلاحية |
|---|---|
| `GET /api/plan-invitations/{kind}/{source_id}` | معاينة المنظّم؛ لا تنشئ رابطًا عند القراءة |
| `PUT /api/plan-invitations/{kind}/{source_id}` | إنشاء رابط أو تعديل تصميمه داخل معاملة |
| `DELETE /api/plan-invitations/{kind}/{source_id}` | إلغاء الرابط؛ body يحتوي expected_revision |
| `GET /api/shared-plans/{code}` | إسقاط عام لآخر خطة؛ بلا Authorization |
| `GET /s/{code}` | صفحة Expo web للدعوة؛ بلا تسجيل دخول |
| `GET /api/v2/experiences/{experience_id}/google-rating` | تقييم عند الطلب لمكان حقيقي موثق؛ بلا حفظ في PostgreSQL |

`kind` إما plan للخطة المباشرة أو outing لطلعة القروب. الثلاثة الأولى تتطلب Bearer المنظّم: مفتاح الضيف أو جلسة مالك الخطة؛ في القروب جلسة مالكه أو قائد الطلعة الحالي. العضو العادي403، غير العضو404، والجلسة غير الصالحة في القروب401. الدعوة يمكن إدارتها حتى بعد إغلاق الطلعة. إذا تحولت الخطة المباشرة إلى قروب دائم، تتوقف دعوتها القديمة؛ أنشئي دعوة من الطلعة الناتجة.

طلب الحفظ:

```json
{
  "details": {
    "title": "خميسنا على سفرة",
    "message": "لكم مكان على الطاولة.",
    "when_label": "الخميس، ٨ مساءً بتوقيت الرياض",
    "meeting_note": "عند المدخل",
    "theme": "saffron"
  },
  "expected_revision": null
}
```

العنوان1–60 حرفًا، الرسالة حتى200، الموعد حتى80، التجمع حتى100. theme أحد palm/saffron/rose. التاريخ نص للعرض، ليس حجزًا ولا تقويمًا. expected_revision حقل مطلوب: null لأول نشر، ثم الرقم المعاد من الخادم. التعارض409؛ المدخل غير الصحيح422. التعديل يبقي نفس code. مراجعة الدعوة تأتي من sequence عام؛ الإلغاء ثم الإنشاء لا يعيدان استعمال المراجعة القديمة، فلا تنجح كتابة جهاز يحمل نسخة ملغاة. لا تفترضي أن الأرقام متتالية.

رد المنظّم `InvitationEditor`: details، plan، code nullable، revision nullable. رد العام `PublicInvitation`: details، plan، read_at، created_at؛ لا يرجع رقم المراجعة أو مفاتيح الإدارة. shared plan تحتوي context، entries، consumed، available، unfilled، anchor_unavailable، archived. كل entry: id، title، venue، neighborhood، cuisine، image، price، minutes، priority، reason تحريري عام، dishes، options العامة، is_demo، maps_url، maps_verified.

لا ترجع الدعوة أسماء أو شخصيات المشاركين أو حساسياتهم أو ميزانياتهم أو أسباب القرار الشخصية أو الجيب أو رمز الانضمام. النص الذي يكتبه المنظّم في الدعوة عام بموافقته؛ الواجهة تعرض تنبيهًا قبل النشر. أي شخص معه الرابط يستطيع قراءته وإعادة إرساله.

الإلغاء DELETE يحذف السجل؛ القراءة بعدها404. إلغاء رابط غير موجود يعيد ok لتكرار الطلب، لكن مراجعة قديمة لا تستطيع إلغاء رابط جديد. حذف المصدر يحذف رابط المشاركة عبر FK cascade. نسخ PDF المحفوظة لا تُسحب من أجهزة المستلمين.

المتصفح يقرأ كل6ثوانٍ أثناء النشاط وله زر تحديث. الردود no-store، والصفحة Referrer-Policy: no-referrer؛ لا تنتقل رموز الدعوة مع إحالات روابط الخرائط. لا WebSocket ولا إشعارات دفع. إذا فشل الاتصال يبقى المحتوى مع رسالة فشل وتعطيل PDF؛ عند404 يختفي المحتوى. الطلبات المتزامنة تقفل المصدر: groups في الخطة، ثم circle وouting في القروب.

## بيانات Google

Experience تضيف suggested_dishes بحد أقصى5 أطباق، google_place_id اختياري موثّق تحريريًا، وis_demo افتراضيًاtrue. لا يحوّل التطبيق تشابه اسم مطعم إلى تطابق تلقائي. الروابط دائمًا Google Maps Search مع query مشفّر، وتضيف query_place_id فقط لمكان حقيقي مربوط. للتجريبي يظهر «بحث بالاسم» دون ادعاء وجود موقع موثق.

رد التقييم: status أحد available/demo/unlinked/unavailable، rating وreview_count وchecked_at nullable، وattributions. المتصل الخارجي يطلب id/rating/userRatingCount/attributions فقط، يطابق id، يحد المهلة3ثوانٍ والحجم64KiB، ولا يتبع التحويلات. المفتاح GOOGLE_PLACES_API_KEY خاص بالخادم. عند غياب المفتاح أو خطأ المزود أو تجاوز20طلبًا بالدقيقة للعملية الواحدة، تكون النتيجة unavailable؛ لا تقييم مختلق. اضبطي كذلك حصة المشروع في Google، فالحد المحلي ليس موزعًا بين عمال متعددين.

التقييم الرقمي يظهر عند ضغط المستخدم في الصفحة مع نسبته إلى Google Maps ووقت الجلب وعدد المراجعات والمصادر الإضافية إن وُجدت. لا يُخزن ولا يُنسخ إلى PDF؛ الملف يحتوي رابط مراجعة التقييم الحالي. راجعي [سياسات Places](https://developers.google.com/maps/documentation/places/web-service/policies) و[عقد Google Maps](https://cloud.google.com/maps-platform/terms). التحقق الحالي للمزود بمحاكاة ردوده؛ لم يُضبط مفتاح حقيقي ولم تُربط التجارب الوهمية بأماكن حقيقية.

## التحقق

[اختبارات Python](../backend/tests/test_plan_sharing.py) تغطي الصلاحيات والتزامن والإلغاء وإعادة الإنشاء وحذف المصدر وتحويل الخطة والخصوصية وتقلص الخانات ومزود Google. [رحلتان للمتصفح](../tests/plan-sharing.spec.ts) تغطيان تصميمًا وتعديلًا ورابطًا عامًا وتحديثًا وإلغاءً، وتعارض جهازين، وتصدير العربية، ومنع تفسير نص المستخدم كـHTML. أدلة النسخ والتشغيل وحدودها في [الفصل20](learning-python-postgres/20-designed-invitations.ar.md).

التصدير لا يضيف endpoint للـPDF: ملف المتصفح يحتفظ بروابطHTML، وفيiOS تُضاف Link annotations بواسطة وحدة PDFKit محلية بعد Expo Print. الوجهات هي نفسها المعادة في الإسقاط العام؛ لا تتضمن صلاحية المنظّم. تحتاج نسخةXcode مبنية بوحدةHatimPdfLinks المحلية، وليستExpo Go.
