import { View } from "react-native";
import Svg, { Circle, Ellipse, G, Path, Rect } from "react-native-svg";
import { T } from "../../../shared/ui/primitives";
import { colors as c } from "../../../shared/theme";
import type { Skin } from "../api";
import { palettes, personas } from "./catalog";

/** Layered vectors keep every outfit, expression and accessory editable on iOS and web. */
export function SkinAvatar({
  skin,
  name,
  size = 64,
}: {
  skin?: Skin | null;
  name: string;
  size?: number;
}) {
  if (!skin)
    return (
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={`${name} · بدون شخصية`}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: c.sage,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <T weight="semibold" style={{ fontSize: size * 0.4 }}>
          {Array.from(name)[0]}
        </T>
      </View>
    );
  const palette = palettes[skin.color ?? "palm"];
  const tone = { light: "#F0C6A4", warm: "#CB9169", deep: "#885639" }[
    skin.tone ?? "warm"
  ];
  const abaya = skin.outfit === "abaya";
  const thobe = skin.outfit === "thobe";
  const outline = "#3A332D";
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${name} · ${personas[skin.persona].name}`}
      style={{ width: size, height: size }}
    >
      <Svg width={size} height={size} viewBox="0 0 160 160" accessible={false}>
        <Circle cx="80" cy="80" r="78" fill={palette.light} />
        <Path
          d="M15 66l3-7 3 7 7 3-7 3-3 7-3-7-7-3z M132 28l2-5 2 5 5 2-5 2-2 5-2-5-5-2z"
          fill={palette.ink}
          opacity=".45"
        />
        <Ellipse
          cx="80"
          cy="143"
          rx="47"
          ry="7"
          fill={palette.ink}
          opacity=".14"
        />
        <G
          stroke={outline}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <Path
            d="M43 141l7-37q3-17 30-17t30 17l7 37z"
            fill={thobe ? "#FFF9EA" : palette.ink}
          />
          {thobe ? (
            <>
              <Path d="M71 91l9 10 9-10M80 101v37" fill="none" />
              <Circle cx="84" cy="109" r="1" fill={outline} />
              <Path d="M94 109h9v11h-9z" fill="none" />
            </>
          ) : (
            <Path
              d={abaya ? "M60 94l20 41 20-41M80 135v7" : "M64 92q16 18 32 0"}
              fill="none"
              stroke={abaya ? "#D8BB7A" : palette.light}
            />
          )}
          <Rect x="70" y="79" width="20" height="22" rx="8" fill={tone} />
          {abaya && (
            <Path
              d="M44 66q-4-47 35-47t37 47l-1 41-25-13H68l-26 13z"
              fill={palette.ink}
            />
          )}
          <Ellipse cx="48" cy="63" rx="7" ry="10" fill={tone} />
          <Ellipse cx="112" cy="63" rx="7" ry="10" fill={tone} />
          <Rect x="49" y="28" width="62" height="62" rx="27" fill={tone} />
          {abaya ? (
            <Path
              d="M47 61q-4-42 33-42t34 43q-19-5-27-25-13 15-40 24z"
              fill={palette.ink}
            />
          ) : (
            <Path
              d="M49 52q-9-23 7-28 4-17 31-11 25-1 26 26l-4 15-9-19q-14 9-26 0-10 17-25 17z"
              fill={outline}
            />
          )}
          <Path d="M58 52l11-2M90 50l11 2" fill="none" />
          <Circle
            cx={skin.expression === "side_eye" ? 67 : 64}
            cy="61"
            r="3"
            fill={outline}
            stroke="none"
          />
          {skin.expression === "wink" ? (
            <Path d="M91 60l7 3-7 2" fill="none" />
          ) : (
            <Circle
              cx={skin.expression === "side_eye" ? 98 : 95}
              cy="61"
              r="3"
              fill={outline}
              stroke="none"
            />
          )}
          <Path d="M79 63l-2 8h4" fill="none" opacity=".5" />
          <Path
            d={
              skin.expression === "side_eye"
                ? "M73 80q9-1 14-5"
                : "M70 76q10 13 20 0z"
            }
            fill={skin.expression === "side_eye" ? "none" : "#FFF9EA"}
          />
          {skin.accessory === "glasses" && (
            <G fill="none">
              <Rect x="54" y="54" width="20" height="17" rx="6" />
              <Rect x="85" y="54" width="20" height="17" rx="6" />
              <Path d="M74 59h11M49 57h5M105 57h6" />
            </G>
          )}
          {skin.persona === "host" && (
            <G>
              <Path
                d="M37 117q5-8 15-3l12 9-5 10-21-5zM109 113q13-6 17 5l-13 15-12-8z"
                fill={tone}
              />
              <Rect
                x="22"
                y="131"
                width="116"
                height="7"
                rx="3.5"
                fill="#D8AA50"
              />
              <Path
                d="M82 104q-19-15-9-26l6 12 13 5M106 93q21-11 22 3t-17 19"
                fill="none"
                stroke="#B27B30"
                strokeWidth="6"
              />
              <Path
                d="M88 91h18q-6 15 5 27 4 14-14 14t-14-14q11-12 5-27z"
                fill="#D8AA50"
              />
              <Path d="M86 91q11-13 22 0z" fill="#F4CD78" />
              <Circle cx="97" cy="81" r="3" fill="#D8AA50" />
              <Path
                d="M37 116h15l-3 15h-9zM57 119h14l-3 12h-8z"
                fill="#FFF9EA"
              />
            </G>
          )}
          {skin.persona === "on_way" && (
            <G>
              <Path
                d="M110 108l13-13 9 8-13 20zM48 110l-13 8 6 11 16-9"
                fill={tone}
              />
              <Rect
                x="116"
                y="72"
                width="24"
                height="37"
                rx="5"
                transform="rotate(12 128 90)"
                fill={outline}
              />
              <Path d="M122 78l12 2-4 21-12-2z" fill="#E3EDF6" stroke="none" />
              <Path d="M124 90l4-4 1 7" fill="none" stroke={palette.ink} />
              <Circle
                cx="38"
                cy="129"
                r="8"
                fill="none"
                stroke="#D8AA50"
                strokeWidth="4"
              />
              <Path
                d="M38 137v13h6M32 135l-6 12-4-3"
                fill="none"
                stroke="#D8AA50"
                strokeWidth="4"
              />
            </G>
          )}
          {skin.persona === "you_choose" && (
            <G>
              <Path
                d="M38 103l-8-20 9-3 11 20M113 108l17-7 6 12-18 7"
                fill={tone}
              />
              <Path d="M39 91l6-4-4-9-8 3-2-8-7 2 5 16z" fill={tone} />
              <Path
                d="M90 98l40-7-1 40q0 9 12 10l-42 7q-11-4-9-13z"
                fill="#FFF5DA"
              />
              <Path
                d="M101 106l18-3M101 113l18-3M100 120l12-2M100 127l18-3M100 134l12-2"
                fill="none"
                stroke={palette.ink}
              />
            </G>
          )}
        </G>
      </Svg>
    </View>
  );
}
