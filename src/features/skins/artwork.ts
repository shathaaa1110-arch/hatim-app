import type { ImageSourcePropType } from "react-native";
import type { Skin } from "./catalog";

// Static requires bundle the transparent layers for offline native use.
// Keep canvas padding: the face and head covers share its coordinates.
export const heads = {
  fair: require("../../../assets/skins/v1/head-fair.png"),
  light: require("../../../assets/skins/v1/head-light.png"),
  warm: require("../../../assets/skins/v1/head-warm.png"),
  tan: require("../../../assets/skins/v1/head-tan.png"),
  deep: require("../../../assets/skins/v1/head-deep.png"),
} satisfies Record<Skin["tone"], ImageSourcePropType>;

export const faces = {
  smile: require("../../../assets/skins/v1/face-smile.png"),
  wink: require("../../../assets/skins/v1/face-wink.png"),
  side_eye: require("../../../assets/skins/v1/face-side_eye.png"),
} satisfies Record<Skin["expression"], ImageSourcePropType>;

export const clothes = {
  thobe: require("../../../assets/skins/v1/outfit-thobe.png"),
  abaya: require("../../../assets/skins/v1/outfit-abaya.png"),
  casual: require("../../../assets/skins/v1/outfit-casual.png"),
} satisfies Record<Skin["outfit"], ImageSourcePropType>;

export const covers = {
  none: require("../../../assets/skins/v1/headwear-none.png"),
  shemagh: require("../../../assets/skins/v1/headwear-shemagh.png"),
  ghutra: require("../../../assets/skins/v1/headwear-ghutra.png"),
  taqiyah: require("../../../assets/skins/v1/headwear-taqiyah.png"),
  hijab: require("../../../assets/skins/v1/headwear-hijab.png"),
  cap: require("../../../assets/skins/v1/headwear-cap.png"),
} satisfies Record<Skin["headwear"], ImageSourcePropType>;

export const glasses =
  require("../../../assets/skins/v1/accessory-glasses.png") as ImageSourcePropType;

export const sunglasses =
  require("../../../assets/skins/v1/accessory-sunglasses.png") as ImageSourcePropType;
export const flower =
  require("../../../assets/skins/v1/accessory-flower.png") as ImageSourcePropType;

export const props = {
  host: require("../../../assets/skins/v1/prop-host.png"),
  on_way: require("../../../assets/skins/v1/prop-on_way.png"),
  you_choose: require("../../../assets/skins/v1/prop-you_choose.png"),
} satisfies Record<Skin["persona"], ImageSourcePropType>;

const girlFaces = {
  smile: require("../../../assets/skins/v1/girl-face-smile.png"),
  wink: require("../../../assets/skins/v1/girl-face-wink.png"),
  side_eye: require("../../../assets/skins/v1/girl-face-side_eye.png"),
} satisfies Record<Skin["expression"], ImageSourcePropType>;

const looks = {
  boy: { heads, faces, clothes, covers },
  girl: {
    heads: {
      fair: require("../../../assets/skins/v1/girl-head-fair.png"),
      light: require("../../../assets/skins/v1/girl-head-light.png"),
      warm: require("../../../assets/skins/v1/girl-head-warm.png"),
      tan: require("../../../assets/skins/v1/girl-head-tan.png"),
      deep: require("../../../assets/skins/v1/girl-head-deep.png"),
    },
    faces: girlFaces,
    clothes: {
      // Old clients may still send a thobe; it uses the same safe fallback as Skin.
      thobe: require("../../../assets/skins/v1/girl-outfit-casual.png"),
      abaya: require("../../../assets/skins/v1/girl-outfit-abaya.png"),
      casual: require("../../../assets/skins/v1/girl-outfit-casual.png"),
    },
    covers: {
      ...covers,
      none: require("../../../assets/skins/v1/girl-hair.png"),
      hijab: require("../../../assets/skins/v1/girl-headwear-hijab.png"),
    },
  },
};

/** One lookup shared by the editor, plan, roulette and invitation avatars. */
export function artworkFor(skin: Skin | null | undefined) {
  return looks[skin?.gender ?? "boy"];
}
