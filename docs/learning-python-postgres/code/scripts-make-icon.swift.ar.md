# شرح `scripts/make-icon.swift`

[فهرس الكود](README.ar.md) · [دروس البداية](../README.ar.md) · [قاموس الرموز](../01-foundations.ar.md) · [التنسيق](../08-components.ar.md)

المصدر: [الملف في النسخة المرجعية](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/scripts/make-icon.swift) · [الملف المحلي](../../../scripts/make-icon.swift). عدد الأسطر: 16. المقاطع التالية تعرض المصدر نفسه دون تعديل، والشرح خارج الكود.

## لوحة رسم macOS

[الأسطر 1–4](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/scripts/make-icon.swift#L1): AppKit تستخدم لإنشاء NSImage بحجم 1024×1024 وقفل سطح الرسم. هذه أداة تجهيز أصل PNG؛ ليست إعادة كتابة التطبيق بـ SwiftUI.

```swift
import AppKit
let size = NSSize(width: 1024, height: 1024)
let image = NSImage(size: size)
image.lockFocus()
```

## الخلفية والحرف

[الأسطر 5–10](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/scripts/make-icon.swift#L5): NSColor تحدد الخلفية ثم تملأ NSRect. NSMutableParagraphStyle للمحاذاة و NSFont تختار GeezaPro-Bold أو خط النظام بديلًا. attrs قاموس خصائص النص الممرر إلى رسم NSString، وليس كائن NSAttributedString هنا.

```swift
NSColor(calibratedRed: 0.13, green: 0.35, blue: 0.26, alpha: 1).setFill()
NSRect(origin: .zero, size: size).fill()
let paragraph = NSMutableParagraphStyle()
paragraph.alignment = .center
let font = NSFont(name: "GeezaPro-Bold", size: 620) ?? NSFont.systemFont(ofSize: 620, weight: .semibold)
let attrs: [NSAttributedString.Key: Any] = [.font: font, .foregroundColor: NSColor(calibratedRed: 0.97, green: 0.97, blue: 0.93, alpha: 1), .paragraphStyle: paragraph]
```

## رسم العلامة

[الأسطر 11–13](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/scripts/make-icon.swift#L11): draw تضع الحرف في مستطيل، و NSBezierPath ترسم النقطة/الشكل المحدد. الإحداثيات اختيارات تصميمية لا بيانات مستخدم.

```swift
("ح" as NSString).draw(in: NSRect(x: 90, y: 185, width: 844, height: 745), withAttributes: attrs)
NSColor(calibratedRed: 0.84, green: 0.48, blue: 0.34, alpha: 1).setFill()
NSBezierPath(ovalIn: NSRect(x: 270, y: 192, width: 82, height: 82)).fill()
```

## تصدير PNG

[الأسطر 14–16](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/scripts/make-icon.swift#L14): نفك قفل الرسم، ونحوّل TIFF داخلية إلى NSBitmapImageRep ثم PNG ونكتب إلى assets/icon.png. استعمال ! يفترض نجاح إنشاء الصورة في هذه الأداة المحلية.

```swift
image.unlockFocus()
let bitmap = NSBitmapImageRep(data: image.tiffRepresentation!)!
try bitmap.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: "assets/icon.png"))
```

## تأكدي من فهمك

اختاري مقطعًا واشرحي مدخلاته ونتيجته وما الذي يغيّره. ثم اكتبي مثالًا أصغر بنفس الفكرة في مجلد تدريب، واذكري ما يجب اختباره قبل دمجه.
