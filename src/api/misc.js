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

export const loginApi = {
  login: (userRole, userPassword) => api.post("/login", { userRole, userPassword }),
  logout: () => api.post("/login/logout"),
  me: () => api.get("/login/me"),
  setwarehouse: (newValue) => api.post("/login/set-warehouse", {newValue}),
  getwarehouse: ()=> api.get("/login/get-warehouse")
}

export const passwordResetApi = {
  resetPassword: (userRole, newPassword) => api.post("/password-reset", { userRole, newPassword }),
  sendCode: (role) => api.post("/password-reset/send-code", {role}),
  verifyCode: (code) => api.post("/password-reset/verify-code", { code }),
};