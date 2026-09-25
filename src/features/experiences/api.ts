import { request } from "../../shared/api/http";
import type { Experience } from "../../shared/contracts";
import type { components } from "../../shared/api/schema";

export type GoogleRating = components["schemas"]["GoogleRating"];

export const experiencesApi = {
  catalog: () => request<Experience[]>("/experiences"),
  rating: (id: string) =>
    request<GoogleRating>(
      `/v2/experiences/${encodeURIComponent(id)}/google-rating`,
    ),
};
