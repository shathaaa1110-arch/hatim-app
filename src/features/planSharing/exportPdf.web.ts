import { Asset } from "expo-asset";
import { IBMPlexSansArabic_400Regular } from "@expo-google-fonts/ibm-plex-sans-arabic/400Regular";
import type { Invitation } from "./api";
import { invitationHtml } from "./pdfHtml";

export async function exportPdf(invitation: Invitation, publicUrl: string) {
  // Open during the user gesture, before any await, so popup blockers allow it.
  const preview = window.open("", "_blank");
  if (!preview) throw new Error("اسمح بفتح نافذة المعاينة لحفظ ملف PDF.");
  preview.opener = null;
  try {
    const response = await fetch(
      Asset.fromModule(IBMPlexSansArabic_400Regular).uri,
    );
    if (!response.ok) throw new Error("تعذّر تحميل خط الملف. حاول مرة ثانية.");
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1]);
      reader.onerror = () => reject(new Error("تعذّر تجهيز الملف."));
      void response
        .blob()
        .then((blob) => reader.readAsDataURL(blob))
        .catch(reject);
    });
    if (preview.closed) return;
    preview.document.open();
    preview.document.write(invitationHtml(invitation, publicUrl, base64));
    preview.document.close();
    const toolbar = preview.document.createElement("div");
    toolbar.className = "actions";
    const print = preview.document.createElement("button");
    print.textContent = "طباعة أو حفظ PDF";
    print.onclick = () => preview.print();
    toolbar.append(print);
    preview.document.body.prepend(toolbar);
    await preview.document.fonts.ready;
  } catch (error) {
    preview.close();
    throw error;
  }
}
