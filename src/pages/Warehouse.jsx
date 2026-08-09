import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Topbar from "../components/Topbar.jsx";
import { ordersApi } from "../api/orders";
import { BILL_STATUS_INFO, toast } from "../utils/format";
import { useAuth } from "../context/AuthProvider.jsx"
import { loginApi } from "../api/misc.js";

const POLL_MS = Number(import.meta.env.VITE_WAREHOUSE_POLL_MS) || 4000;

export default function Warehouse() {
  const { data } = useQuery({
    queryKey: ["warehouse"],
    queryFn: loginApi.getwarehouse,
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
  });
  const warehouseDisabled = data?.warehouseDisabled;

  const qc = useQueryClient();
  const [tab, setTab] = useState("Walkin");
  const [openOrderId, setOpenOrderId] = useState(null);
  const [itemIdx, setItemIdx] = useState(0);

  useEffect(() => {
    document.body.classList.add("warehouse-mode");
    return () => document.body.classList.remove("warehouse-mode");
  }, []);

  // polling: this is what makes a separate warehouse tablet see orders created
  // on the admin device, as long as both point at the same backend server.
  const { data: orders = [] } = useQuery({
    queryKey: ["orders", "warehouse", tab],
    queryFn: () => ordersApi.list({ billType: tab }),
    refetchInterval: POLL_MS,
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }) => ordersApi.setStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["orders"] }),
  });

  const list = orders
    .filter((o) => o.status !== "cancelled" && o.status !== "delivered" && !o.customer.endsWith("Whatsapp_user"))
    .sort((a, b) => {
      const an = a.status === "new" ? 0 : 1, bn = b.status === "new" ? 0 : 1;
      if (an !== bn) return an - bn;
      return b.createdAt - a.createdAt;
    });

  const walkinNew = orders.filter((o) => o.status === "new").length; // per current tab
  const openOrder = openOrderId ? orders.find((o) => o.id === openOrderId) : null;

   if (warehouseDisabled) {
      return <>
        <div id="app">
          <Topbar title="Warehouse" sub="Pack orders as they come in" />
          <div className="screen">
            <div style={{display:"flex", justifyContent: "center" , alignItems: "center"}}>

            <p className="warehouse-disable-msg">Warehouse is Disabled by Admin</p>
            </div>
          </div>
        </div>
      </>
    }


  if (openOrder) {
    const idx = Math.min(itemIdx, openOrder.items.length - 1);
    const item = openOrder.items[idx];
    const isLast = idx === openOrder.items.length - 1;

    function finish() {
      statusMut.mutate({ id: openOrder.id, status: "packed" }, {
        onSuccess: () => { toast("Order marked as Packed"); setOpenOrderId(null); setItemIdx(0); },
      });
    }

   
    return (
      <div id="app">
        <Topbar title="Warehouse" sub={`Bill No. ${openOrder.id.replace("ord", "")} · ${openOrder.billType}`} />
        <div className="screen">
          <span className="wh-back" onClick={() => { setOpenOrderId(null); setItemIdx(0); }}>‹ All orders</span>
          <div className="wh-pack">
            <div className="wh-pack-progress">Item {idx + 1} of {openOrder.items.length}</div>
            <div className="wh-pack-img" style={{ backgroundImage: item.img ? `url('${item.img}')` : "none" }} />
            <div className="wh-pack-en">{item.titleEn}</div>
            <div className="wh-pack-ur urdu">{item.titleUr}</div>
            <div className="wh-pack-qty-lbl">Quantity required</div>
            <div className="wh-pack-qty">{item.qty} pcs</div>
            <div className="wh-pack-actions">
              {idx > 0 && <button className="wh-btn ghost" onClick={() => setItemIdx((i) => i - 1)}>‹ Previous</button>}
              {isLast ? (
                <button className="wh-btn done" onClick={finish}>✓ Mark order as Packed</button>
              ) : (
                <button className="wh-btn primary" onClick={() => setItemIdx((i) => i + 1)}>✓ Packed — Next item</button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="app">
      <Topbar title="Warehouse" sub="Pack orders as they come in" />
      <div className="screen">
        <div className="wh-tabs">
          <button className={`wh-tab ${tab === "Walkin" ? "on" : ""}`} onClick={() => setTab("Walkin")}>🚶 Walk-in</button>
          <button className={`wh-tab ${tab === "Booking" ? "on" : ""}`} onClick={() => setTab("Booking")}>📅 Booking</button>
        </div>

        {list.length ? (
          <div className="wh-grid">
            {list.map((o) => {
              const st = BILL_STATUS_INFO[o.status] || BILL_STATUS_INFO.new;
              const pieces = o.items.reduce((a, i) => a + i.qty, 0);
              return (
                <div key={o.id} className={`wh-card ${o.status === "new" ? "is-new" : ""}`} onClick={() => { setOpenOrderId(o.id); setItemIdx(0); }}>
                  {o.status === "new" && <div className="wh-new-badge">NEW</div>}
                  <h3>Bill No. {o.id.replace("ord", "")}</h3>
                  <div className="wh-meta">{o.customer}<br />{o.items.length} product{o.items.length !== 1 ? "s" : ""} · {pieces} pcs</div>
                  <span className="wh-status" style={{ background: st.color }}>{st.label}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="wh-empty"><div className="big">📦</div><p>No {tab === "Walkin" ? "walk-in" : "booking"} orders waiting to be packed.</p></div>
        )}
      </div>
    </div>
  );
}
