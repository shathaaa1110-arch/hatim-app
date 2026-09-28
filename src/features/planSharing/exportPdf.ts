import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { downloadPdf } from "./pdfDownload";

export async function exportPdf(code: string) {
  if (!(await Sharing.isAvailableAsync()))
    throw new Error("المشاركة غير متاحة على هذا الجهاز.");
  const bytes = await downloadPdf(code);
  const file = new File(Paths.cache, `hatim-plan-${Date.now()}.pdf`);
  try {
    file.write(bytes);
    await Sharing.shareAsync(file.uri, {
      mimeType: "application/pdf",
      UTI: "com.adobe.pdf",
      dialogTitle: "مشاركة خطة حاتم",
    });
    // A receiver may read after the sheet closes; the OS owns this cached copy.
  } catch (error) {
    if (file.exists) file.delete();
    throw error;
  }
}
