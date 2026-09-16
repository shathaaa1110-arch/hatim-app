import { request } from "../../shared/api/http";
import type { Experience } from "../../shared/contracts";

export const experiencesApi = {
  catalog: () => request<Experience[]>("/experiences"),
};
