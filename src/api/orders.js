import { api } from "./client";

export const ordersApi = {
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api.get(`/orders${qs ? `?${qs}` : ""}`);
  },
  get: (id) => api.get(`/orders/${id}`),
  create: (data) => api.post("/orders", data),
  update: (id, data) => api.put(`/orders/${id}`, data), // edit items/discount — returns/corrections
  setStatus: (id, status) => api.post(`/orders/${id}/status`, { status }),
  addPayment: (id, data) => api.post(`/orders/${id}/payments`, data),
  listPayments: (id) => api.get(`/orders/${id}/payments`),
};
