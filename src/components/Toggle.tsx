import { Pressable, View } from "react-native";
import { Host, Switch } from "@expo/ui";
import { colors } from "../theme";

// One accessible 44pt target; the Expo UI control provides the native visual.
export function Toggle({
  value,
  onValueChange,
  label,
  testID,
}: {
  value: boolean;
  onValueChange: (value: boolean) => void;
  label: string;
  testID: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessible
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      onPress={() => onValueChange(!value)}
      style={{ width: 54, height: 44, justifyContent: "center" }}
    >
      <View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Host
          seedColor={colors.green}
          colorScheme="light"
          style={{ width: 54, height: 34 }}
        >
          <Switch value={value} onValueChange={onValueChange} />
        </Host>
      </View>
    </Pressable>
  );
}
