import { Asset } from "expo-asset";
import { File, Paths } from "expo-file-system";
import { requireNativeModule } from "expo";
import { Platform } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { IBMPlexSansArabic_400Regular } from "@expo-google-fonts/ibm-plex-sans-arabic/400Regular";
import type { Invitation } from "./api";
import { invitationHtml, pdfLinks } from "./pdfHtml";

export async function exportPdf(invitation: Invitation, publicUrl: string) {
  if (!(await Sharing.isAvailableAsync()))
    throw new Error("المشاركة غير متاحة على هذا الجهاز.");
  const font = await Asset.fromModule(
    IBMPlexSansArabic_400Regular,
  ).downloadAsync();
  const base64 = await new File(font.localUri ?? font.uri).base64();
  const printed = await Print.printToFileAsync({
    html: invitationHtml(invitation, publicUrl, base64),
    width: 595.28,
    height: 841.89,
    margins: { top: 42, right: 42, bottom: 42, left: 42 },
  });
  const generated = new File(printed.uri);
  const named = new File(Paths.cache, `hatim-invitation-${Date.now()}.pdf`);
  try {
    await generated.copy(named);
    if (Platform.OS === "ios") {
      try {
        await requireNativeModule<{
          addLinks(
            uri: string,
            links: { text: string; fromEnd: number; url: string }[],
          ): Promise<void>;
        }>("HatimPdfLinks").addLinks(
          named.uri,
          pdfLinks(invitation, publicUrl),
        );
      } catch {
        throw new Error("تعذّر تجهيز روابط الملف. حاول مرة ثانية.");
      }
    }
    await Sharing.shareAsync(named.uri, {
      mimeType: "application/pdf",
      UTI: "com.adobe.pdf",
      dialogTitle: invitation.details.title,
    });
  } finally {
    if (generated.exists) await generated.delete();
    // A receiving app may read the URL after the share sheet finishes.
    // Keep its copy in the OS-managed cache rather than breaking that handoff.
  }
}
