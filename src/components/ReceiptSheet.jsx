import { useState, useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { ordersApi } from "../api/orders";
import { settingsApi } from "../api/misc";
import { money, dateLabel, billNo, BILL_STATUS_INFO, PAYMENT_METHODS, toast } from "../utils/format";
import Sheet, { openSheet, closeSheet } from "./Sheet.jsx";
import PaymentForm from "./PaymentForm.jsx";
import { openEditBillSheet } from "./EditBillSheet.jsx";

export function openReceiptSheet(orderId) {
  openSheet("Receipt", <ReceiptContent orderId={orderId} />);
}

function ReceiptContent({ orderId }) {
  const qc = useQueryClient();
  const [wa_btn, setwa_btn] = useState(false);
  const { data: order, isLoading } = useQuery({ queryKey: ["order", orderId], queryFn: () => ordersApi.get(orderId) });
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: settingsApi.get });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["order", orderId] });
    qc.invalidateQueries({ queryKey: ["orders"] });
  };
  useEffect(() => {
    if (order?.customer.endsWith("user")) {
      setwa_btn(true);
    }
  }, [order]);


  const saveMut = useMutation({
    mutationFn: (data) => {console.log(data); ordersApi.update(orderId, { customer:data})},
    onSuccess: () => {
      
      setwa_btn(false);
      qc.invalidateQueries({ queryKey: ["order", orderId] });
      qc.invalidateQueries({ queryKey: ["orders"] });
      toast("Order Confirmed")
      // toast("Bill updated");
      // openReceiptSheet(orderId);
    },
    onError: (e) => toast(e.message),
  });

  const statusMut = useMutation({
    mutationFn: (status) => ordersApi.setStatus(orderId, status),
    onSuccess: refresh,
  });

  const cancelOrder = () => {
    if (!confirm(`Cancel this order for ${order.customer}? It will be kept on record but marked cancelled.`)) return;
    statusMut.mutate("cancelled", { onSuccess: () => { refresh(); toast("Order cancelled"); } });
  };

  if (isLoading || !order) return <div className="filter-note">Loading…</div>;

  const business = settings?.business || { name: "Amjad Magic Center", address: "Shah Alam Market Lahore", phone: "03008838824" };
  const cancelled = order.status === "cancelled";

  return (
    <div>
      <div id="receipt" className="receipt" style={{ opacity: cancelled ? 0.75 : 1 }}>
        {cancelled && <div className="r-cancel-stamp">CANCELLED</div>}
        <div className="r-head">
          <div className="r-studio">{business.name}</div>
          <div className="r-addr">{business.address}</div>
          <div className="r-addr">{business.phone}</div>
        </div>

        <div className="r-section-head">Customer Details</div>
        <div className="r-meta">
          <div><b>Customer:</b> {order.customer}</div>
          {order.phone && <div><b>Phone:</b> +{order.phone}</div>}
          {order.city && <div><b>City:</b> {order.city}</div>}
          <div><b>Date:</b> {new Date(order.createdAt).toLocaleString()}</div>
          <div><b>Bill type:</b> {order.billType}</div>
          <div><b>Payment:</b> {order.payment}</div>
        </div>

        <table className="r-table">
          <thead><tr><th>Item</th><th>Qty</th><th>Unit</th><th>Amount</th></tr></thead>
          <tbody>
            {order.items.map((i) => (
              <tr key={i.id}>
                <td className="r-name">{i.titleEn}<div className="r-ur urdu">{i.titleUr}</div></td>
                <td style={{ textAlign: "right" }}>{i.qty} pcs</td>
                <td style={{ textAlign: "right" }}>{i.custom != null ? <em>custom</em> : money(i.unitPrice)}</td>
                <td style={{ textAlign: "right" }}>{money(i.line)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="r-totals">
          <div><span>Total pieces</span><span>{order.items.reduce((a, i) => a + i.qty, 0)}</span></div>
          <div><span>Subtotal</span><span>{money(order.subtotal)}</span></div>
          {order.discount > 0 && <div><span>Discount</span><span>−{money(order.discount)}</span></div>}
          <div className="r-grand"><span>Total</span><span>{money(order.total)}</span></div>
          <div><span>Paid</span><span>{money(order.paid)}</span></div>
          {order.refundDue > 0.001 ? (
            <div className="r-balance-due"><span>Refund due to customer</span><span>{money(order.refundDue)}</span></div>
          ) : (
            <div className={order.balance > 0.001 ? "r-balance-due" : ""}><span>Balance</span><span>{money(order.balance)}</span></div>
          )}
        </div>

        {order.cargo && (
          <div className="r-cargo">
            <div className="r-cargo-head">Cargo details</div>
            {order.cargo.addaName && <div><b>Adda:</b> {order.cargo.addaName}</div>}
            {order.cargo.contact && <div><b>Telephone:</b> {order.cargo.contact}</div>}
            {order.cargo.builtyNo && <div><b>Builty #:</b> {order.cargo.builtyNo}</div>}
            {order.cargo.addaKharcha && <div><b>Adda kharcha:</b> {money(order.cargo.addaKharcha)}</div>}
            {order.cargo.address && <div><b>Address:</b> {order.cargo.address}</div>}
          </div>
        )}

        {order.payments.length > 0 && (
          <div className="r-payments">
            <div className="r-cargo-head">Payments received</div>
            {order.payments.map((p) => (
              <div className="r-pay-row" key={p.id}>
                <span>
                  {new Date(p.at).toLocaleDateString()} · {p.method}{" "}
                  {p.receiptImg && <a href={p.receiptImg} target="_blank" rel="noreferrer" style={{ color: "var(--brass)", fontWeight: 700, fontSize: 12 }}>📎 Receipt</a>}
                </span>
                <span>{money(p.amt)}</span>
              </div>
            ))}
          </div>
        )}

        <div className="r-foot">Thank you!</div>
        <div className="r-order-id">Bill No. {billNo(order.id)}</div>
      </div>

      {order.notes && (
        <div className="filter-note" style={{ marginTop: 12 }}>📋 Internal notes:
          {((order.notes).split("\n---\n")).map((i, ind) => (
            <p key={ind}>{i}</p>
          ))
          }</div>
      )}

      {!cancelled && (
        <div style={{ marginTop: 16 }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>Bill status</div>
          <div className="status-chips">
            {["new", "packed", "delivered"].map((s) => {
              const info = BILL_STATUS_INFO[s];
              const on = order.status === s;
              return (
                <button
                  key={s}
                  className={`status-chip ${on ? "on" : ""}`}
                  style={on ? { background: info.color, borderColor: info.color } : {}}
                  onClick={() => statusMut.mutate(s)}
                >
                  {info.label}
                </button>
              );
            })}
            {wa_btn && <button className="status-chip-wa" onClick={() =>{ saveMut.mutate( order.customer.replace("user",""))} }>Confirm Whatsapp Order</button>}
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
        <button className="btn ghost" style={{ flex: cancelled ? 1 : "1 1 45%" }} onClick={() => printReceipt()}>🖨 Print / Save PDF</button>
        <button className="btn teal" style={{ flex: cancelled ? 1 : "1 1 45%" }} onClick={closeSheet}>Done</button>
        {!cancelled && (
          <>
            <button className="btn ghost" style={{ flex: "1 1 100%" }} onClick={() => openEditBillSheet(order.id)}>✏️ Edit bill (returns / changes)</button>
            {order.balance > 0.001 && (
              <button className="btn brass" style={{ flex: "1 1 100%" }} onClick={() => openPaymentSheet(order.id, order.balance)}>＋ Add payment</button>
            )}
            <button className="btn ghost" style={{ flex: "1 1 100%", color: "var(--danger)", borderColor: "var(--danger)" }} onClick={cancelOrder}>Cancel this order</button>
          </>
        )}
      </div>
    </div>
  );
}

function openPaymentSheet(orderId, balance) {
  openSheet("Add payment", <PaymentForm orderId={orderId} balance={balance} onDone={() => openReceiptSheet(orderId)} />);
}

function printReceipt() {
  const node = document.getElementById("receipt");
  if (!node) return;
  const w = window.open("", "_blank");
  if (!w) { toast("Allow pop-ups to print"); return; }
  w.document.write(`<html><head><title>Receipt</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
      body{font-family:"Segoe UI",system-ui,sans-serif;color:#1c1a17;padding:18px;max-width:420px;margin:0 auto}
      .receipt{font-size:15px;position:relative}
      .r-head{text-align:center;border-bottom:3px solid #1c1a17;padding-bottom:10px;margin-bottom:14px}
      .r-studio{font-size:26px;font-weight:900}
      .r-addr{font-size:15px;font-weight:700;margin-top:3px}
      .r-section-head{font-weight:900;font-size:14px;text-transform:uppercase;margin-bottom:8px}
      .r-order-id{font-size:24px;font-weight:900;text-align:center;margin-top:18px;padding-top:14px;border-top:3px solid #1c1a17}
      .r-meta{font-size:15px;font-weight:600;margin-bottom:14px;line-height:1.9}
      .r-table{width:100%;border-collapse:collapse;font-size:14.5px}
      .r-table th{text-align:right;border-bottom:2px solid #1c1a17;padding:8px 4px;font-size:12px;font-weight:800;text-transform:uppercase}
      .r-table th:first-child{text-align:left}
      .r-table td{padding:9px 4px;border-bottom:1px solid #e5d9d0;text-align:right;vertical-align:top;font-weight:700}
      .r-name{text-align:left;font-weight:800;font-size:15px}
      .r-ur{font-weight:500;color:#4a443c;font-size:13px;direction:rtl}
      .r-totals{margin-top:14px;font-size:15px;font-weight:700}
      .r-totals>div{display:flex;justify-content:space-between;padding:5px 0}
      .r-grand{font-weight:900;font-size:20px;border-top:3px solid #1c1a17;margin-top:6px;padding-top:8px}
      .r-balance-due{font-weight:900;color:#c81f2e;font-size:17px}
      .r-cargo,.r-payments{margin-top:16px;font-size:14px;font-weight:600;border-top:2px dashed #ccc;padding-top:12px}
      .r-cargo-head{font-weight:900;font-size:13px;text-transform:uppercase;margin-bottom:6px}
      .r-pay-row{display:flex;justify-content:space-between;padding:3px 0}
      .r-foot{text-align:center;margin-top:16px;font-size:14px;font-weight:700;color:#888}
      .r-cancel-stamp{position:absolute;top:40%;left:50%;transform:translate(-50%,-50%) rotate(-18deg);
        font-size:42px;font-weight:900;color:rgba(200,31,46,.35);border:5px solid rgba(200,31,46,.35);
        border-radius:10px;padding:4px 18px}
    </style></head><body>${node.outerHTML}</body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
}
