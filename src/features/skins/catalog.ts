import type { components } from "../../shared/api/schema";

export type Skin = components["schemas"]["Skin"];
/** A moment's reaction drawn over the saved look; it is never stored. */
export type Mood = "win" | "lose" | "draw";

export const genders = { girl: "بنت", boy: "ولد" } satisfies Record<
  Skin["gender"],
  string
>;

export const personas = {
  host: {
    name: "المعزّب",
    detail: "الدلّة جاهزة، والكرم زايد",
    phrases: {
      classic: "حياكم… بس لا تطلبون قبلي",
      extra: "الحلى عليّ… مين قال شبعتوا؟",
    },
  },
  on_way: {
    name: "عند الإشارة",
    detail: "المفاتيح جاهزة، والوصول قصة",
    phrases: { classic: "قدامكم بدقيقتين", extra: "وصلت… باقي الموقف بس" },
  },
  you_choose: {
    name: "اختاروا أنتم",
    detail: "المنيو كامل، والقرار عندكم",
    phrases: { classic: "بس مو هذا", extra: "أي شيء… عندكم اقتراح ثاني؟" },
  },
} satisfies Record<
  Skin["persona"],
  {
    name: string;
    detail: string;
    phrases: Record<NonNullable<Skin["phrase"]>, string>;
  }
>;

export const palettes = {
  palm: { name: "نخيل", ink: "#386551", light: "#E3EEDF" },
  saffron: { name: "زعفران", ink: "#B27B30", light: "#F7ECD5" },
  rose: { name: "ورد طايف", ink: "#A75F70", light: "#F6E4E8" },
  sky: { name: "سما", ink: "#547A9A", light: "#E3EDF6" },
} as const;

// Labels accompany generated previews and remain available to screen readers.
export const tones = {
  fair: { name: "فاتح جدًا", fill: "#F7DCC6" },
  light: { name: "فاتح", fill: "#F0C6A4" },
  warm: { name: "حنطي", fill: "#CB9169" },
  tan: { name: "قمحي غامق", fill: "#A9744F" },
  deep: { name: "أسمر", fill: "#885639" },
} satisfies Record<Skin["tone"], { name: string; fill: string }>;

export const outfits = {
  thobe: "ثوب",
  abaya: "عباية",
  casual: "كاجوال",
} satisfies Record<Skin["outfit"], string>;

export const headwears = {
  none: "بدون غطاء",
  shemagh: "شماغ",
  ghutra: "غترة",
  taqiyah: "طاقية",
  hijab: "حجاب",
  cap: "قبعة كاجوال",
} satisfies Record<Skin["headwear"], string>;

export const expressions = {
  smile: { name: "ابتسامة" },
  wink: { name: "غمزة" },
  side_eye: { name: "نظرة جانبية" },
} satisfies Record<Skin["expression"], { name: string }>;

export const accessories = {
  none: { name: "بدون إكسسوار" },
  glasses: { name: "نظارة" },
  sunglasses: { name: "نظارة شمسية" },
  flower: { name: "مشبك وردة" },
} satisfies Record<Skin["accessory"], { name: string }>;

export function outfitsFor(skin: Skin) {
  return skin.gender === "girl"
    ? { casual: outfits.casual, abaya: outfits.abaya }
    : { casual: outfits.casual, thobe: outfits.thobe };
}

export function headwearsFor(skin: Skin) {
  return skin.gender === "girl"
    ? { none: headwears.none, hijab: headwears.hijab, cap: headwears.cap }
    : {
        none: headwears.none,
        shemagh: headwears.shemagh,
        ghutra: headwears.ghutra,
        taqiyah: headwears.taqiyah,
        cap: headwears.cap,
      };
}

export function accessoriesFor(skin: Skin) {
  return skin.gender === "girl"
    ? accessories
    : {
        none: accessories.none,
        glasses: accessories.glasses,
        sunglasses: accessories.sunglasses,
      };
}

/** Same compatibility rule as Skin.matching_wardrobe on the server. */
export function fitSkin(skin: Skin): Skin {
  if (skin.gender !== "girl")
    return {
      ...skin,
      outfit: skin.outfit === "abaya" ? "casual" : skin.outfit,
      headwear: skin.headwear === "hijab" ? "none" : skin.headwear,
      accessory: skin.accessory === "flower" ? "none" : skin.accessory,
    };
  return {
    ...skin,
    outfit: skin.outfit === "thobe" ? "casual" : skin.outfit,
    headwear: ["shemagh", "ghutra", "taqiyah"].includes(skin.headwear)
      ? "none"
      : skin.headwear,
  };
}

export const moods = {
  win: { name: "فاز اختيارك" },
  lose: { name: "راح صوتك لغيره" },
  draw: { name: "القرعة حسمت" },
} satisfies Record<Mood, { name: string }>;

export const defaultSkin: Skin = {
  version: 1,
  persona: "host",
  gender: "boy",
  tone: "warm",
  outfit: "casual",
  headwear: "none",
  color: "palm",
  accessory: "none",
  expression: "smile",
  phrase: "classic",
};

export function personaName(skin: Pick<Skin, "persona" | "gender">) {
  return skin.persona === "host" && skin.gender === "girl"
    ? "المعزّبة"
    : personas[skin.persona].name;
}

export function skinPhrase(skin: Skin) {
  return personas[skin.persona].phrases[skin.phrase ?? "classic"];
}

const any = <T extends string>(values: Partial<Record<T, unknown>>) => {
  const keys = Object.keys(values) as T[];
  return keys[Math.floor(Math.random() * keys.length)];
};

/**
 * «فاجئني» shuffles the playful parts only. Gender, tone, clothing and head cover
 * describe the person, so a dice roll never changes them.
 */
export function surprise(skin: Skin): Skin {
  return {
    ...skin,
    persona: any(personas),
    color: any(palettes),
    expression: any(expressions),
    accessory: any(accessoriesFor(skin)),
    phrase: any({ classic: 0, extra: 0 }),
  };
}
