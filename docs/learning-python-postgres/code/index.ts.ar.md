# شرح `index.ts`

[فهرس الكود](README.ar.md) · [دروس البداية](../README.ar.md) · [قاموس الرموز](../01-foundations.ar.md) · [التنسيق](../08-components.ar.md)

المصدر: [الملف في النسخة المرجعية](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/index.ts) · [الملف المحلي](../../../index.ts). عدد الأسطر: 8. المقاطع التالية تعرض المصدر نفسه دون تعديل، والشرح خارج الكود.

## تسجيل نقطة البداية

[الأسطر 1–8](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/index.ts#L1): نستورد registerRootComponent من Expo و App من ملفنا. الاستدعاء يسجل App كنقطة بدء ويهيئ تكامل Expo. لا تنشئي دورة عرض أو اتصال DB هنا. التعليقات تشرح لماذا لا نستبدله عشوائيًا بتسجيل React Native مباشر.

```typescript
import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
```

## تأكدي من فهمك

اختاري مقطعًا واشرحي مدخلاته ونتيجته وما الذي يغيّره. ثم اكتبي مثالًا أصغر بنفس الفكرة في مجلد تدريب، واذكري ما يجب اختباره قبل دمجه.
