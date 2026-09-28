import { View } from "react-native";
import { T } from "../../../shared/ui/primitives";
import { Panel, s } from "../../../shared/ui/layout";
import { SkinAvatar, personaName, skinPhrase, type Mood } from "../../skins";
import type { Outing, Round } from "../api";

/**
 * Votes are secret: only this device knows my_vote, so only "me" can cheer or
 * sulk. A draw has no personal pick, so everyone shares the same dice badge.
 */
function moodOf(round: Round | null | undefined, isMe: boolean): Mood | null {
  if (round?.status !== "resolved" || !round.result_id) return null;
  if (round.mode === "draw") return "draw";
  if (!isMe || !round.my_vote) return null;
  return round.my_vote === round.result_id ? "win" : "lose";
}

export function SkinPeople({
  participants,
  choosing = false,
  round,
}: {
  participants: Outing["participants"];
  choosing?: boolean;
  /** Passed only once a result is visible, so reactions never spoil a spinning draw. */
  round?: Round | null;
}) {
  const people = participants.filter((p) => p.attendance === "going");
  if (!people.length) return null;
  const mine = people.find((p) => p.is_me);
  const myMood = moodOf(round, true);
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
            <SkinAvatar
              skin={p.skin}
              name={p.name}
              size={72}
              mood={p.skin ? moodOf(round, p.is_me) : null}
            />
            <T weight="semibold" style={{ textAlign: "center", fontSize: 13 }}>
              {p.name}
              {p.is_me ? " · أنت" : ""}
            </T>
            {p.skin && (
              <>
                <T style={{ textAlign: "center", fontSize: 12 }}>
                  {personaName(p.skin)}
                </T>
                <T style={{ textAlign: "center", fontSize: 11 }}>
                  «{skinPhrase(p.skin)}»
                </T>
              </>
            )}
          </View>
        ))}
      </View>
      {mine?.skin && (myMood === "win" || myMood === "lose") && (
        <T accessibilityLiveRegion="polite" style={s.muted}>
          {myMood === "win"
            ? "🎉 شخصيتك تحتفل: اختيارك فاز. هذا يظهر عندك فقط؛ صوتك يبقى سرًا."
            : "😒 شخصيتك زعلانة شوي: فاز خيار ثاني. هذا يظهر عندك فقط؛ صوتك يبقى سرًا."}
        </T>
      )}
      {choosing && (
        <T style={s.muted}>
          الشخصيات تشارك الجو؛ القرعة تختار تجربة أكل من الخيارات المعروضة.
        </T>
      )}
    </Panel>
  );
}
