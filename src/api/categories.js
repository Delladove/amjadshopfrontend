import { api } from "./client";

export const categoriesApi = {
  list: () => api.get("/categories"),
  get: (id) => api.get(`/categories/${id}`),
  create: (name) => api.post("/categories", { name }),
  rename: (id, name) => api.put(`/categories/${id}`, { name }),
  remove: (id) => api.del(`/categories/${id}`),
};
