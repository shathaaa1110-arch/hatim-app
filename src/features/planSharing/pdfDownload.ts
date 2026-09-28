import { fetch } from "expo/fetch";
import { API_ORIGIN, ApiError } from "../../shared/api/http";

// Both platforms receive the exact server bytes. No local plan or HTML is submitted.
export async function downloadPdf(code: string): Promise<Uint8Array> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(
      `${API_ORIGIN}/api/shared-plans/${encodeURIComponent(code)}/pdf`,
      { headers: { Accept: "application/pdf" }, signal: controller.signal },
    );
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new ApiError(
        typeof data.detail === "string"
          ? data.detail
          : "تعذّر تجهيز الملف. حاول مرة ثانية.",
        response.status,
      );
    }
    if (!response.headers.get("content-type")?.startsWith("application/pdf"))
      throw new Error("الملف غير مكتمل. حاول تنزيله مرة ثانية.");
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (String.fromCharCode(...bytes.slice(0, 5)) !== "%PDF-")
      throw new Error("الملف غير مكتمل. حاول تنزيله مرة ثانية.");
    return bytes;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new Error("تعذّر تنزيل الملف. تأكد من الاتصال وحاول مرة ثانية.");
  } finally {
    clearTimeout(timeout);
  }
}
