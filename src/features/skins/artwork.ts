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

export const girlGlasses =
  require("../../../assets/skins/v1/girl-accessory-glasses.png") as ImageSourcePropType;
export const boySunglasses =
  require("../../../assets/skins/v1/boy-accessory-sunglasses.png") as ImageSourcePropType;

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

// The girl's head, neck and garment are one connected drawing. Selecting an
// outfit or skin tone swaps this base; facial expressions and accessories stay separate.
const girlBases = {
  casual: {
    fair: require("../../../assets/skins/v1/girl-base-casual-fair.png"),
    light: require("../../../assets/skins/v1/girl-base-casual-light.png"),
    warm: require("../../../assets/skins/v1/girl-base-casual-warm.png"),
    tan: require("../../../assets/skins/v1/girl-base-casual-tan.png"),
    deep: require("../../../assets/skins/v1/girl-base-casual-deep.png"),
  },
  abaya: {
    fair: require("../../../assets/skins/v1/girl-base-abaya-fair.png"),
    light: require("../../../assets/skins/v1/girl-base-abaya-light.png"),
    warm: require("../../../assets/skins/v1/girl-base-abaya-warm.png"),
    tan: require("../../../assets/skins/v1/girl-base-abaya-tan.png"),
    deep: require("../../../assets/skins/v1/girl-base-abaya-deep.png"),
  },
} satisfies Record<
  "casual" | "abaya",
  Record<Skin["tone"], ImageSourcePropType>
>;
const girlCovers = {
  ...covers,
  none: require("../../../assets/skins/v1/girl-hair.png"),
  hijab: require("../../../assets/skins/v1/girl-headwear-hijab.png"),
  cap: require("../../../assets/skins/v1/girl-headwear-cap.png"),
};

export function outfitArtwork(skin: Skin, outfit: Skin["outfit"]) {
  return skin.gender === "girl"
    ? girlBases[outfit === "abaya" ? "abaya" : "casual"][skin.tone ?? "warm"]
    : clothes[outfit];
}

/** One lookup shared by the editor, plan, roulette and invitation avatars. */
export function artworkFor(skin: Skin | null | undefined) {
  return skin?.gender === "girl"
    ? {
        base: outfitArtwork(skin, skin.outfit),
        garment: null,
        faces: girlFaces,
        covers: girlCovers,
      }
    : {
        base: heads[skin?.tone ?? "warm"],
        garment: clothes[skin?.outfit ?? "casual"],
        faces,
        covers,
      };
}
