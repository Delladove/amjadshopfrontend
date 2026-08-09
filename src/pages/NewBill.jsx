import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Topbar from "../components/Topbar.jsx";
import { productsApi } from "../api/products";
import { categoriesApi } from "../api/categories";
import { ordersApi } from "../api/orders";
import { money, PAYMENT_METHODS, toast } from "../utils/format";
import { uploadFile } from "../api/client";
import BarcodeScanner from "../components/BarcodeScanner.jsx";

// ================
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { orderSchema } from "../validations/orderSchema.js"
import { cargoSchema } from "../validations/cargoSchema.js"

export default function NewBill() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const billType = params.get("type") || "Walkin";
  const qc = useQueryClient();

  const { data: products = [] } = useQuery({ queryKey: ["products"], queryFn: () => productsApi.list() });
  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: categoriesApi.list });

  const [search, setSearch] = useState("");
  const [cart, setCart] = useState({}); // { [productId]: qty }
  const [customPrices, setCustomPrices] = useState({}); // { [productId]: number }
  const [scannerOpen, setScannerOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [cargoOpen, setCargoOpen] = useState(false);
  const [expanded, setExpanded] = useState(null);

  // checkout fields
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(orderSchema),
    defaultValues: {
      discount: 0,
      paidNow: 0,
    },
  });
  const discount = watch("discount");
  const paidNow = watch("paidNow");


  const [cargo, setCargo] = useState(null);
  const [paidTouched, setPaidTouched] = useState(false);
  const [receiptImg, setReceiptImg] = useState(null);

  const complete = products.filter((p) => p.titleEn && p.titleUr && p.unitPrice > 0);
  const matches = search.trim()
    ? complete.filter((p) => (p.titleEn + " " + p.titleUr).toLowerCase().includes(search.trim().toLowerCase()))
    : complete;
  const byCat = categories
    .map((c) => ({ cat: c, prods: matches.filter((p) => p.catId === c.id) }))
    .filter((g) => g.prods.length);

  const cartCount = Object.keys(cart).length;
  const totalPcs = Object.values(cart).reduce((a, b) => a + b, 0);

  function lineTotal(p) {
    const custom = customPrices[p.id];
    if (custom != null && custom !== "") return Number(custom);
    return (cart[p.id] || 0) * p.unitPrice;
  }
  const subtotal = Object.keys(cart).reduce((sum, id) => {
    const p = products.find((x) => x.id === id);
    return p ? sum + lineTotal(p) : sum;
  }, 0);
  const total = Math.max(0, subtotal - (Number(discount) || 0));
  const effectivePaidNow = paidTouched ? Number(paidNow) || 0 : total;
  const previewBalance = Math.max(0, total - effectivePaidNow);
  useEffect(() => {
    if (!paidTouched) {
      setValue("paidNow", total);
    }
  }, [total, paidTouched, setValue]);

  function toggleProduct(id) {
    // console.log("toggle Product", id, cart[id]);
    setCart((prev) => (prev[id] ? prev : { ...prev, [id]: 1 }));
    setExpanded(id);
  }
  function bump(id, delta) {
    setCart((prev) => {
      const n = (prev[id] || 0) + delta;
      console.log("all prev", prev);
      const next = { ...prev };
      console.log("all", next);
      if (n < 1) {
        delete next[id];
        if (expanded == id)
          setExpanded(null);
        if (cartCount == 1)
          setCheckoutOpen(false);
      }
      else next[id] = n;
      return next;
    });
  }

  function handleScanned(code) {
    const p = products.find((x) => x.barcode === code);
    if (p) {
      setCart((prev) => ({ ...prev, [p.id]: (prev[p.id] || 0) + 1 }));
      toast(`✓ Added: ${p.titleEn}`);
    } else {
      toast(`No product with code ${code}`);
    }
  }

  const createMut = useMutation({
    mutationFn: (data) => {
      // { console.log(`Data created with`, {
      //           billType,
      //     ...data,  
      //     cargo,
      //     discount: Number(discount) || 0,
      //     paidNow: paidTouched ? Number(paidNow) || 0 : total,
      //     paymentReceiptImg: receiptImg,
      //     items: Object.entries(cart).map(([id, qty]) => {
      //       const p = products.find((x) => x.id === id);
      //       return {
      //         productId: id,
      //         titleEn: p.titleEn,
      //         titleUr: p.titleUr,
      //         qty,
      //         unitPrice: p.unitPrice,
      //         custom: customPrices[id] != null && customPrices[id] !== "" ? Number(customPrices[id]) : null,
      //       };
      //     }),
      // })
      ordersApi.create({
        billType,
        ...data,
        cargo,
        discount: Number(data.discount),
        paidNow: paidTouched ? Number(data.paidNow) : total,
        paymentReceiptImg: receiptImg,
        items: Object.entries(cart).map(([id, qty]) => {
          const p = products.find((x) => x.id === id);
          return {
            productId: id,
            titleEn: p.titleEn,
            titleUr: p.titleUr,
            qty,
            unitPrice: p.unitPrice,
            custom: customPrices[id] != null && customPrices[id] !== "" ? Number(customPrices[id]) : null,
          };
        }),
      })
    },
    onSuccess: (order) => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      toast("Order saved");
      navigate("/admin/bills");
      // the receipt can be reopened from the Bills list — see BillCard
    },
    onError: (e) => toast(e.message),
  });

  async function handleReceiptFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const url = await uploadFile(file);
      setReceiptImg(url);
    } catch {
      toast("Upload failed");
    }
  }

  function submitCargo(c) {
    setCargo(c);
    setCargoOpen(false);
  }
  const submitOrder = (data) => {
    console.log("Submitting order with data:", data);

    if (data.discount > subtotal) {
      setError("discount", {
        type: "manual",
        message: "Discount cannot exceed subtotal",
      });
      toast("Discount cannot exceed subtotal");
      return;
    }

    if ((Number(data.paidNow) || 0) > total) {
      setError("paidNow", {
        type: "manual",
        message: "Amount received cannot exceed total",
      });
      toast("Amount received cannot exceed total");
      return;
    }
    createMut.mutate(data);
  };
  const payment = watch("payment");
  const showReceiptAttach = payment && payment !== "Cash";

  return (
    <>
      <Topbar title="New order" sub={`${billType} bill · Select products`} />
      <div className="screen" style={{ paddingBottom: 110 }}>
        <span className="backlink" onClick={() => navigate("/admin/bills")}>‹ Bills</span>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <input
            type="text"
            className="ord-search"
            style={{ flex: 1, minWidth: 0, marginBottom: 0 }}
            placeholder="🔍 Search products (optional)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="btn brass" style={{ flex: "0 0 auto", padding: "10px" }} onClick={() => setScannerOpen(true)}>📷 Scan</button>
        </div>
        <div className="eyebrow" style={{ marginTop: 6 }}>Tap a product to add it, or scan its barcode · enter quantity in pieces</div>

        {byCat.map((g) => (
          <div key={g.cat.id}>
            <div className="ord-cat-label" style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", color: "var(--muted)", margin: "14px 0 8px" }}>{g.cat.name}</div>
            <div className="grid">
              {g.prods.map((p) => (
                <ProductPickTile
                  key={p.id}
                  product={p}
                  ext={expanded == p.id}
                  qty={cart[p.id] || 0}
                  onTap={() => toggleProduct(p.id)}
                  onBump={(d) => bump(p.id, d)}
                  setCart={setCart}
                  setExpanded={setExpanded}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* fixed bottom summary bar */}
      <div className={`ord-summary ${!cartCount ? "empty" : ""}`} onClick={() => cartCount && setCheckoutOpen(true)}>
        <span className="os-ic">{cartCount ? "🧾" : "🛒"}</span>
        <div className="os-main">
          <div className="os-count">{cartCount ? `${cartCount} product${cartCount !== 1 ? "s" : ""} · ${totalPcs} pcs` : "No products added yet"}</div>
          <div className="os-sub">{cartCount ? "Tap to review & complete order" : "Tap a picture above, then set the quantity"}</div>
        </div>
        {cartCount > 0 && <><span className="os-total">{money(total)}</span><span className="os-arrow">›</span></>}
      </div>

      {scannerOpen && <BarcodeScanner onScanned={handleScanned} onClose={() => setScannerOpen(false)} />}

      {checkoutOpen && (
        <div className="sheet-bg open" onClick={() => setCheckoutOpen(false)}>
          <div className="sheet open" onClick={(e) => e.stopPropagation()} style={{ maxHeight: "92vh" }}>
            <div className="sheet-head"><h2>Review &amp; complete</h2><button className="x" onClick={() => setCheckoutOpen(false)}>×</button></div>
            <div className="sheet-body">
              <div className="co-section">
                <div className="co-section-title">🛒 Order items</div>
                <div className="cart-card">
                  {Object.entries(cart).map(([id, qty]) => {
                    const p = products.find((x) => x.id === id);
                    if (!p) return null;
                    return (
                      <div className="cart-row" key={id}>
                        <div className="cart-thumb" style={{ backgroundImage: p.img ? `url('${p.img}')` : "none" }} />
                        <div className="cart-info">
                          <div className="cart-name">{p.titleEn}</div>
                          <div className="cart-sub">{money(p.unitPrice)} / unit · {qty} pcs</div>
                        </div>
                        <div className="stepper">
                          <button onClick={() => bump(id, -1)}>−</button>
                          <input type="number" value={qty} disabled />
                          <button onClick={() => bump(id, 1)}>＋</button>
                        </div>
                        <div className="cart-line">{money(lineTotal(p))}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="co-section">
                <div className="co-section-title">💰 Bill summary</div>
                <div className="order-total-bar" style={{ borderBottom: "1px solid var(--line)", paddingBottom: 8 }}>
                  <span>Subtotal</span><span>{money(subtotal)}</span>
                </div>
                <div className="field" style={{ marginTop: 10 }}>
                  <label>Discount <span className="hint">(optional · flat amount off the bill)</span></label>
                  <input type="number" min="0" {...register("discount")} placeholder="0" />
                  {errors.discount && <p className="error">{errors.discount.message}</p>}
                </div>
                <div className="order-total-bar"><span>Total</span><span>{money(total)}</span></div>
                <div className="field" style={{ marginTop: 2 }}>
                  <label>Amount received now <span className="hint">(editable — leave as full total, or enter a partial payment)</span></label>
                  <input type="number"
                    {...register("paidNow", {
                      onChange: () => setPaidTouched(true),
                    })}
                    placeholder="50" />
                  {errors.paidNow && <p className="error">{errors.paidNow.message}</p>}
                </div>
                <div className={`order-total-bar balance-row ${previewBalance > 0.001 ? "due" : "clear"}`}>
                  <span>Balance</span><span>{money(previewBalance)}</span>
                </div>
              </div>

              <div className="co-section">
                <div className="co-section-title">👤 Customer details</div>
                <div className="field">
                  <label>Customer name</label>
                  <input type="text" {...register("customer")} placeholder="e.g. Ahmed Traders" />
                  {errors.customer && <p className="error">{errors.customer.message}</p>}
                </div>
                <div className="field">
                  <div className="two">
                    <div>
                      <label>Phone </label>
                      <input type="tel" {...register("phone")} placeholder="03001233907" />
                    </div>
                    <div>
                      <label>City </label>
                      <input type="text" {...register("city")} placeholder="e.g. Lahore" />
                    </div>
                  </div>
                  {errors.phone && <p className="error">{errors.phone.message}</p>}
                  {errors.city && <p className="error">{errors.city.message}</p>}
                </div>
                <button className="cargo-btn" onClick={() => setCargoOpen(true)}>
                  <span className="cargo-ic">🚚</span>
                  <span className="cargo-txt">
                    <span className="cargo-main">{cargo ? "Cargo details added" : "Add cargo details"}</span>
                    <span className="cargo-sub">{cargo ? cargo.addaName || "Tap to edit" : "Adda name, telephone, builty no., kharcha, address"}</span>
                  </span>
                  <span className="cargo-chev">{cargo ? "✓" : "›"}</span>
                </button>
              </div>

              <div className="co-section">
                <div className="co-section-title">💳 Payment</div>
                <div className="field">
                  <label>Payment method</label>
                  <div className="pay-opts">
                    {PAYMENT_METHODS.map((m) => (
                      <label className="pay-opt" key={m}>
                        <input type="radio" name="pay" value={m} {...register("payment")} />
                        <span>{m}</span>
                      </label>
                    ))}
                  </div>
                  {errors.payment && <p className="error">{errors.payment.message}</p>}
                </div>
                {showReceiptAttach && (
                  <div className="receipt-attach" style={{ marginTop: 10, padding: "12px 14px", border: "1px dashed var(--line)", borderRadius: 12, background: "var(--paper)" }}>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Payment receipt <span className="hint">(optional — camera or gallery)</span></label>
                    {receiptImg ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <img src={receiptImg} alt="" style={{ width: 52, height: 52, borderRadius: 10, objectFit: "cover" }} />
                        <button className="btn ghost sm" onClick={() => setReceiptImg(null)}>Remove</button>
                      </div>
                    ) : (
                      <input type="file" accept="image/*" onChange={handleReceiptFile} />
                    )}
                  </div>
                )}
              </div>

              <div className="co-section">
                <div className="co-section-title">📝 Notes</div>
                <div className="field">
                  <textarea rows={3} style={{ resize: "none" }} {...register("notes")} placeholder="e.g. 2 pcs short on Item 4, to send later" />
                  {errors.notes && <p className="error">{errors.notes.message}</p>}
                </div>
              </div>

              <button
                className="btn teal"
                disabled={createMut.isPending}
                onClick={handleSubmit(submitOrder)}
              >
                {createMut.isPending ? "Saving…" : "Complete order & make receipt"}
              </button>
            </div>
          </div>
        </div>
      )}

      {cargoOpen && <CargoSheet initial={cargo} onSave={submitCargo} onClose={() => setCargoOpen(false)} />}
    </>
  );
}

function ProductPickTile({ product: p, ext, qty, onTap, onBump, setCart, setExpanded }) {
  const [temporary, setTemporary] = useState(String(qty || 1));

  useEffect(() => {
    setTemporary(String(qty || 1));
  }, [qty]);
  return (
    <div className={`prod ${qty ? "selected" : ""}`} onClick={onTap}>
      <div className="img" style={{ backgroundImage: p.img ? `url('${p.img}')` : "none" }}>
        {
          ext ? (
            <div className="ord-pick-check">
              <div className="ord-sets-lbl">QUANTITY</div>
              <div className="ord-stepper">
                <button onClick={(e) => { e.stopPropagation(); onBump(-1) }}>−</button>
                <input className="ord-sets-num" type="number" value={temporary} onChange={(e) => {
                  console.log("change", e.target.value);
                  e.stopPropagation();
                  setTemporary(e.target.value);
                }} onBlur={() => {
                  console.log("blur", temporary);
                  const n = parseInt(temporary, 10);
                  if (!isNaN(n) && n >= 1) {
                    setCart((prev) => ({ ...prev, [p.id]: n }));
                  } else {
                    setCart((prev) => ({ ...prev, [p.id]: 1 }));
                    setTemporary(1);
                  }
                }} />
                <button onClick={(e) => { e.stopPropagation(); onBump(1); }}>＋</button>
              </div>
              <div className="ord-pcs-lbl" >{qty}pcs</div>
              <button className="ord-done-btn" onClick={(e) => { console.log("click"); e.stopPropagation(); setExpanded(null) }} >Done</button>
            </div>
          ) :
            (qty > 0 && <div className="ord-added"><span className="ord-added-badge">{qty} pcs</span></div>)}
      </div>
      <div className="body">
        <div className="t-en">{p.titleEn}</div>
        <div className="price-row"><span className="retail" style={{ fontSize: 12 }}>{money(p.unitPrice)}<span style={{ fontWeight: 500, color: "var(--muted)" }}> / unit</span></span></div>
      </div>
    </div>
  );
}

export function CargoSheet({ initial, onSave, onClose }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(cargoSchema),
    defaultValues: {
      addaName: initial?.addaName || "",
      contact: initial?.contact || "",
      builtyNo: initial?.builtyNo || "",
      addaKharcha: initial?.addaKharcha || "",
      address: initial?.address || "",
    },
  });
  useEffect(() => {
    reset({
      addaName: initial?.addaName || "",
      contact: initial?.contact || "",
      builtyNo: initial?.builtyNo || "",
      addaKharcha: initial?.addaKharcha || "",
      address: initial?.address || "",
    });
  }, [initial, reset]);

  const save = (data) => {
    const empty = Object.values(data).every(
      (v) => v === "" || v == null
    );

    if (empty) {
      onSave(null);
    } else {
      onSave(data);
    }
  };

  return (
    <div className="sheet-bg open" onClick={onClose}>
      <div className="sheet open" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head"><h2>Cargo / builty details</h2><button className="x" onClick={onClose}>×</button></div>
        <div className="sheet-body">
          <div className="filter-note" style={{ marginBottom: 14 }}>Saved with the order and printed on the receipt.</div>
          <div className="field"><label>Adda name</label><input type="text" {...register("addaName")} placeholder="e.g. Al-Makkah Goods" />{errors.addaName && <p className="error">{errors.addaName.message}</p>}</div>
          <div className="field"><label>Telephone</label><input type="tel" {...register("contact")} placeholder="e.g. 03001234567" />{errors.contact && <p className="error">{errors.contact.message}</p>}</div>
          <div className="field"><label>Builty number</label><input type="text" {...register("builtyNo")} placeholder="e.g. B-4521" />{errors.builtyNo && <p className="error">{errors.builtyNo.message}</p>}</div>
          <div className="field"><label>Adda kharcha <span className="hint">(amount)</span></label><input type="number" min="0" {...register("addaKharcha")} placeholder="e.g. 100" />{errors.addaKharcha && <p className="error">{errors.addaKharcha.message}</p>}</div>
          <div className="field"><label>Address</label><input type="text" {...register("address")} placeholder="e.g. Truck Adda, Band Road" />{errors.address && <p className="error">{errors.address.message}</p>}</div>
          <div style={{ display: "flex", gap: 10 }}>
            {initial && <button className="btn ghost" style={{ flex: 1 }} onClick={() => onSave(null)}>Remove</button>}
            <button className="btn teal" style={{ flex: 2 }} onClick={handleSubmit(save)}>Save cargo details</button>
          </div>
        </div>
      </div>
    </div>
  );
}
