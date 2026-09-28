import type { Preferences } from "./contracts";

export const emptyPreferences: Preferences = {
  name: "",
  role: "مقيم",
  cuisines: [],
  allergies: [],
  vegetarian: false,
  mild: false,
  budget: 200,
};
