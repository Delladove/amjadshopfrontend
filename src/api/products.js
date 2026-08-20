import { api } from "./client";

export const productsApi = {
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api.get(`/products${qs ? `?${qs}` : ""}`);
  },
  get: (id) => api.get(`/products/${id}`),
  byBarcode: (code) => api.get(`/products/barcode/${code}`),
  create: (data) => api.post("/products", data),
  update: (id, data) => api.put(`/products/${id}`, data),
  share: (id) => api.post(`/products/${id}/share`),
  remove: (id) => api.del(`/products/${id}`),
  getShared: (limit, cursor) => {
  const params = new URLSearchParams();

  params.set("limit", limit);

  if (cursor) {
    params.set("cursor", cursor);
  }

  return api.get(`/products/shared?${params.toString()}`);
}
};
