import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Topbar from "../components/Topbar.jsx";
import BillCard from "../components/BillCard.jsx";
import { ordersApi } from "../api/orders";
import { openNewBillMenu } from "../components/NewBillMenu.jsx";

const STATUS_CHIPS = [
  { id: "all", label: "All" },
  { id: "new", label: "New" },
  { id: "packed", label: "Packed" },
  { id: "delivered", label: "Delivered" },
  { id: "pending", label: "Balance due" },
  { id: "cancelled", label: "Cancelled" },
];

export default function Bills() {
  const [typeTab, setTypeTab] = useState("Walkin");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const { data: orders = [] } = useQuery({
    queryKey: ["orders", "billType", typeTab, "status", filter === "pending" || filter === "all" ? undefined : filter, "q", search],
    queryFn: () =>
      ordersApi.list({
        billType: typeTab,
        ...(filter !== "all" && filter !== "pending" ? { status: filter } : {}),
        ...(search.trim() ? { q: search.trim() } : {}),
      }),
  });

  const list = filter === "pending" ? orders.filter((o) => o.status !== "cancelled" && o.balance > 0.001) : orders;

  const { data: allOrders = [] } = useQuery({ queryKey: ["orders"], queryFn: () => ordersApi.list() });
  const walkinCount = allOrders.filter((o) => o.billType === "Walkin").length;
  const bookingCount = allOrders.filter((o) => o.billType === "Booking").length;
  const pendingCount = allOrders.filter((o) => o.status !== "cancelled" && o.balance > 0.001).length;

  return (
    <>
      <Topbar title="Bills" sub={`${allOrders.length} total`} />
      <div className="screen">
        <div className="actions"><button className="btn brass" onClick={openNewBillMenu}>＋ New Bill</button></div>

        <div className="bill-type-tabs">
          <button className={`bt-tab ${typeTab === "Walkin" ? "on" : ""}`} onClick={() => setTypeTab("Walkin")}>🚶 Walk-in ({walkinCount})</button>
          <button className={`bt-tab ${typeTab === "Booking" ? "on" : ""}`} onClick={() => setTypeTab("Booking")}>📅 Booking ({bookingCount})</button>
        </div>

        <input
          type="text"
          className="ord-search"
          placeholder="🔍 Search by customer name or phone"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="filter-chips">
          {STATUS_CHIPS.map((c) => (
            <button key={c.id} className={`filter-chip ${filter === c.id ? "on" : ""}`} onClick={() => setFilter(c.id)}>
              {c.label}{c.id === "pending" && pendingCount ? ` (${pendingCount})` : ""}
            </button>
          ))}
        </div>

        {list.length ? (
          list.map((o) => <BillCard key={o.id} order={o} />)
        ) : (
          <div className="empty"><div className="big">🧾</div><p>No bills found.<br />Try a different search or filter, or create a new one.</p></div>
        )}
      </div>
    </>
  );
}
