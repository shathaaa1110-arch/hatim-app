import type { InvitationDetails } from "./api";

export const themes = {
  palm: {
    name: "لمّة نخيل",
    ink: "#234C3C",
    light: "#EAF0E4",
    accent: "#D4B273",
  },
  saffron: {
    name: "سهرة زعفران",
    ink: "#713A24",
    light: "#FBEDDD",
    accent: "#DFAC63",
  },
  rose: {
    name: "سفرة ورد",
    ink: "#673F50",
    light: "#F5E6E9",
    accent: "#CD9DAB",
  },
};
export function themeFor(details: InvitationDetails) {
  return themes[details.theme ?? "palm"];
}
export const contexts = {
  any: "على راحتنا",
  family: "لمّة عائلية",
  friends: "طلعة الربع",
};
export const stamp = (value: string) =>
  new Date(value).toLocaleString("ar-SA", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Riyadh",
  });
