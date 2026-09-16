import { Image } from "react-native";
import { Bookmark, Sparkles } from "lucide-react-native";
import type { Experience, Group } from "../../shared/contracts";
import { ar, colors as c, photos } from "../../shared/theme";
import { Button, Chip, Notice, Row, T } from "../../shared/ui/primitives";

export function PlanExperienceContent({
  detail,
  group,
  busy,
  error,
  onAnchor,
  onSave,
}: {
  detail: Experience;
  group: Group | null;
  busy: boolean;
  error: string | null;
  onAnchor: () => Promise<void>;
  onSave: () => void;
}) {
  return (
    <>
      <Image
        source={photos[detail.image]}
        style={{ height: 230, width: "100%", borderRadius: 22 }}
      />
      <Row style={{ justifyContent: "space-between" }}>
        <Chip label={detail.category} />
        <T style={{ color: c.muted, fontSize: 12 }}>
          {detail.venue} · {detail.neighborhood}
        </T>
      </Row>
      <T style={{ lineHeight: 29, fontSize: 16 }}>{detail.description}</T>
      <Row>
        <Chip label={`${ar(detail.price)} ر.س / شخص`} />
        <Chip label={`${ar(detail.minutes)} دقيقة`} />
      </Row>
      <Notice text={`ليش اخترناها؟ ${detail.why}`} />
      {error && <Notice warning text={error} />}
      {group?.plan.pocket.find((x) => x.experience_id === detail.id)
        ?.blocked && (
        <Notice
          warning
          text={
            group?.plan.pocket.find((x) => x.experience_id === detail.id)!
              .reason
          }
        />
      )}
      {group?.plan.selected
        .find((x) => x.experience_id === detail.id)
        ?.adaptations?.map((text, i) => (
          <Notice key={i} text={text} />
        ))}
      {!group?.settings.completed_ids?.includes(detail.id) && (
        <>
          <Button
            label={
              group?.settings.anchor_id === detail.id
                ? "حرّر الركيزة من الخطة"
                : "هذه ركيزة خطتي"
            }
            icon={Sparkles}
            busy={busy}
            disabled={!group && !!error}
            onPress={onAnchor}
          />
          <Button
            secondary
            label={
              group?.settings.pocket_ids?.includes(detail.id)
                ? "أرجعها للترتيب"
                : "خليها في الجيب"
            }
            icon={Bookmark}
            disabled={
              busy ||
              (!group && !!error) ||
              group?.settings.anchor_id === detail.id
            }
            onPress={onSave}
          />
        </>
      )}
      <T style={{ color: c.muted, fontSize: 11, lineHeight: 21 }}>
        تجربة توضيحية. معلومات الحساسية والتوافر غير موثّقة، ولا يتم إجراء حجز.
      </T>
    </>
  );
}
