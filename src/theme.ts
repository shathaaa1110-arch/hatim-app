export const colors = {
  background: "#F8F8F2",
  surface: "#FFFFFF",
  ink: "#193D32",
  green: "#215943",
  muted: "#78847B",
  line: "#E6E9E0",
  sage: "#EAF0E4",
  sageDark: "#D9E5D2",
  coral: "#D77A57",
  peach: "#F7EADF",
  warning: "#A45034",
  white: "#FFFFFF",
};
export const fonts = {
  regular: "IBMPlexSansArabic_400Regular",
  medium: "IBMPlexSansArabic_500Medium",
  semibold: "IBMPlexSansArabic_600SemiBold",
  bold: "IBMPlexSansArabic_700Bold",
};
export const ar = (n: number) => n.toLocaleString("ar-SA");

export const photos: Record<string, number> = {
  fire: require("../assets/food/fire.jpg"),
  sushi: require("../assets/food/sushi.jpg"),
  levant: require("../assets/food/levant.jpg"),
  pasta: require("../assets/food/pasta.jpg"),
  breakfast: require("../assets/food/breakfast.jpg"),
  bao: require("../assets/food/bao.jpg"),
  pizza: require("../assets/food/pizza.jpg"),
  coffee: require("../assets/food/coffee.jpg"),
  dessert: require("../assets/food/dessert.jpg"),
};
