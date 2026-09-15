import { ActivityIndicator, Platform, View } from "react-native";
import { useState } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import { IBMPlexSansArabic_400Regular } from "@expo-google-fonts/ibm-plex-sans-arabic/400Regular";
import { IBMPlexSansArabic_500Medium } from "@expo-google-fonts/ibm-plex-sans-arabic/500Medium";
import { IBMPlexSansArabic_600SemiBold } from "@expo-google-fonts/ibm-plex-sans-arabic/600SemiBold";
import { IBMPlexSansArabic_700Bold } from "@expo-google-fonts/ibm-plex-sans-arabic/700Bold";
import { SocialApp } from "./src/social/SocialApp";
import { Organizer } from "./src/screens/Organizer";
import { InviteScreen } from "./src/screens/InviteScreen";
import { colors } from "./src/theme";
import { WebDocument } from "./src/components/WebDocument";
import { AccountProvider } from "./src/account/AccountProvider";
import { AccountScreen } from "./src/account/AccountScreen";

export default function App() {
  const [screen, setScreen] = useState<"organizer" | "groups" | "account">(
    "organizer",
  );
  const [planStart, setPlanStart] = useState<"discover" | "plan" | "new">(
    "discover",
  );
  const [loaded, fontError] = useFonts({
    IBMPlexSansArabic_400Regular,
    IBMPlexSansArabic_500Medium,
    IBMPlexSansArabic_600SemiBold,
    IBMPlexSansArabic_700Bold,
  });
  const web = Platform.OS === "web";
  const organizerPreview =
    web &&
    ["organizer", "legacy"].includes(
      new URLSearchParams(window.location.search).get("preview") ?? "",
    );
  const inviteCode = web
    ? (window.location.pathname.match(/^\/join\/([A-Za-z0-9_-]+)\/?$/)?.[1] ??
      null)
    : null;
  return (
    <SafeAreaProvider>
      <AccountProvider>
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <WebDocument />
          <StatusBar style="dark" />
          {!loaded && !fontError ? (
            <ActivityIndicator style={{ flex: 1 }} color={colors.green} />
          ) : web && !organizerPreview && !inviteCode ? (
            <InviteScreen code={null} />
          ) : inviteCode ? (
            <SocialApp inviteCode={inviteCode} />
          ) : screen === "groups" ? (
            <SocialApp onExit={() => setScreen("organizer")} />
          ) : screen === "account" ? (
            <AccountScreen
              back={() => setScreen("organizer")}
              openGroups={() => setScreen("groups")}
              openPlan={(fresh) => {
                setPlanStart(fresh ? "new" : "plan");
                setScreen("organizer");
              }}
            />
          ) : (
            <Organizer
              start={planStart}
              openAccount={() => {
                setPlanStart("discover");
                setScreen("account");
              }}
              openGroups={() => {
                setPlanStart("discover");
                setScreen("groups");
              }}
            />
          )}
        </View>
      </AccountProvider>
    </SafeAreaProvider>
  );
}
