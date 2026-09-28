import { Image, View, type ImageSourcePropType } from "react-native";
import { Dices, PartyPopper, Meh } from "lucide-react-native";
import { T } from "../../shared/ui/primitives";
import { colors as c } from "../../shared/theme";
import {
  fitSkin,
  moods,
  palettes,
  personaName,
  type Mood,
  type Skin,
} from "./catalog";
import {
  artworkFor,
  glasses,
  girlGlasses,
  sunglasses,
  boySunglasses,
  flower,
  props,
} from "./artwork";

/** All positions use one 160-unit canvas, regardless of the avatar's size. */
function Layer({
  source,
  size,
  frame = [0, 0, 160, 160],
}: {
  source: ImageSourcePropType;
  size: number;
  frame?: readonly [number, number, number, number];
}) {
  const [x, y, width, height] = frame;
  const scale = size / 160;
  return (
    <Image
      source={source}
      accessible={false}
      aria-hidden
      resizeMode="stretch"
      fadeDuration={0}
      style={{
        position: "absolute",
        left: x * scale,
        top: y * scale,
        width: width * scale,
        height: height * scale,
      }}
    />
  );
}

/** Transparent generated art, assembled live; only Skin choices are saved. */
export function SkinAvatar({
  skin,
  name,
  size = 64,
  decorative = false,
  bare = false,
  mood,
}: {
  skin?: Skin | null;
  name: string;
  size?: number;
  decorative?: boolean;
  /** Keep the persona prop out of clothing and face previews. */
  bare?: boolean;
  /** A private, temporary reaction; never written back to the skin. */
  mood?: Mood | null;
}) {
  skin = skin ? fitSkin(skin) : skin;
  const label = skin
    ? `${name} · ${personaName(skin)}`
    : `${name} · بدون شخصية`;
  const palette = palettes[skin?.color ?? "palm"];
  const { base, garment, covers, faces } = artworkFor(skin);
  const girl = skin?.gender === "girl";
  const face =
    mood === "win"
      ? "smile"
      : mood === "lose"
        ? "side_eye"
        : (skin?.expression ?? "smile");
  const Reaction = mood === "win" ? PartyPopper : mood === "lose" ? Meh : Dices;
  return (
    <View
      accessible={!decorative}
      aria-hidden={decorative || undefined}
      accessibilityRole={decorative ? undefined : "image"}
      accessibilityLabel={
        decorative ? undefined : mood ? `${label} · ${moods[mood].name}` : label
      }
      style={{ width: size, height: size }}
    >
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          overflow: "hidden",
          backgroundColor: palette.light,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {skin ? (
          <>
            <Layer source={base} size={size} />
            {garment && <Layer source={garment} size={size} />}
            <Layer
              source={faces[face]}
              size={size}
              frame={girl ? [9, -5, 142, 142] : [19, 9, 124, 124]}
            />
            {skin.headwear === "cap" && (
              <Layer source={covers.none} size={size} />
            )}
            <Layer
              source={covers[skin.headwear ?? "none"]}
              size={size}
              frame={
                skin.headwear === "cap"
                  ? girl
                    ? [0, -20, 160, 160]
                    : [0, -8, 160, 160]
                  : skin.headwear === "shemagh" || skin.headwear === "ghutra"
                    ? [0, -6, 160, 160]
                    : [0, 0, 160, 160]
              }
            />
            {skin.accessory === "glasses" && (
              <Layer
                source={girl ? girlGlasses : glasses}
                size={size}
                frame={girl ? [-8, -12, 172, 172] : [15, 5, 125, 125]}
              />
            )}
            {skin.accessory === "sunglasses" && (
              <Layer
                source={girl ? sunglasses : boySunglasses}
                size={size}
                frame={girl ? [40, 25, 84, 84] : [-2, -11, 160, 160]}
              />
            )}
            {skin.accessory === "flower" && (
              <Layer source={flower} size={size} frame={[25, 34, 30, 30]} />
            )}
            {!bare && (
              <Layer
                source={props[skin.persona]}
                size={size}
                frame={[100, 113, 50, 50]}
              />
            )}
          </>
        ) : (
          <T weight="semibold" style={{ fontSize: size * 0.4 }}>
            {Array.from(name)[0]}
          </T>
        )}
      </View>
      {skin && mood && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: size * 0.32,
            height: size * 0.32,
            borderRadius: size * 0.16,
            backgroundColor: c.white,
            borderWidth: 1,
            borderColor: c.line,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Reaction size={size * 0.18} color={palette.ink} />
        </View>
      )}
    </View>
  );
}
