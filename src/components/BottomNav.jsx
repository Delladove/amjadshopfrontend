import { useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ordersApi } from "../api/orders";

export default function BottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // small badge showing how many bills still have a balance due
  const { data: pending } = useQuery({
    queryKey: ["orders", "pending-count"],
    queryFn: () => ordersApi.list(),
    select: (orders) => orders.filter((o) => o.status !== "cancelled" && o.balance > 0.001).length,
    refetchInterval: 15000,
  });

  const tab = pathname.startsWith("/admin/bills")
    ? "bills"
    : pathname.startsWith("/admin/products")
    ? "products"
    : pathname.startsWith("/admin/accounts")
    ? "accounts"
    : "home";

  const items = [
    { id: "home", ic: "🏠", label: "Home", to: "/admin/home" },
    { id: "bills", ic: "🧾", label: "Bills", to: "/admin/bills", badge: pending },
    { id: "products", ic: "📦", label: "Products", to: "/admin/products" },
    { id: "accounts", ic: "👤", label: "Accounts", to: "/admin/accounts" },
  ];

  return (
    <div className="bottom-nav">
      {items.map((it) => (
        <button key={it.id} className={`bn-item ${tab === it.id ? "on" : ""}`} onClick={() => navigate(it.to)}>
          <span style={{ position: "relative" }}>
            <span className="bn-ic">{it.ic}</span>
            {it.badge ? <span className="bn-badge">{it.badge}</span> : null}
          </span>
          <span className="bn-label">{it.label}</span>
        </button>
      ))}
    </div>
  );
}
