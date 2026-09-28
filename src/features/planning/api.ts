import { request } from "../../shared/api/http";
import type { components } from "../../shared/api/schema";
import type {
  Preferences,
  Settings,
  Group,
  PlanSummary,
  Invite,
  Member,
} from "../../shared/contracts";

export type Session = { groupId: string; token: string };

export const plansApi = {
  create: (preferences: Preferences, settings?: Settings, token?: string) =>
    request<components["schemas"]["GroupCreated"]>("/groups", {
      method: "POST",
      token,
      body: { preferences, settings },
    }),
  plans: (token: string) => request<PlanSummary[]>("/groups", { token }),
  saveToAccount: (s: Session, token: string) =>
    request<Group>(`/groups/${s.groupId}/account`, {
      method: "PUT",
      token,
      body: { owner_token: s.token },
    }),
  rename: (s: Session, title: string) =>
    request<Group>(`/groups/${s.groupId}/title`, {
      method: "PUT",
      token: s.token,
      body: { title },
    }),
  deletePlan: (s: Session) =>
    request<{ ok: boolean }>(`/groups/${s.groupId}`, {
      method: "DELETE",
      token: s.token,
    }),
  group: (s: Session) =>
    request<Group>(`/groups/${s.groupId}`, { token: s.token }),
  settings: (s: Session, body: Settings, expected: Settings) =>
    request<Group>(`/groups/${s.groupId}/settings`, {
      method: "PUT",
      token: s.token,
      body: { ...body, expected },
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
