const API_URL = import.meta.env.VITE_API_URL;

async function request(path, options = {}) {
  // console.log("API env working",API_URL);
  const res = await fetch(`${API_URL}/api${path}`, {
    credentials: "include", //The browser will save and attach the cookie
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      message = body.error || body.message || message;
    } catch {
      /* ignore parse errors on non-JSON error bodies */
    }
    // console.log("in error");
    throw new Error(message);
  }
  if (res.status === 204) return null;
  // console.log(res);
  return res.json();
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: "POST", body: JSON.stringify(body) }),
  put: (path, body) => request(path, { method: "PUT", body: JSON.stringify(body) }),
  patch: (path, body) => request(path, { method: "PATCH", body: JSON.stringify(body) }),
  del: (path) => request(path, { method: "DELETE" }),
};

// file uploads use multipart/form-data, not JSON
export async function uploadFile(file) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_URL}/api/uploads`, { method: "POST", body: form });
  if (!res.ok) throw new Error("Upload failed");
  const { url } = await res.json();
  return url.startsWith("http") ? url : `${API_URL}${url}`;
}

export { API_URL };
