import { request } from "../../shared/api/http";
import type { components } from "../../shared/api/schema";

export type Invitation = components["schemas"]["PublicInvitation"];
export type InvitationDetails = components["schemas"]["InvitationDetails"];
export type InvitationEditor = components["schemas"]["InvitationEditor"];
export type SharedPlan = components["schemas"]["SharedPlan"];
export type SharedExperience = components["schemas"]["SharedExperience"];
export type SharingSource = {
  kind: "plan" | "outing";
  id: string;
  token: string;
};
const path = (source: SharingSource) =>
  `/plan-invitations/${source.kind}/${encodeURIComponent(source.id)}`;

export const sharingApi = {
  editor: (source: SharingSource) =>
    request<InvitationEditor>(path(source), { token: source.token }),
  save: (
    source: SharingSource,
    details: InvitationDetails,
    expected_revision: number | null,
  ) =>
    request<InvitationEditor>(path(source), {
      method: "PUT",
      token: source.token,
      body: { details, expected_revision },
    }),
  revoke: (source: SharingSource, expected_revision: number) =>
    request<{ ok: boolean }>(path(source), {
      method: "DELETE",
      token: source.token,
      body: { expected_revision },
    }),
  public: (code: string) =>
    request<Invitation>(`/shared-plans/${encodeURIComponent(code)}`),
};
