import { View } from "react-native";
import { T } from "../../../shared/ui/primitives";
import { Panel, s } from "../../../shared/ui/layout";
import type { Outing } from "../api";
import { SkinAvatar } from "./SkinAvatar";
import { personas, skinPhrase } from "./catalog";

export function SkinPeople({
  participants,
  choosing = false,
}: {
  participants: Outing["participants"];
  choosing?: boolean;
}) {
  const people = participants.filter((p) => p.attendance === "going");
  if (!people.length) return null;
  return (
    <Panel>
      <T weight="semibold">
        {choosing ? "شخصياتكم حول الاختيار" : "وجوه اللمّة"}
      </T>
      <View style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 14 }}>
        {people.map((p) => (
          <View
            key={p.member_id}
            style={{ width: 96, alignItems: "center", gap: 4 }}
          >
            <SkinAvatar skin={p.skin} name={p.name} size={72} />
            <T weight="semibold" style={{ textAlign: "center", fontSize: 13 }}>
              {p.name}
              {p.is_me ? " · أنت" : ""}
            </T>
            {p.skin && (
              <>
                <T style={{ textAlign: "center", fontSize: 12 }}>
                  {personas[p.skin.persona].name}
                </T>
                <T style={{ textAlign: "center", fontSize: 11 }}>
                  «{skinPhrase(p.skin)}»
                </T>
              </>
            )}
          </View>
        ))}
      </View>
      {choosing && (
        <T style={s.muted}>
          الشخصيات تشارك الجو؛ القرعة تختار تجربة أكل من الخيارات المعروضة.
        </T>
      )}
    </Panel>
  );
}
