import { useState, useMemo } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { ordersApi } from "../api/orders";
import { productsApi } from "../api/products";
import { money, toast } from "../utils/format";
import { openSheet, closeSheet } from "./Sheet.jsx";
import { openReceiptSheet } from "./ReceiptSheet.jsx";
import { CargoSheet } from "../pages/NewBill.jsx";

export function openEditBillSheet(orderId) {
  openSheet("Edit bill", <EditBillContent orderId={orderId} />);
}

function EditBillContent({ orderId }) {
  const qc = useQueryClient();
  const { data: order, isLoading } = useQuery({ queryKey: ["order", orderId], queryFn: () => ordersApi.get(orderId) });
  const [items, setItems] = useState(null); // [{productId,titleEn,titleUr,qty,unitPrice,custom}]
  const [discount, setDiscount] = useState(0);
  const [search, setSearch] = useState("");
  // ========cargo
  const [cargo, setCargo] = useState(null);
  const [cargoOpen, setCargoOpen] = useState(false);
   function submitCargo(c) {
    setCargo(c);
    setCargoOpen(false);
  }

  // seed local editable state once the order loads
  if (order && items === null) {
    setItems(order.items.map((i) => ({ productId: i.productId, titleEn: i.titleEn, titleUr: i.titleUr, qty: i.qty, unitPrice: i.unitPrice, custom: i.custom })));
    setCargo(order.cargo)
    setDiscount(order.discount || 0);
  }

  const { data: searchResults } = useQuery({
    queryKey: ["products", "search", search],
    queryFn: () => productsApi.list({ q: search }),
    enabled: search.trim().length > 0,
  });

  const subtotal = useMemo(
    () => (items || []).reduce((sum, i) => sum + (i.custom != null && i.custom !== ""  ? Number(i.custom) : i.qty * i.unitPrice), 0),
    [items]
  );
  const total = Math.max(0, subtotal - (Number(discount) || 0));

  const saveMut = useMutation({
    mutationFn: () => ordersApi.update(orderId, { items, discount: Number(discount) || 0, cargo }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["order", orderId] });
      qc.invalidateQueries({ queryKey: ["orders"] });
      toast("Bill updated");
      openReceiptSheet(orderId);
    },
    onError: (e) => toast(e.message),
  });

  if (isLoading || !items) return <div className="filter-note">Loading…</div>;

  function bump(idx, delta) {
    setItems((prev) => {
      const next = [...prev];
      const n = next[idx].qty + delta;
      if (n < 1) { next.splice(idx, 1); return next; }
      next[idx] = { ...next[idx], qty: n };
      return next;
    });
  }
  function remove(idx) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }
  function addProduct(p) {
    setItems((prev) => {
      const existingIdx = prev.findIndex((i) => i.productId === p.id);
      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx] = { ...next[existingIdx], qty: next[existingIdx].qty + 1 };
        return next;
      }
      return [...prev, { productId: p.id, titleEn: p.titleEn, titleUr: p.titleUr, qty: 1, unitPrice: p.unitPrice, custom: null }];
    });
    setSearch("");
  }
  function onSubmit(){
    if(!items.length){
      toast("Add atleast one item Or delete the bill");
      return;
    }
    if(isNaN(Number(discount)) || Number(discount) < 0  ){
      toast("Discount must be a positive number");
      return;
    }
    if(discount > subtotal) {
      toast("Discount cannot exceed subtotal");
      return;
    }      
    saveMut.mutate();
  }

  
  return <>
    <div>
      <div className="filter-note" style={{ marginBottom: 12 }}>
        Adjust quantities for returns, remove items, or add new ones. Existing payments already received are kept as-is.
      </div>
      <div className="cart-card">
        {items.length ? items.map((i, idx) => (
          <div className="cart-row" key={i.productId + idx}>
            <div className="cart-info">
              <div className="cart-name">{i.titleEn}</div>
              <div className="cart-sub">{money(i.unitPrice)} / unit</div>
            </div>
            <div className="stepper">
              <button onClick={() => bump(idx, -1)}>−</button>
              <input type="number" value={i.qty} onChange={(e) => {
                const n = parseInt(e.target.value, 10);
                if (!isNaN(n) && n >= 1) setItems((prev) => prev.map((it, ii) => ii === idx ? { ...it, qty: n } : it));
              }} />
              <button onClick={() => bump(idx, 1)}>＋</button>
            </div>
            <div className="cart-line">{money((i.custom != null) ? i.custom : i.qty * i.unitPrice)}</div>
            <button className="btn ghost sm" onClick={() => remove(idx)}>Remove</button>
          </div>
        )) : <div className="filter-note">No items left in this bill — add some below.</div>}
      </div>

      <div className="field" style={{ marginTop: 10 }}>
        <label>Add a product</label>
        <input type="text" className="ord-search" placeholder="🔍 Search products" value={search} onChange={(e) => setSearch(e.target.value)} />
        {search.trim() && (searchResults || []).filter((p) => !items.some((i) => i.productId === p.id)).slice(0, 8).map((p) => (
          <div className="cat-card" key={p.id} style={{ padding: "10px 14px", marginBottom: 8, cursor: "pointer" }} onClick={() => addProduct(p)}>
            <h3 style={{ fontSize: 13, paddingLeft: 0 }}>{p.titleEn}</h3>
            <div className="meta" style={{ paddingLeft: 0 }}>{money(p.unitPrice)} / unit</div>
          </div>
        ))}
      </div>
      {/* Cargo-------------------- */}
       <button className="cargo-btn" onClick={() => setCargoOpen(true)}>
                  <span className="cargo-ic">🚚</span>
                  <span className="cargo-txt">
                    <span className="cargo-main">{cargo ? "Cargo details added" : "Add cargo details"}</span>
                    <span className="cargo-sub">{cargo ? cargo.addaName || "Tap to edit" : "Adda name, telephone, builty no., kharcha, address"}</span>
                  </span>
                  <span className="cargo-chev">{cargo ? "✓" : "›"}</span>
                </button>
              {/* -----------cargo */}
      <div className="order-total-bar" style={{ borderBottom: "1px solid var(--line)", paddingBottom: 8 }}>
        <span>Subtotal</span><span>{money(subtotal)}</span>
      </div>
      <div className="field">
        <label>Discount</label>
        <input type="number" min="0" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="0" />
      </div>
      <div className="order-total-bar"><span>New total</span><span>{money(total)}</span></div>
      <div className="filter-note" style={{ marginBottom: 12 }}>Already paid: {money(order.paid)}</div>

      <button className="btn teal" disabled={saveMut.isPending} onClick={() => onSubmit()}>
        {saveMut.isPending ? "Saving…" : "Save changes"}
      </button>
    </div>
    {cargoOpen && <CargoSheet initial={cargo} onSave={submitCargo} onClose={() => setCargoOpen(false)} />}
  </>
}
