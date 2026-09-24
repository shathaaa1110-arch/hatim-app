import type { Skin } from "../api";

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
    detail: "المفاتيح بيده، والوصول قصة",
    phrases: { classic: "قدامكم بدقيقتين", extra: "وصلت… باقي الموقف بس" },
  },
  you_choose: {
    name: "اختاروا أنتم",
    detail: "كل المنيو معه، والقرار عندكم",
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

export const defaultSkin: Skin = {
  version: 1,
  persona: "host",
  tone: "warm",
  outfit: "casual",
  color: "palm",
  accessory: "none",
  expression: "smile",
  phrase: "classic",
};

export function skinPhrase(skin: Skin) {
  return personas[skin.persona].phrases[skin.phrase ?? "classic"];
}
