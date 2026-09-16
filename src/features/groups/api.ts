import { request } from "../../shared/api/http";
import type { Preferences, Settings } from "../../shared/contracts";
import type { components } from "../../shared/api/schema";

export type Circle = components["schemas"]["CircleView"];
export type CircleSummary = components["schemas"]["CircleSummary"];
export type CircleMember = components["schemas"]["CircleMember"];
export type Outing = components["schemas"]["OutingView"];
export type Round = components["schemas"]["RoundView"];
export type PublicCircle = components["schemas"]["PublicCircle"];

function call<T>(path: string, token?: string, method = "GET", body?: unknown) {
  return request<T>(`/v2${path}`, { token, method, body });
}

export const groupsApi = {
  groups: (token: string) => call<CircleSummary[]>("/groups", token),
  group: (token: string, id: string) => call<Circle>(`/groups/${id}`, token),
  create: (token: string, title: string, preferences: Preferences) =>
    call<Circle>("/groups", token, "POST", { title, preferences }),
  claim: (token: string, group_id: string, owner_token: string) =>
    call<Circle>("/legacy/claim", token, "POST", { group_id, owner_token }),
  rename: (token: string, id: string, title: string) =>
    call<Circle>(`/groups/${id}/title`, token, "PUT", { title }),
  profile: (token: string, id: string, preferences: Preferences) =>
    call<Circle>(`/groups/${id}/me/preferences`, token, "PUT", preferences),
  options: (
    token: string,
    id: string,
    body: { pinned?: boolean; fun_opt_in?: boolean },
  ) => call<Circle>(`/groups/${id}/me/options`, token, "PATCH", body),
  invite: (code: string) => call<PublicCircle>(`/invites/${code}`),
  join: (
    token: string,
    code: string,
    preferences: Preferences,
    legacy_token?: string | null,
  ) =>
    call<Circle>(`/invites/${code}/join`, token, "POST", {
      preferences,
      legacy_token: legacy_token ?? null,
    }),
  remove: (token: string, id: string, member: string) =>
    call<Circle>(`/groups/${id}/members/${member}/remove`, token, "POST"),
  restore: (token: string, id: string, member: string) =>
    call<Circle>(`/groups/${id}/members/${member}/restore`, token, "POST"),
  transfer: (token: string, id: string, member_id: string) =>
    call<Circle>(`/groups/${id}/transfer`, token, "POST", { member_id }),
  archiveGroup: (token: string, id: string) =>
    call<Circle>(`/groups/${id}/archive`, token, "POST"),
  createOuting: (
    token: string,
    id: string,
    title: string,
    slots: number,
    coordinator_id?: string,
  ) =>
    call<Outing>(`/groups/${id}/outings`, token, "POST", {
      title,
      slots,
      coordinator_id,
    }),
  outing: (token: string, id: string) => call<Outing>(`/outings/${id}`, token),
  attendance: (
    token: string,
    id: string,
    attendance: "going" | "pending" | "declined",
    budget_override: number | null,
  ) =>
    call<Outing>(`/outings/${id}/me/attendance`, token, "PUT", {
      attendance,
      budget_override,
    }),
  settings: (
    token: string,
    id: string,
    settings: Settings,
    expected: Settings,
  ) =>
    call<Outing>(`/outings/${id}/settings`, token, "PUT", {
      settings,
      expected,
    }),
  coordinator: (token: string, id: string, member_id: string) =>
    call<Outing>(`/outings/${id}/coordinator`, token, "PUT", { member_id }),
  closeOuting: (token: string, id: string) =>
    call<Outing>(`/outings/${id}/close`, token, "POST"),
  round: (
    token: string,
    id: string,
    mode: "vote" | "draw",
    experience_ids: string[],
  ) =>
    call<Outing>(`/outings/${id}/rounds`, token, "POST", {
      mode,
      experience_ids,
    }),
  vote: (token: string, id: string, experience_id: string) =>
    call<Outing>(`/rounds/${id}/my-vote`, token, "PUT", { experience_id }),
  withdraw: (token: string, id: string) =>
    call<Outing>(`/rounds/${id}/my-vote`, token, "DELETE"),
  resolve: (token: string, id: string) =>
    call<Outing>(`/rounds/${id}/resolve`, token, "POST"),
  draw: (token: string, id: string) =>
    call<Outing>(`/rounds/${id}/draw`, token, "POST"),
  cancel: (token: string, id: string) =>
    call<Outing>(`/rounds/${id}/cancel`, token, "POST"),
  fun: (token: string, id: string, target: string) =>
    call<Outing>(`/outings/${id}/fun/${target}`, token, "POST"),
  dismissFun: (token: string, id: string) =>
    call<Outing>(`/outings/${id}/fun/me`, token, "DELETE"),
};
