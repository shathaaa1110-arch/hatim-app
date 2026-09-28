import { downloadPdf } from "./pdfDownload";

export async function exportPdf(code: string) {
  const bytes = await downloadPdf(code);
  const url = URL.createObjectURL(
    new Blob([new Uint8Array(bytes)], { type: "application/pdf" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "hatim-plan.pdf";
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Give Safari time to begin reading the download before releasing its bytes.
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
