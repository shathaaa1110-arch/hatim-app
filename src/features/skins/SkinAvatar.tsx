import { useId } from "react";
import { View } from "react-native";
import Svg, {
  Circle,
  ClipPath,
  Defs,
  Ellipse,
  G,
  Path,
  Pattern,
  Rect,
} from "react-native-svg";
import { T } from "../../shared/ui/primitives";
import { colors as c } from "../../shared/theme";
import {
  moods,
  palettes,
  personas,
  tones,
  type Mood,
  type Skin,
} from "./catalog";

const OUTLINE = "#3A2F28";
const HAIR = "#2B211C";
const MOUTH = "#6B2E2A";
const GOLD = "#D8AA50";
const CLOTH = "#FFFDF7";

// Shared outlines keep the head, its cover and the face opening aligned.
const FACE =
  "M80 34C99 34 108 48 108 66C108 86 96 100 80 100C64 100 52 86 52 66C52 48 61 34 80 34Z";
const HIJAB_OUTER =
  "M44 70C40 38 58 20 80 20C102 20 120 38 116 70C116 94 104 110 80 112C56 110 44 94 44 70Z";
const HIJAB_OPENING =
  "M80 39C96 39 104 51 104 66C104 84 94 97 80 97C66 97 56 84 56 66C56 51 64 39 80 39Z";

/** Mixes a skin colour toward black for gentle shading without extra choices. */
function shade(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16);
  const part = (shift: number) =>
    Math.round(((n >> shift) & 255) * (1 - amount))
      .toString(16)
      .padStart(2, "0");
  return `#${part(16)}${part(8)}${part(0)}`;
}

type Face = Skin["expression"] | "joy" | "sulk";

function Features({ face }: { face: Face }) {
  const brows = {
    smile: "M62 55Q68 51 74 54M86 54Q92 51 98 55",
    joy: "M62 52Q68 47 74 51M86 51Q92 47 98 52",
    wink: "M62 55Q68 51 74 54M86 51Q92 47 98 51",
    side_eye: "M62 55L74 56M86 53L98 51",
    sulk: "M62 53L74 57M86 57L98 53",
  }[face];
  const openEye = (x: number) => (
    <G key={x}>
      <Ellipse cx={x} cy="65" rx="3.4" ry="4.2" fill={OUTLINE} />
      <Circle cx={x + 1.2} cy="63.4" r="1.2" fill="white" />
    </G>
  );
  const sideEye = (x: number) => (
    <G key={x}>
      <Ellipse
        cx={x}
        cy="66"
        rx="5"
        ry="3.8"
        fill="white"
        stroke={OUTLINE}
        strokeWidth="1.6"
      />
      <Circle
        cx={x + 2.3}
        cy={face === "sulk" ? 67.2 : 66}
        r="2.5"
        fill={OUTLINE}
      />
      <Path
        d={`M${x - 5.5} 64Q${x} 61.5 ${x + 5.5} 64`}
        stroke={OUTLINE}
        strokeWidth="2.4"
        fill="none"
      />
    </G>
  );
  const arc = (x: number) => `M${x - 5} 66Q${x} 60 ${x + 5} 66`;
  return (
    <G strokeLinecap="round" strokeLinejoin="round">
      <Path d={brows} stroke={HAIR} strokeWidth="3" fill="none" />
      {face === "joy" ? (
        <Path
          d={`${arc(68)}${arc(92)}`}
          stroke={OUTLINE}
          strokeWidth="2.6"
          fill="none"
        />
      ) : face === "side_eye" || face === "sulk" ? (
        [sideEye(68), sideEye(92)]
      ) : (
        <>
          {openEye(68)}
          {face === "wink" ? (
            <Path d={arc(92)} stroke={OUTLINE} strokeWidth="2.6" fill="none" />
          ) : (
            openEye(92)
          )}
        </>
      )}
      <Ellipse
        cx="62"
        cy="78"
        rx={face === "joy" ? 7 : 6}
        ry="3.6"
        fill="#E7766B"
        opacity={face === "joy" ? 0.42 : 0.26}
      />
      <Ellipse
        cx="98"
        cy="78"
        rx={face === "joy" ? 7 : 6}
        ry="3.6"
        fill="#E7766B"
        opacity={face === "joy" ? 0.42 : 0.26}
      />
      {face === "smile" || face === "joy" ? (
        <G>
          <Path
            d={face === "joy" ? "M68 81Q80 98 92 81Z" : "M71 82Q80 92 89 82Z"}
            fill={MOUTH}
            stroke={OUTLINE}
            strokeWidth="2"
          />
          <Rect
            x={face === "joy" ? 71.5 : 74.5}
            y="82"
            width={face === "joy" ? 17 : 11}
            height="3"
            fill="white"
          />
          <Ellipse
            cx="80"
            cy={face === "joy" ? 90 : 87.2}
            rx={face === "joy" ? 5 : 3.6}
            ry="2"
            fill="#E27575"
          />
        </G>
      ) : (
        <Path
          d={
            face === "wink"
              ? "M71 84Q81 90 90 81"
              : face === "sulk"
                ? "M72 88Q80 82 88 88"
                : "M73 86Q80 84 87 86"
          }
          stroke={MOUTH}
          strokeWidth="2.6"
          fill="none"
        />
      )}
    </G>
  );
}

function Props({ skin, tone }: { skin: Skin; tone: string }) {
  const ink = palettes[skin.color ?? "palm"].ink;
  if (skin.persona === "host")
    return (
      <G stroke={OUTLINE} strokeWidth="2.2" strokeLinejoin="round">
        <Rect x="26" y="134" width="108" height="7" rx="3.5" fill={GOLD} />
        <Path d="M40 120h14l-2.5 13h-9zM59 123h12l-2 10h-8z" fill={CLOTH} />
        <Path
          d="M93 111Q79 107 75 95l6 3"
          stroke="#B27B30"
          strokeWidth="4.5"
          strokeLinecap="round"
          fill="none"
        />
        <Path
          d="M109 110q12 1 10 13q-2 6-9 8"
          stroke="#B27B30"
          strokeWidth="4.5"
          strokeLinecap="round"
          fill="none"
        />
        <Path d="M92 103h17q-6 13 4 24q3 7-12 7t-12-7q9-11 3-24z" fill={GOLD} />
        <Path d="M90 103q10-12 20 0z" fill="#F4CD78" />
        <Circle cx="100" cy="93" r="3" fill={GOLD} />
      </G>
    );
  if (skin.persona === "on_way")
    return (
      <G stroke={OUTLINE} strokeWidth="2.2" strokeLinejoin="round">
        <G transform="rotate(10 123 109)">
          <Rect x="112" y="90" width="23" height="36" rx="5" fill={OUTLINE} />
          <Rect
            x="115"
            y="94"
            width="17"
            height="25"
            rx="2"
            fill="#E3EDF6"
            stroke="none"
          />
          <Path
            d="M123.5 99a4 4 0 0 1 4 4c0 3-4 7-4 7s-4-4-4-7a4 4 0 0 1 4-4z"
            fill={ink}
            stroke="none"
          />
        </G>
        <Ellipse cx="119" cy="128" rx="9" ry="7" fill={tone} />
        <Circle
          cx="40"
          cy="124"
          r="7"
          fill="none"
          stroke={GOLD}
          strokeWidth="4"
        />
        <Path
          d="M40 131v13h5M40 138h4"
          fill="none"
          stroke={GOLD}
          strokeWidth="4"
          strokeLinecap="round"
        />
      </G>
    );
  return (
    <G stroke={OUTLINE} strokeWidth="2.2" strokeLinejoin="round">
      <Path d="M86 104l44-6 2 40-44 6z" fill="#FFF5DA" />
      <Path
        d="M94 111l28-4M94 118l28-4M95 125l18-2.5M95 132l28-4"
        fill="none"
        stroke={ink}
        strokeLinecap="round"
      />
      <Ellipse cx="88" cy="136" rx="8.5" ry="7" fill={tone} />
      <Ellipse cx="131" cy="118" rx="7" ry="8.5" fill={tone} />
    </G>
  );
}

/** Layered vectors keep every outfit, expression and accessory editable on iOS and web. */
export function SkinAvatar({
  skin,
  name,
  size = 64,
  decorative = false,
  bare = false,
  mood,
}: {
  skin?: Skin | null;
  name: string;
  size?: number;
  /** Previews inside a labelled button must not be announced as a second person. */
  decorative?: boolean;
  /** Hides the persona's props so an outfit or head-cover preview stays visible. */
  bare?: boolean;
  /** A result reaction from this device; never saved and never inferred for others. */
  mood?: Mood | null;
}) {
  // Several avatars share one web document, so pattern and clip ids must be unique.
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  if (!skin)
    return (
      <View
        accessible={!decorative}
        aria-hidden={decorative || undefined}
        accessibilityRole={decorative ? undefined : "image"}
        accessibilityLabel={decorative ? undefined : `${name} · بدون شخصية`}
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
  const tone = tones[skin.tone ?? "warm"].fill;
  const headwear = skin.headwear ?? "none";
  const covered = headwear === "hijab";
  const draped = headwear === "shemagh" || headwear === "ghutra";
  const cloth = headwear === "shemagh" ? `url(#check${id})` : CLOTH;
  const face: Face =
    mood === "win" ? "joy" : mood === "lose" ? "sulk" : skin.expression;
  const body = {
    thobe: "#FBF7EE",
    abaya: "#2E2A2D",
    casual: palette.ink,
  }[skin.outfit ?? "casual"];
  const label = `${name} · ${personas[skin.persona].name}`;
  return (
    <View
      accessible={!decorative}
      aria-hidden={decorative || undefined}
      accessibilityRole={decorative ? undefined : "image"}
      accessibilityLabel={
        decorative ? undefined : mood ? `${label} · ${moods[mood].name}` : label
      }
      style={{ width: size, height: size }}
    >
      <Svg width={size} height={size} viewBox="0 0 160 160" accessible={false}>
        <Defs>
          <ClipPath id={`clip${id}`}>
            <Circle cx="80" cy="80" r="78" />
          </ClipPath>
          <Pattern
            id={`check${id}`}
            width="6"
            height="6"
            patternUnits="userSpaceOnUse"
          >
            <Rect width="6" height="6" fill={CLOTH} />
            <Path d="M0 0h3v3H0zM3 3h3v3H3z" fill="#C73A3F" />
          </Pattern>
        </Defs>
        <Circle cx="80" cy="80" r="78" fill={palette.light} />
        <Circle
          cx="80"
          cy="80"
          r="70"
          fill="none"
          stroke={palette.ink}
          strokeOpacity=".18"
          strokeWidth="2"
          strokeDasharray="1 7"
          strokeLinecap="round"
        />
        <Path
          d="M17 62l3-7 3 7 7 3-7 3-3 7-3-7-7-3zM132 26l2-5 2 5 5 2-5 2-2 5-2-5-5-2z"
          fill={palette.ink}
          opacity=".45"
        />
        <G
          clipPath={`url(#clip${id})`}
          stroke={OUTLINE}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <Path
            d="M69 92V114C74 120 86 120 91 114V92Z"
            fill={tone}
            stroke="none"
          />
          <Path
            d="M69 96C76 104 84 104 91 96V92H69Z"
            fill={shade(tone, 0.18)}
            stroke="none"
          />
          <Path
            d="M22 162C22 128 44 110 80 110C116 110 138 128 138 162Z"
            fill={body}
          />
          {skin.outfit === "thobe" && (
            <G fill="none">
              <Path d="M68 111C72 119 88 119 92 111" />
              <Path d="M80 117V148" />
              <Circle cx="80" cy="125" r="1.3" fill={OUTLINE} />
              <Circle cx="80" cy="134" r="1.3" fill={OUTLINE} />
              <Path d="M97 129h11v10H97z" />
            </G>
          )}
          {skin.outfit === "abaya" && (
            <G fill="none">
              <Path
                d="M66 112L80 152L94 112"
                stroke="#D8BB7A"
                strokeWidth="3"
              />
              <Path
                d="M55 130l4 4M101 134l4-4"
                stroke="#D8BB7A"
                strokeWidth="2"
              />
            </G>
          )}
          {skin.outfit === "casual" && (
            <G fill="none">
              <Path
                d="M67 112C71 121 89 121 93 112"
                stroke={palette.light}
                strokeWidth="4"
              />
              <Path d="M50 132q6 10 3 30M110 132q-6 10-3 30" opacity=".35" />
            </G>
          )}
          {draped && (
            <Path
              d="M52 52C44 82 40 112 30 142L60 142C58 112 58 86 60 64ZM108 52C116 82 120 112 130 142L100 142C102 112 102 86 100 64Z"
              fill={cloth}
            />
          )}
          {covered && (
            <G>
              <Path
                d="M44 70C44 96 40 114 26 134L134 134C120 114 116 96 116 70Z"
                fill={palette.ink}
              />
              <Path
                d="M50 116C62 126 98 126 110 116"
                fill="none"
                stroke={palette.light}
                strokeOpacity=".45"
              />
            </G>
          )}
        </G>
        <G
          stroke={OUTLINE}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {!covered && !draped && (
            <G fill={tone}>
              <Ellipse cx="52" cy="68" rx="6" ry="8.5" />
              <Ellipse cx="108" cy="68" rx="6" ry="8.5" />
            </G>
          )}
          <Path d={FACE} fill={tone} />
          {!covered && !draped && (
            <Path
              d="M51 66C47 40 62 27 82 28C101 29 112 42 109 66C106 56 101 50 95 46C86 52 70 53 60 47C56 53 53 59 51 66Z"
              fill={HAIR}
            />
          )}
          {headwear === "taqiyah" && (
            <G>
              <Path
                d="M55 46C57 28 103 28 105 46C95 41 65 41 55 46Z"
                fill={CLOTH}
              />
              <Path
                d="M62 40h36"
                fill="none"
                strokeWidth="1.6"
                strokeDasharray="1 4"
              />
            </G>
          )}
          {covered && (
            <G>
              <Path
                d={`${HIJAB_OUTER}${HIJAB_OPENING}`}
                fill={palette.ink}
                fillRule="evenodd"
              />
              <Path
                d="M62 30C70 26 90 26 98 30"
                fill="none"
                stroke={palette.light}
                strokeOpacity=".45"
              />
            </G>
          )}
          {draped && (
            <G>
              <Path
                d="M48 74C44 36 60 20 80 20C100 20 116 36 112 74C109 61 104 52 99 48C91 44 69 44 61 48C56 52 51 61 48 74Z"
                fill={cloth}
              />
              <Path
                d="M61 48C67 42 93 42 99 48"
                fill="none"
                strokeOpacity=".5"
              />
              <Ellipse
                cx="80"
                cy="31"
                rx="25"
                ry="6.5"
                fill="none"
                stroke="#1E1B1A"
                strokeWidth="4"
              />
              <Ellipse
                cx="80"
                cy="37"
                rx="27"
                ry="7"
                fill="none"
                stroke="#1E1B1A"
                strokeWidth="4"
              />
            </G>
          )}
        </G>
        <Features face={face} />
        {skin.accessory === "glasses" && (
          <G
            fill="white"
            fillOpacity=".18"
            stroke={OUTLINE}
            strokeWidth="2.4"
            strokeLinecap="round"
          >
            <Rect x="58" y="57" width="20" height="16" rx="6" />
            <Rect x="82" y="57" width="20" height="16" rx="6" />
            <Path d="M78 63h4M52 62h6M102 62h6" fill="none" />
          </G>
        )}
        {!bare && <Props skin={skin} tone={tone} />}
        {mood === "win" && (
          <G>
            <Rect
              x="24"
              y="30"
              width="6"
              height="3"
              rx="1.5"
              fill="#E7766B"
              transform="rotate(-30 27 31)"
            />
            <Rect
              x="126"
              y="46"
              width="6"
              height="3"
              rx="1.5"
              fill={GOLD}
              transform="rotate(25 129 47)"
            />
            <Circle cx="38" cy="18" r="2.4" fill={palette.ink} />
            <Circle cx="118" cy="20" r="2.4" fill="#E7766B" />
            <Rect
              x="30"
              y="92"
              width="5"
              height="3"
              rx="1.5"
              fill={GOLD}
              transform="rotate(40 32 93)"
            />
          </G>
        )}
      </Svg>
      {mood && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: size * 0.34,
            height: size * 0.34,
            borderRadius: size * 0.17,
            backgroundColor: c.white,
            borderWidth: 1,
            borderColor: c.line,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <T style={{ fontSize: size * 0.19, lineHeight: size * 0.26 }}>
            {moods[mood].emoji}
          </T>
        </View>
      )}
    </View>
  );
}
