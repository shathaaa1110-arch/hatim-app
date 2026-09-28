import { request } from "../../shared/api/http";
import type { components } from "../../shared/api/schema";

export type Account = components["schemas"]["Account"];
export type AccountSession = components["schemas"]["AccountSession"];

function call<T>(path: string, token?: string, method = "GET", body?: unknown) {
  return request<T>(`/v2${path}`, { token, method, body });
}

export const accountsApi = {
  register: (handle: string, password: string, name: string) =>
    call<AccountSession>("/auth/register", undefined, "POST", {
      handle,
      password,
      name,
    }),
  login: (handle: string, password: string) =>
    call<AccountSession>("/auth/login", undefined, "POST", {
      handle,
      password,
    }),
  me: (token: string) => call<Account>("/auth/me", token),
  updateMe: (token: string, name: string) =>
    call<Account>("/auth/me", token, "PUT", { name }),
  logout: (token: string) => call("/auth/logout", token, "POST"),
};
