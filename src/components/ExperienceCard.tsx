import { Image, Pressable, StyleSheet, View } from "react-native";
import { ArrowUpLeft, Bookmark, Clock, MapPin } from "lucide-react-native";
import type { Experience } from "../api/client";
import { ar, colors as c, photos } from "../theme";
import { IconButton, Row, T } from "./ui";

export function ExperienceCard({
  experience: e,
  onOpen,
  onSave,
  saved,
  priority,
  compact,
}: {
  experience: Experience;
  onOpen: () => void;
  onSave?: () => void;
  saved?: boolean;
  priority?: string;
  compact?: boolean;
}) {
  return (
    <View style={s.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`تفاصيل ${e.title}`}
        onPress={onOpen}
        style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
      >
        <Image
          source={photos[e.image]}
          style={[s.image, compact && { height: 185 }]}
          accessibilityLabel={e.title}
        />
      </Pressable>
      <View style={s.category}>
        <T weight="medium" style={{ fontSize: 11 }}>
          {e.category}
        </T>
      </View>
      {onSave && (
        <View style={s.bookmark}>
          <IconButton
            light
            icon={Bookmark}
            label={
              saved ? `إزالة ${e.title} من الجيب` : `حفظ ${e.title} في الجيب`
            }
            active={saved}
            onPress={onSave}
          />
        </View>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`افتح ${e.title}`}
        onPress={onOpen}
        style={s.body}
      >
        <Row style={{ justifyContent: "space-between" }}>
          <Row style={{ gap: 4 }}>
            <MapPin size={12} color={c.muted} />
            <T style={s.meta}>{e.neighborhood}</T>
          </Row>
          {priority ? (
            <T weight="medium" style={{ fontSize: 11, color: c.green }}>
              {priority === "ركيزة" ? "✦ ركيزتكم" : priority}
            </T>
          ) : (
            <T style={s.meta}>{e.cuisine}</T>
          )}
        </Row>
        <T weight="semibold" numberOfLines={1} style={s.title}>
          {e.title}
        </T>
        <T style={s.subtitle}>
          {e.venue} · {e.cuisine}
        </T>
        <View style={s.divider} />
        <Row style={{ justifyContent: "space-between" }}>
          <Row style={{ gap: 14 }}>
            <T weight="medium" style={{ fontSize: 13 }}>
              {ar(e.price)} <T style={s.meta}>ر.س / شخص</T>
            </T>
            <Row style={{ gap: 4 }}>
              <Clock size={12} color={c.muted} />
              <T style={s.meta}>{ar(e.minutes)} د</T>
            </Row>
          </Row>
          <ArrowUpLeft size={18} color={c.green} />
        </Row>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: c.white,
    borderRadius: 25,
    overflow: "hidden",
    borderColor: c.line,
    borderWidth: 1,
  },
  image: { width: "100%", height: 228, backgroundColor: c.sage },
  category: {
    position: "absolute",
    top: 15,
    right: 15,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,.93)",
  },
  bookmark: { position: "absolute", top: 10, left: 10 },
  body: { padding: 18, gap: 6 },
  title: { fontSize: 21, lineHeight: 32 },
  meta: { fontSize: 11, color: c.muted },
  subtitle: { fontSize: 12, color: c.muted },
  divider: {
    height: 1,
    backgroundColor: c.line,
    marginTop: 9,
    marginBottom: 8,
  },
});
