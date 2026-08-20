export function money(n) {
  const v = Math.round(Number(n) || 0);
  return "Rs " + v.toLocaleString("en-PK");
}

export function dateLabel(ts) {
  const d = new Date(ts);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString([], { day: "numeric", month: "short" });
}

export function billNo(id) {
  return String(id || "").replace("ord", "");
}

export const BILL_STATUS_INFO = {
  new: { label: "New", color: "var(--muted)" },
  packed: { label: "Packed", color: "#b8860b" },
  packing: {label: "Packing", color: "var(--whatsapp)"},
  delivered: { label: "Delivered", color: "var(--teal)" },
  cancelled: { label: "Cancelled", color: "var(--danger)" },
};

export const PAYMENT_METHODS = ["Cash", "Bank transfer", "Easypaisa / JazzCash"];

/* simple toast, no library needed */
let toastTimer = null;
export function toast(msg) {
  let el = document.getElementById("toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    el.className = "toast";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2200);
}
