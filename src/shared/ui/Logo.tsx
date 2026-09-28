import { View } from "react-native";
import { Row, T } from "./primitives";
import { colors as c } from "../theme";

export function Logo() {
  return (
    <Row style={{ gap: 3 }}>
      <T
        weight="semibold"
        style={{ fontSize: 36, lineHeight: 53, letterSpacing: -2 }}
      >
        حاتم
      </T>
      <View
        style={{
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: c.coral,
          marginTop: 10,
        }}
      />
    </Row>
  );
}
