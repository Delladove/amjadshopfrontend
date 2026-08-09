import { useNavigate } from "react-router-dom";
import { money, dateLabel, billNo, BILL_STATUS_INFO } from "../utils/format";
import { openReceiptSheet } from "./ReceiptSheet.jsx";

export default function BillCard({ order }) {
  const pieces = order.items.reduce((a, i) => a + (i.qty || 0), 0);
  const st = BILL_STATUS_INFO[order.status] || BILL_STATUS_INFO.new;
  const typeTag = order.billType === "Booking" ? "📅 Booking" : "🚶 Walk-in";

  return (
    <div
      className={`cat-card ${order.status === "cancelled" ? "cancelled-order" : ""}`}
      onClick={() => openReceiptSheet(order.id)}
    >
      <div className="accent" style={{ background: "var(--teal)" }} />
      <h3>{order.customer}</h3>
      <div className="meta">
        {dateLabel(order.createdAt)} · {typeTag} · {order.items.length} item{order.items.length !== 1 ? "s" : ""} · {pieces} pcs · {order.payment}
      </div>
      <div className="price-row" style={{ marginTop: 2 }}>
        <span className="retail">{money(order.total)}</span>
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
        <span className="pill" style={{ background: st.color, color: "#fff" }}>{st.label}</span>
        {order.balance > 0.001 ? (
          <span className="pill pending">Balance {money(order.balance)}</span>
        ) : (
          <span className="pill shared">Paid</span>
        )}
        {(order.customer).endsWith("Whatsapp_user") &&
          <span className="pill whatsapp">Whatsapp</span>
        }
      </div>
      <div className="arrow">›</div>
    </div>
  );
}
