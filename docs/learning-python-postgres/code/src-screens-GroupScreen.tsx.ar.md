# شرح `src/screens/GroupScreen.tsx`

[فهرس الكود](README.ar.md) · [دروس البداية](../README.ar.md) · [قاموس الرموز](../01-foundations.ar.md) · [التنسيق](../08-components.ar.md)

المصدر: [الملف في النسخة المرجعية](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/GroupScreen.tsx) · [الملف المحلي](../../../src/screens/GroupScreen.tsx). عدد الأسطر: 165. المقاطع التالية تعرض المصدر نفسه دون تعديل، والشرح خارج الكود.

## شاشة أعضاء المجموعة

[الأسطر 1–6](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/GroupScreen.tsx#L1): تستخدم Group المعادة للمنظّم، والتي تشمل التفضيلات. صفحة الدعوة تحصل على InviteView أقل تفصيلًا.

```tsx
import { Pressable, StyleSheet, View } from "react-native";
import { Edit3, Link, ShieldCheck, Trash2, Users } from "lucide-react-native";
import type { Group, Member } from "../api/client";
import { ar, colors as c } from "../theme";
import { Button, Chip, Row, T } from "../components/ui";

```

## عقد الإجراءات

[الأسطر 7–17](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/GroupScreen.tsx#L7): الأب يمرر onEdit و onInvite و onRemove. الشاشة لا تحتفظ بمفتاح وصول خاص بها.

```tsx
export function GroupScreen({
  group,
  onInvite,
  onEdit,
  onRemove,
}: {
  group: Group;
  onInvite: () => void;
  onEdit: () => void;
  onRemove: (member: Member) => void;
}) {
```

## العنوان

[الأسطر 18–30](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/GroupScreen.tsx#L18): نص ثابت يشرح أثر ذوق كل شخص على الخطة.

```tsx
  return (
    <View style={{ gap: 24 }}>
      <View>
        <T style={{ fontSize: 12, color: c.muted }}>
          الطاولة تسع أذواقنا كلّها
        </T>
        <T weight="semibold" style={{ fontSize: 34 }}>
          مين معنا في اللَمّة؟
        </T>
        <T style={{ color: c.muted, lineHeight: 26 }}>
          كل واحد يضيف ذوقه من رابط الدعوة. وحاتم يجمعها في قرار.
        </T>
      </View>
```

## الدعوة

[الأسطر 31–49](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/GroupScreen.tsx#L31): الضغط يستدعي onInvite ويفتح نافذة الرابط في Organizer. لا ينشئ عضوًا دون إدخال تفضيلاته.

```tsx
      <View style={s.invite}>
        <View style={s.inviteIcon}>
          <Users size={30} color={c.green} strokeWidth={1.5} />
        </View>
        <T weight="semibold" style={{ fontSize: 24, textAlign: "center" }}>
          اللمة ما تكمل إلا فيهم.
        </T>
        <T
          style={{
            color: c.muted,
            textAlign: "center",
            fontSize: 13,
            lineHeight: 25,
          }}
        >
          رابط واحد، بدون تحميل تطبيق. يختارون تفضيلاتهم وتوصلك تلقائيًا.
        </T>
        <Button label="اعزم الربع" onPress={onInvite} icon={Link} />
      </View>
```

## عد الأعضاء

[الأسطر 50–55](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/GroupScreen.tsx#L50): العدد مشتق من members.length، وليس عدادًا مستقلاً يجب مزامنته.

```tsx
      <Row style={{ justifyContent: "space-between" }}>
        <T weight="semibold" style={{ fontSize: 22 }}>
          أهل اللَمّة
        </T>
        <Chip label={`${ar(group.members.length)} / ١٢ أشخاص`} />
      </Row>
```

## بطاقات الأعضاء

[الأسطر 56–84](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/GroupScreen.tsx#L56): map تعرض الاسم والسياق وإشارة المنظّم. id مفتاح عنصر React ويساعد تحديد العضو في طلب الإزالة.

```tsx
      {group.members.map((member, index) => (
        <View key={member.id} style={s.member}>
          <Row>
            <View
              style={[
                s.avatar,
                {
                  backgroundColor: ["#E1E9D8", "#F2E4D8", "#E3E7EF"][index % 3],
                },
              ]}
            >
              <T weight="medium" style={{ fontSize: 25 }}>
                {member.preferences.name[0]}
              </T>
            </View>
            <View style={{ flex: 1 }}>
              <Row>
                <T weight="semibold" style={{ fontSize: 21 }}>
                  {member.preferences.name}
                </T>
                {member.organizer && (
                  <T style={{ color: c.muted, fontSize: 11 }}>أنت · المنظّم</T>
                )}
              </Row>
              <T style={{ color: c.muted, fontSize: 12 }}>
                {member.preferences.role} · حتى{" "}
                {ar(member.preferences.budget ?? 200)} ر.س / تجربة
              </T>
            </View>
```

## الإجراء المناسب للعضو

[الأسطر 85–101](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/GroupScreen.tsx#L85): المنظم يرى تعديل ملفه وإزالة العضو الآخر. هذا عرض للصلاحية؛ API يعيد التحقق ولا يعتمد إخفاء زر.

```tsx
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                member.organizer
                  ? "تعديل ذوقي"
                  : `إزالة ${member.preferences.name}`
              }
              onPress={member.organizer ? onEdit : () => onRemove(member)}
              style={{ padding: 12 }}
            >
              {member.organizer ? (
                <Edit3 size={18} color={c.green} />
              ) : (
                <Trash2 size={17} color={c.muted} />
              )}
            </Pressable>
          </Row>
```

## تفضيلات مختصرة

[الأسطر 102–110](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/GroupScreen.tsx#L102): الميزانية والنباتي والحار والمطابخ تعرض من preferences. القيم الافتراضية تحمي العرض عند حقول موصوفة كاختيارية في العقد المولد.

```tsx
          <View
            style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 6 }}
          >
            {member.preferences.cuisines?.map((cuisine) => (
              <Chip key={cuisine} label={cuisine} />
            ))}
            {member.preferences.vegetarian && <Chip label="نباتي" />}
            {member.preferences.mild && <Chip label="بدون حار" />}
          </View>
```

## الحساسيات

[الأسطر 111–120](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/GroupScreen.tsx#L111): نبرز القيد بدل دفنه داخل نص. البيانات هنا متاحة للمنظّم لتنظيم المجموعة؛ لا تظهر لكل عضو في الدعوة المشتركة.

```tsx
          {!!member.preferences.allergies?.length && (
            <Row>
              <ShieldCheck size={16} color={c.warning} />
              <T style={{ color: c.warning, fontSize: 12 }}>
                حساسية: {member.preferences.allergies.join("، ")}
              </T>
            </Row>
          )}
        </View>
      ))}
```

## تفسير حدود المشاركة

[الأسطر 121–133](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/GroupScreen.tsx#L121): النص يوضح كيفية أخذ الجميع بالحسبان دون وعد أن كل تجربة ستناسب الجميع.

```tsx
      <T
        style={{
          textAlign: "center",
          color: c.muted,
          fontSize: 12,
          lineHeight: 24,
        }}
      >
        تفضيلات كل شخص بيده. بصفتك المنظّم، تشوفها عشان تراعي الجميع.
      </T>
    </View>
  );
}
```

## التنسيق البصري

[الأسطر 134–165](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/GroupScreen.tsx#L134): بطاقات الأعضاء وعناوينها وصندوق الدعوة والأزرار. كل خاصية تنسيق مشروحة في جدول الدرس 08. الكائنات هنا أسماء أنماط نمررها إلى style؛ لا ترسل طلبات ولا تعدل DB. ترتيب مصفوفة style يسمح للخصائص اللاحقة بتعديل الأساسية.

```tsx
const s = StyleSheet.create({
  invite: {
    backgroundColor: c.sage,
    borderRadius: 27,
    padding: 25,
    gap: 15,
    alignItems: "center",
  },
  inviteIcon: {
    backgroundColor: "#DFE8D5",
    width: 66,
    height: 66,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  member: {
    padding: 20,
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 23,
    backgroundColor: c.white,
    gap: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
  },
});
```

## تأكدي من فهمك

اختاري مقطعًا واشرحي مدخلاته ونتيجته وما الذي يغيّره. ثم اكتبي مثالًا أصغر بنفس الفكرة في مجلد تدريب، واذكري ما يجب اختباره قبل دمجه.
