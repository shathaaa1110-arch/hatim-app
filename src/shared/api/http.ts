import { Platform } from "react-native";
import { isDevice } from "expo-device";

const configuredOrigin =
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8000";

// The iOS simulator reaches the Mac directly, even when the public tunnel stops.
export const API_ORIGIN =
  Platform.OS === "web"
    ? ""
    : Platform.OS === "ios" && !isDevice
      ? "http://localhost:8000"
      : configuredOrigin;
// Invitations still need the public address, including when copied in the simulator.
export const PUBLIC_ORIGIN =
  Platform.OS === "web" ? window.location.origin : configuredOrigin;

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export async function request<T>(
  path: string,
  options: {
    method?: string;
    token?: string;
    body?: unknown;
    signal?: AbortSignal;
  } = {},
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  const cancel = () => controller.abort();
  options.signal?.addEventListener("abort", cancel);
  try {
    const response = await fetch(`${API_ORIGIN}/api${path}`, {
      method: options.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
    });
    if (!response.ok) {
      if (response.status >= 500) {
        throw new ApiError(
          "حاتم غير متاح مؤقتًا. حاول مرة ثانية بعد شوي.",
          response.status,
        );
      }
      const data = await response.json().catch(() => ({}));
      throw new ApiError(
        typeof data.detail === "string"
          ? data.detail
          : "راجع البيانات وحاول مرة ثانية.",
        response.status,
      );
    }
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      "ما قدرنا نتصل بحاتم. تأكد من الاتصال وحاول مرة ثانية.",
      0,
    );
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener("abort", cancel);
  }
}
