import { Platform } from "react-native";
import type { components } from "./schema";

export type Preferences = components["schemas"]["Preferences"];
export type Experience = components["schemas"]["Experience"];
export type Group = components["schemas"]["GroupView"];
export type Settings = components["schemas"]["Settings"];
export type Member = components["schemas"]["Member"];
export type Decision = components["schemas"]["Decision"];
export type Invite = components["schemas"]["InviteView"];
export type Session = { groupId: string; token: string };

// Web shares the API origin. Native is configured with the tunnel/LAN origin at build time.
export const API_ORIGIN =
  Platform.OS === "web"
    ? ""
    : (process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8000");
export const PUBLIC_ORIGIN =
  Platform.OS === "web" ? window.location.origin : API_ORIGIN;

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function request<T>(
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

export const api = {
  catalog: () => request<Experience[]>("/experiences"),
  create: (preferences: Preferences) =>
    request<components["schemas"]["GroupCreated"]>("/groups", {
      method: "POST",
      body: { preferences },
    }),
  group: (s: Session) =>
    request<Group>(`/groups/${s.groupId}`, { token: s.token }),
  settings: (s: Session, body: Settings) =>
    request<Group>(`/groups/${s.groupId}/settings`, {
      method: "PUT",
      token: s.token,
      body,
    }),
  profile: (s: Session, body: Preferences) =>
    request<Group>(`/groups/${s.groupId}/profile`, {
      method: "PUT",
      token: s.token,
      body,
    }),
  remove: (s: Session, id: string) =>
    request<Group>(`/groups/${s.groupId}/members/${id}`, {
      method: "DELETE",
      token: s.token,
    }),
  invite: (code: string) => request<Invite>(`/invites/${code}`),
  join: (code: string, body: Preferences) =>
    request<components["schemas"]["MemberCreated"]>(
      `/invites/${code}/members`,
      { method: "POST", body },
    ),
  me: (code: string, token: string) =>
    request<Member>(`/invites/${code}/me`, { token }),
  updateMe: (code: string, token: string, body: Preferences) =>
    request<Member>(`/invites/${code}/me`, { method: "PUT", token, body }),
};

export const emptyPreferences: Preferences = {
  name: "",
  role: "مقيم",
  cuisines: [],
  allergies: [],
  vegetarian: false,
  mild: false,
  budget: 200,
};
