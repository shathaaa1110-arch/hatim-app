# شرح `app.json`

[فهرس الكود](README.ar.md) · [دروس البداية](../README.ar.md) · [قاموس الرموز](../01-foundations.ar.md) · [التنسيق](../08-components.ar.md)

المصدر: [الملف في النسخة المرجعية](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/app.json) · [الملف المحلي](../../../app.json). عدد الأسطر: 39. المقاطع التالية تعرض المصدر نفسه دون تعديل، والشرح خارج الكود.

## إعداد تطبيق Expo

[الأسطر 1–39](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/app.json#L1): الاسم و slug والإصدار والاتجاه والأيقونة إعدادات التطبيق. ios تحدد bundleIdentifier واسم العرض ودعم iPad، و infoPlist تمرر بيانات البناء الأصلية. android تحدد معرفه وصور adaptiveIcon. web تستخدم Metro وتخرج صفحة واحدة. plugins تجهز تكامل الخطوط والتخزين الأصلي. scheme تعلن hatim كنوع رابط، ولا تعني وحدها تنفيذ تدفق deep link كامل. تغيير إعداد أصلي يتطلب إعادة توليد وبناء Xcode.

```json
{
  "expo": {
    "name": "Hatim",
    "slug": "hatim",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "com.hatim.app",
      "infoPlist": {
        "CFBundleDisplayName": "حاتم",
        "ITSAppUsesNonExemptEncryption": false
      }
    },
    "android": {
      "adaptiveIcon": {
        "backgroundColor": "#E6F4FE",
        "foregroundImage": "./assets/android-icon-foreground.png",
        "backgroundImage": "./assets/android-icon-background.png",
        "monochromeImage": "./assets/android-icon-monochrome.png"
      },
      "predictiveBackGestureEnabled": false,
      "package": "com.hatim.app"
    },
    "web": {
      "favicon": "./assets/favicon.png",
      "bundler": "metro",
      "output": "single",
      "name": "حاتم — لكل لَمّة، حكاية"
    },
    "plugins": [
      "expo-font",
      "expo-secure-store"
    ],
    "scheme": "hatim"
  }
}
```

## تأكدي من فهمك

اختاري مقطعًا واشرحي مدخلاته ونتيجته وما الذي يغيّره. ثم اكتبي مثالًا أصغر بنفس الفكرة في مجلد تدريب، واذكري ما يجب اختباره قبل دمجه.
