import { api } from "./client";

export const barcodesApi = {
  list: (q) => api.get(`/barcodes${q ? `?q=${encodeURIComponent(q)}` : ""}`),
};

export const settingsApi = {
  get: () => api.get("/settings"),
  update: (data) => api.put("/settings", data),
};

export const dashboardApi = {
  get: () => api.get("/dashboard"),
};

export const visitsApi = {
  log: (catId, at, dwellMs) => api.post("/visits", { catId, at, dwellMs }),
};
