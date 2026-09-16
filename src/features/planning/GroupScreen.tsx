import { Pressable, StyleSheet, View } from "react-native";
import { Edit3, Link, ShieldCheck, Trash2, Users } from "lucide-react-native";
import { type Group, type Member } from "../../shared/contracts";
import { ar, colors as c } from "../../shared/theme";
import { Button, Chip, Row, T } from "../../shared/ui/primitives";

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
      <Row style={{ justifyContent: "space-between" }}>
        <T weight="semibold" style={{ fontSize: 22 }}>
          أهل اللَمّة
        </T>
        <Chip label={`${ar(group.members.length)} / ١٢ أشخاص`} />
      </Row>
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
          <View
            style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 6 }}
          >
            {member.preferences.cuisines?.map((cuisine) => (
              <Chip key={cuisine} label={cuisine} />
            ))}
            {member.preferences.vegetarian && <Chip label="نباتي" />}
            {member.preferences.mild && <Chip label="بدون حار" />}
          </View>
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
