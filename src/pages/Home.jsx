import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Topbar from "../components/Topbar.jsx";
import BillCard from "../components/BillCard.jsx";
import { ordersApi } from "../api/orders";
import { openNewBillMenu } from "../components/NewBillMenu.jsx";
import { openQuickNewProductMenu } from "../components/QuickNewProduct.jsx";

export default function Home() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("Walkin");

  const { data: orders = [] } = useQuery({ queryKey: ["orders", "billType", tab], queryFn: () => ordersApi.list({ billType: tab }) });
  const { data: allOrders = [] } = useQuery({ queryKey: ["orders"], queryFn: () => ordersApi.list() });

  const recent = orders.slice(0, 5);
  const walkinCount = allOrders.filter((o) => o.billType === "Walkin").length;
  const bookingCount = allOrders.filter((o) => o.billType === "Booking").length;

  return (
    <>
      <Topbar title="Amjad Magic Center" sub="Manage your product catalog" />
      <div className="screen">
        <div className="quick-actions">
          <div className="qa-btn primary" onClick={openNewBillMenu}>
            <span className="qa-ic">🧾</span>
            <span className="qa-label">＋ New Bill</span>
            <span className="qa-sub">Start a customer order</span>
          </div>
          <div className="qa-btn" onClick={openQuickNewProductMenu}>
            <span className="qa-ic">📷</span>
            <span className="qa-label">＋ New Product</span>
            <span className="qa-sub">Upload &amp; add to catalog</span>
          </div>
        </div>

        <div className="sec-head"><div className="section-title">Recent bills</div></div>
        <div className="bill-type-tabs">
          <button className={`bt-tab ${tab === "Walkin" ? "on" : ""}`} onClick={() => setTab("Walkin")}>🚶 Walk-in ({walkinCount})</button>
          <button className={`bt-tab ${tab === "Booking" ? "on" : ""}`} onClick={() => setTab("Booking")}>📅 Booking ({bookingCount})</button>
        </div>

        {recent.length ? (
          recent.map((o) => <BillCard key={o.id} order={o} />)
        ) : (
          <div className="empty"><div className="big">🧾</div><p>No {tab === "Walkin" ? "walk-in" : "booking"} bills yet.<br />Tap "＋ New Bill" to create your first one.</p></div>
        )}
        {orders.length > recent.length && (
          <div className="link-row" onClick={() => navigate("/admin/bills")}>View all {orders.length} bills ›</div>
        )}
      </div>
    </>
  );
}
