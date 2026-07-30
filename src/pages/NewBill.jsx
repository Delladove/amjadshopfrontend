import { useState, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Topbar from "../components/Topbar.jsx";
import { productsApi } from "../api/products";
import { categoriesApi } from "../api/categories";
import { ordersApi } from "../api/orders";
import { money, PAYMENT_METHODS, toast } from "../utils/format";
import { uploadFile } from "../api/client";
import BarcodeScanner from "../components/BarcodeScanner.jsx";

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

  // checkout fields
  const [discount, setDiscount] = useState(0);
  const [customer, setCustomer] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [cargo, setCargo] = useState(null);
  const [payment, setPayment] = useState("");
  const [paidNow, setPaidNow] = useState("");
  const [paidTouched, setPaidTouched] = useState(false);
  const [notes, setNotes] = useState("");
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

  function toggleProduct(id) {
    setCart((prev) => (prev[id] ? prev : { ...prev, [id]: 1 }));
  }
  function bump(id, delta) {
    setCart((prev) => {
      const n = (prev[id] || 0) + delta;
      const next = { ...prev };
      if (n < 1) delete next[id];
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
    mutationFn: () =>
      ordersApi.create({
        billType,
        customer,
        phone,
        city,
        payment,
        notes,
        cargo,
        discount: Number(discount) || 0,
        paidNow: paidTouched ? Number(paidNow) || 0 : total,
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
      }),
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

  const showReceiptAttach = payment && payment !== "Cash";

  return (
    <>
      <Topbar title="New order" sub={`${billType} bill · Select products`} />
      <div className="screen" style={{ paddingBottom: 110 }}>
        <span className="backlink" onClick={() => navigate("/admin/bills")}>‹ Bills</span>

        <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
          <input
            type="text"
            className="ord-search"
            style={{ flex: 1, minWidth: 0, marginBottom: 0 }}
            placeholder="🔍 Search products (optional)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="btn brass" style={{ flex: "0 0 auto", padding: "0 16px" }} onClick={() => setScannerOpen(true)}>📷 Scan</button>
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
                  qty={cart[p.id] || 0}
                  onTap={() => toggleProduct(p.id)}
                  onBump={(d) => bump(p.id, d)}
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
                          <input type="number" value={qty} onChange={(e) => {
                            const n = parseInt(e.target.value, 10);
                            if (!isNaN(n) && n >= 1) setCart((prev) => ({ ...prev, [id]: n }));
                          }} />
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
                  <input type="number" min="0" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="0" />
                </div>
                <div className="order-total-bar"><span>Total</span><span>{money(total)}</span></div>
                <div className="field" style={{ marginTop: 2 }}>
                  <label>Amount received now <span className="hint">(editable — leave as full total, or enter a partial payment)</span></label>
                  <input type="number" min="0" value={paidTouched ? paidNow : total}
                    onChange={(e) => { setPaidTouched(true); setPaidNow(e.target.value); }} placeholder="0" />
                </div>
                <div className={`order-total-bar balance-row ${previewBalance > 0.001 ? "due" : "clear"}`}>
                  <span>Balance</span><span>{money(previewBalance)}</span>
                </div>
              </div>

              <div className="co-section">
                <div className="co-section-title">👤 Customer details</div>
                <div className="field">
                  <label>Customer name</label>
                  <input type="text" value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="e.g. Ahmed Traders" />
                </div>
                <div className="field two">
                  <div>
                    <label>Phone <span className="hint">(optional)</span></label>
                    <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Optional" />
                  </div>
                  <div>
                    <label>City <span className="hint">(optional)</span></label>
                    <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Lahore" />
                  </div>
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
                        <input type="radio" name="pay" checked={payment === m} onChange={() => setPayment(m)} />
                        <span>{m}</span>
                      </label>
                    ))}
                  </div>
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
                <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. 2 pcs short on Item 4, to send later" />
              </div>

              <button
                className="btn teal"
                disabled={createMut.isPending || !customer.trim() || !payment}
                onClick={() => createMut.mutate()}
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

function ProductPickTile({ product: p, qty, onTap, onBump }) {
  return (
    <div className={`prod ${qty ? "selected" : ""}`} onClick={onTap}>
      <div className="img" style={{ backgroundImage: p.img ? `url('${p.img}')` : "none" }}>
        {qty > 0 && (
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg,rgba(230,35,30,.18),rgba(183,20,20,.22))", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 8 }}>
            <div style={{ background: "#fff", borderRadius: 10, padding: "4px 10px", display: "flex", alignItems: "center", gap: 8 }} onClick={(e) => e.stopPropagation()}>
              <button onClick={() => onBump(-1)} style={{ fontWeight: 800 }}>−</button>
              <b>{qty}</b>
              <button onClick={() => onBump(1)} style={{ fontWeight: 800 }}>＋</button>
            </div>
          </div>
        )}
      </div>
      <div className="body">
        <div className="t-en">{p.titleEn}</div>
        <div className="price-row"><span className="retail" style={{ fontSize: 12 }}>{money(p.unitPrice)}<span style={{ fontWeight: 500, color: "var(--muted)" }}> / unit</span></span></div>
      </div>
    </div>
  );
}

function CargoSheet({ initial, onSave, onClose }) {
  const [addaName, setAddaName] = useState(initial?.addaName || "");
  const [contact, setContact] = useState(initial?.contact || "");
  const [builtyNo, setBuiltyNo] = useState(initial?.builtyNo || "");
  const [addaKharcha, setAddaKharcha] = useState(initial?.addaKharcha || "");
  const [address, setAddress] = useState(initial?.address || "");

  function save() {
    if (!addaName && !contact && !builtyNo && !addaKharcha && !address) onSave(null);
    else onSave({ addaName, contact, builtyNo, addaKharcha, address });
  }

  return (
    <div className="sheet-bg open" onClick={onClose}>
      <div className="sheet open" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head"><h2>Cargo / builty details</h2><button className="x" onClick={onClose}>×</button></div>
        <div className="sheet-body">
          <div className="filter-note" style={{ marginBottom: 14 }}>Saved with the order and printed on the receipt.</div>
          <div className="field"><label>Adda name</label><input type="text" value={addaName} onChange={(e) => setAddaName(e.target.value)} placeholder="e.g. Al-Makkah Goods" /></div>
          <div className="field"><label>Telephone</label><input type="tel" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="e.g. 03001234567" /></div>
          <div className="field"><label>Builty number</label><input type="text" value={builtyNo} onChange={(e) => setBuiltyNo(e.target.value)} placeholder="e.g. B-4521" /></div>
          <div className="field"><label>Adda kharcha <span className="hint">(amount)</span></label><input type="number" min="0" value={addaKharcha} onChange={(e) => setAddaKharcha(e.target.value)} placeholder="e.g. 100" /></div>
          <div className="field"><label>Address</label><input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="e.g. Truck Adda, Band Road" /></div>
          <div style={{ display: "flex", gap: 10 }}>
            {initial && <button className="btn ghost" style={{ flex: 1 }} onClick={() => onSave(null)}>Remove</button>}
            <button className="btn teal" style={{ flex: 2 }} onClick={save}>Save cargo details</button>
          </div>
        </div>
      </div>
    </div>
  );
}
