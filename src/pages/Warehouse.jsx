import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Topbar from "../components/Topbar.jsx";
import { ordersApi } from "../api/orders";
import { BILL_STATUS_INFO, toast } from "../utils/format";
import { useAuth } from "../context/AuthProvider.jsx"
import { loginApi } from "../api/misc.js";
import { getWarehouseSchema } from "../validations/warehouseSchema.js";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";

const POLL_MS = Number(import.meta.env.VITE_WAREHOUSE_POLL_MS) || 4000;

export default function Warehouse() {
  const { data } = useQuery({
    queryKey: ["warehouse"],
    queryFn: loginApi.getwarehouse,
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
  });
  const warehouseDisabled = data?.warehouseDisabled;


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

  // const statusMut = useMutation({
  //   mutationFn: ({ id, status }) => ordersApi.setStatus(id, status),
  //   onSuccess: () => qc.invalidateQueries({ queryKey: ["orders"] }),
  // });

  const list = orders
    .filter((o) => o.status !== "cancelled" && o.status !== "delivered")
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
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>

            <p className="warehouse-disable-msg">Warehouse is Disabled by Admin</p>
          </div>
        </div>
      </div>
    </>
  }

  // const temp = openOrder? openOrder.items[itemIdx].qty - (openOrder.items[itemIdx].packedQty || 0)  : 0

  if (openOrder) {
    return <WarehouseOrderOpen openOrder={openOrder} itemIdx={itemIdx} setItemIdx={setItemIdx} setOpenOrderId={setOpenOrderId} tab={tab}/>
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
                  <h3>Bill No. {o.billNo}</h3>
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

const WarehouseOrderOpen = ({ openOrder, itemIdx, setItemIdx, setOpenOrderId, tab }) => {
  // console.log("openOrder", openOrder);
  const qc = useQueryClient();
  const [sessionPacked, setSessionPacked] = useState({});
  const idx = Math.min(itemIdx, openOrder.items.length - 1);
  const item = openOrder.items[idx];
  const isLast = idx === openOrder.items.length - 1;
  const valid_qty = item.qty - (item.packedQty || 0);
  // console.log("item.packedQty", item.packedQty, "\n");
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: yupResolver(getWarehouseSchema(valid_qty)),
  });
  useEffect(() => {
    reset({
      packedQty: sessionPacked[item.id]? Math.abs(sessionPacked[item.id]-valid_qty): valid_qty,
    });
  }, [valid_qty, reset]);

  const setPack = useMutation({
    mutationFn: (data) => ordersApi.setPacking(data.orderId, data.packedItems),
    onSuccess: (data) => {
      qc.setQueryData(
        ["orders", "warehouse", tab],
        (oldOrders = []) =>
          oldOrders.map((o) =>
            o.id === data.updatedOrder.id
              ? data.updatedOrder
              : o
          )
      );

      setOpenOrderId(null);
      setItemIdx(0);
    },
    onError: (error) => {
    toast(error.message || "error in packing");
  },
  })


  function onSubmit(data) {
    console.log("in finish", data);
    moveNext(Number(data.packedQty) || 0);



    // statusMut.mutate({ id: openOrder.id, status: "packed" }, {
    //   onSuccess: () => { toast("Order marked as Packed"); setOpenOrderId(null); setItemIdx(0); },
    // });
  }



  function moveNext(currentQty) {
    // console.log("in moveNext", currentQty);
    
    const updatedSession = {
      ...sessionPacked,
      [item.id]: currentQty,
    };
    // console.log("updatedSession", updatedSession)

    if (isLast) {
      console.log("submitPacking(updatedSession);", updatedSession);
      const all_skip = Object.entries(updatedSession).every(
        (item) => item[1] === 0
      );
      if (!all_skip)
        setPack.mutate({ orderId: openOrder.id, packedItems: updatedSession });
      else {
        console.log("all_skip");
        setOpenOrderId(null); setItemIdx(0);
      }
      return;
    }

    setSessionPacked(updatedSession);
    setItemIdx((i) => i + 1);
  }


  return (
    <div id="app">
      <Topbar title="Warehouse" sub={`Bill No. ${openOrder.billNo} · ${openOrder.billType}`} />
      <div className="screen">
        <span className="wh-back" onClick={() => { setOpenOrderId(null); setItemIdx(0); }}>‹ All orders</span>
        <div className="wh-pack">
          <div className="wh-left">
          <div className="wh-pack-progress">Item {idx + 1} of {openOrder.items.length}</div>
          <div className="wh-pack-img" style={{ backgroundImage: item.img ? `url('${item.img}')` : "none" }} />
          <div className="wh-pack-en">{item.titleEn}</div>
          <div className="wh-pack-ur urdu">{item.titleUr}</div>
          {/* <div className="wh-pack-qty-lbl">Quantity required</div> */}
          </div>
          <div className="wh-right">
          <div className="wh-pack-qty">{valid_qty} pcs</div>
          {/* {item.packedQty !== 0 && <div className="wh-pack-qty-already">Already Packed - <span style={{ fontSize: "26px" }}>{item.packedQty}</span> pcs</div>} */}
          <div className="wh-pack-parent">
            {valid_qty > 1 ?
              <div className="wh-field">
                <div>
                  <label>To Pack <span className="btn-urdu">موجودہ مقدار</span></label>
                  {errors.packedQty && <p className="wh-error">{errors.packedQty.message}</p>}
                </div>

                <input className={errors.packedQty ? "wh-btn error-border" : "wh-btn"} type="number" max={valid_qty}  {...register("packedQty")} placeholder="0" />


              </ div> :
              <input
                type="hidden"
                value={valid_qty}
                {...register("packedQty")}
              />

            }
            <div className="wh-pack-actions">
              {idx > 0 && <button className="wh-btn ghost" onClick={() => setItemIdx((i) => i - 1)}>
                <svg width="50px"  version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 120.64 122.88" enableBackground="new 0 0 120.64 122.88" xmlSpace="preserve"><g><path d="M66.6,108.91c1.55,1.63,2.31,3.74,2.28,5.85c-0.03,2.11-0.84,4.2-2.44,5.79l-0.12,0.12c-1.58,1.5-3.6,2.23-5.61,2.2 c-2.01-0.03-4.02-0.82-5.55-2.37C37.5,102.85,20.03,84.9,2.48,67.11c-0.07-0.05-0.13-0.1-0.19-0.16C0.73,65.32-0.03,63.19,0,61.08 c0.03-2.11,0.85-4.21,2.45-5.8l0.27-0.26C20.21,37.47,37.65,19.87,55.17,2.36C56.71,0.82,58.7,0.03,60.71,0 c2.01-0.03,4.03,0.7,5.61,2.21l0.15,0.15c1.57,1.58,2.38,3.66,2.41,5.76c0.03,2.1-0.73,4.22-2.28,5.85L19.38,61.23L66.6,108.91 L66.6,108.91z M118.37,106.91c1.54,1.62,2.29,3.73,2.26,5.83c-0.03,2.11-0.84,4.2-2.44,5.79l-0.12,0.12 c-1.57,1.5-3.6,2.23-5.61,2.21c-2.01-0.03-4.02-0.82-5.55-2.37C89.63,101.2,71.76,84.2,54.24,67.12c-0.07-0.05-0.14-0.11-0.21-0.17 c-1.55-1.63-2.31-3.76-2.28-5.87c0.03-2.11,0.85-4.21,2.45-5.8C71.7,38.33,89.27,21.44,106.8,4.51l0.12-0.13 c1.53-1.54,3.53-2.32,5.54-2.35c2.01-0.03,4.03,0.7,5.61,2.21l0.15,0.15c1.57,1.58,2.38,3.66,2.41,5.76 c0.03,2.1-0.73,4.22-2.28,5.85L71.17,61.23L118.37,106.91L118.37,106.91z"/></g></svg>
                 <p className="btn-urdu">واپس جائیں</p>
                 </button>}
              {isLast ? (
                <button className="wh-btn done" onClick={handleSubmit(onSubmit)} disabled={setPack.isPending}>
                <svg width="60px" fill="#ffffff" xmlns="http://www.w3.org/2000/svg" shapeRendering="geometricPrecision" textRendering="geometricPrecision" imageRendering="optimizeQuality" fillRule="evenodd" clipRule="evenodd" viewBox="0 0 512 472.34"><path fillRule="nonzero" d="M105.32 230.83c24.41 14.96 37.99 37.49 50.26 57.87l2.72 4.51c49.63-67.2 97.21-130.7 155.42-186.63C375.43 47.26 440.08 4.55 503.57.02c4.34-.3 8.11 2.97 8.41 7.3.19 2.64-.96 5.08-2.86 6.64C443.34 69.2 383.04 136.02 326.3 211.32 269.39 286.84 224.24 363.55 172.59 453c-6.7 11.59-13.51 18.57-21.75 19.28-8.54.74-16.5-5.11-24.68-19.28l-.24-.45c-13.45-23.4-24.64-49.93-35.35-75.36-23.76-56.37-45.17-107.15-80.89-98.62-5.92 1.4-11.03-4.15-9.36-9.85 6.21-21.1 20.08-39.02 41.28-46.69 21.57-7.79 44.63-2.87 63.72 8.8z"/></svg>
                  {setPack.isPending ? <span className="btn-spinner"></span> : <span>Packed — <span className="btn-urdu">پیک کردو</span></span>}</button>
              ) : (
                <button className="wh-btn done" onClick={handleSubmit(onSubmit)}> 
                <svg width="60px" fill="#ffffff" xmlns="http://www.w3.org/2000/svg" shapeRendering="geometricPrecision" textRendering="geometricPrecision" imageRendering="optimizeQuality" fillRule="evenodd" clipRule="evenodd" viewBox="0 0 512 472.34"><path fillRule="nonzero" d="M105.32 230.83c24.41 14.96 37.99 37.49 50.26 57.87l2.72 4.51c49.63-67.2 97.21-130.7 155.42-186.63C375.43 47.26 440.08 4.55 503.57.02c4.34-.3 8.11 2.97 8.41 7.3.19 2.64-.96 5.08-2.86 6.64C443.34 69.2 383.04 136.02 326.3 211.32 269.39 286.84 224.24 363.55 172.59 453c-6.7 11.59-13.51 18.57-21.75 19.28-8.54.74-16.5-5.11-24.68-19.28l-.24-.45c-13.45-23.4-24.64-49.93-35.35-75.36-23.76-56.37-45.17-107.15-80.89-98.62-5.92 1.4-11.03-4.15-9.36-9.85 6.21-21.1 20.08-39.02 41.28-46.69 21.57-7.79 44.63-2.87 63.72 8.8z"/></svg>
                <span>Packed — <span className="btn-urdu">پیک کردو</span></span></button>
              )}
            </div>
            {item.qty !== item.packedQty &&
              <button className="wh-btn primary" onClick={() => moveNext(0)} disabled={setPack.isPending} >
                <svg width="45px" fill="#ffffff" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 121.31 122.876" enableBackground="new 0 0 121.31 122.876" xmlSpace="preserve"><g><path fillRule="evenodd" clipRule="evenodd" d="M90.914,5.296c6.927-7.034,18.188-7.065,25.154-0.068 c6.961,6.995,6.991,18.369,0.068,25.397L85.743,61.452l30.425,30.855c6.866,6.978,6.773,18.28-0.208,25.247 c-6.983,6.964-18.21,6.946-25.074-0.031L60.669,86.881L30.395,117.58c-6.927,7.034-18.188,7.065-25.154,0.068 c-6.961-6.995-6.992-18.369-0.068-25.397l30.393-30.827L5.142,30.568c-6.867-6.978-6.773-18.28,0.208-25.247 c6.983-6.963,18.21-6.946,25.074,0.031l30.217,30.643L90.914,5.296L90.914,5.296z"/></g></svg>
                <span>Skip — <span className="btn-urdu">چھور دو</span></span></button>}
          </div>
          {/* <div className="btn-urdu">: پیک شدہ آرڈر<span className="wh-pack-qty-ratio">{sessionPacked[item.id]?sessionPacked[item.id]+item.packedQty:item.packedQty}</span></div>
          <div className="btn-urdu">: مکمل آرڈر <span className="wh-pack-qty-ratio">{item.qty}</span></div> */}
          <div className="wh-history">
               <p className="wh-pack-qty-ratio">{sessionPacked[item.id]?sessionPacked[item.id]+item.packedQty:item.packedQty}</p>
               <p className="wh-pack-qty-ratio">:</p>
               <p className="btn-urdu wh-history-urdu">پیک شدہ آرڈر</p>
               <p className="wh-history-eng">(Packed)</p>
          </div>
          <div className="wh-history">
               <p className="wh-pack-qty-ratio">{item.qty}</p>
               <p className="wh-pack-qty-ratio">:</p>
               <p className="btn-urdu wh-history-urdu">مکمل آرڈر</p>
               <p className="wh-history-eng">(Total)</p>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
