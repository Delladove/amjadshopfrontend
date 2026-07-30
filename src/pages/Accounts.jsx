import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Topbar from "../components/Topbar.jsx";
import { settingsApi } from "../api/misc";
import { ordersApi } from "../api/orders";
import { uploadFile } from "../api/client";
import { money, PAYMENT_METHODS, toast } from "../utils/format";

export default function Accounts() {
  const navigate = useNavigate();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: settingsApi.get });
  const { data: orders = [] } = useQuery({ queryKey: ["orders"], queryFn: () => ordersApi.list() });

  const pendingCount = orders.filter((o) => o.status !== "cancelled" && o.balance > 0.001).length;
  const totalPending = orders.filter((o) => o.status !== "cancelled").reduce((a, o) => a + o.balance, 0);

  return (
    <>
      <Topbar title="Accounts" sub="Business settings & insights" />
      <div className="screen">
        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", marginBottom: 18 }}>
          <div className="cat-card" style={{ cursor: "default", textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 800 }}>{pendingCount}</div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>Pending bills</div>
          </div>
          <div className="cat-card" style={{ cursor: "default", textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 800 }}>{money(totalPending)}</div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>Outstanding</div>
          </div>
        </div>

        <div className="eyebrow" style={{ marginTop: 6 }}>Insights</div>
        <div className="cat-card" onClick={() => navigate("/admin/accounts/dashboard")}>
          <div className="accent" style={{ background: "var(--brass)" }} />
          <h3>📊 Dashboard</h3>
          <div className="meta">Views, shares, orders &amp; per-category stats</div>
          <div className="arrow">›</div>
        </div>
        <div className="cat-card" onClick={() => navigate("/admin/accounts/barcodes")}>
          <div className="accent" style={{ background: "var(--ink)" }} />
          <h3>🏷️ Barcodes</h3>
          <div className="meta">Manage &amp; print product barcodes</div>
          <div className="arrow">›</div>
        </div>

        <div className="eyebrow" style={{ marginTop: 18 }}>Settings</div>
        <div className="cat-card" onClick={() => setSettingsOpen(true)}>
          <div className="accent" style={{ background: "var(--teal)" }} />
          <h3>WhatsApp &amp; payment methods</h3>
          <div className="meta">{settings?.waNumber ? `Orders are sent to +${settings.waNumber}` : "Not set yet — tap to add the number orders go to."}</div>
          <div className="arrow">›</div>
        </div>

        <div className="filter-note" style={{ marginTop: 22 }}>More accounting &amp; bookkeeping tools are coming to this tab soon.</div>
      </div>

      {settingsOpen && <SettingsSheet settings={settings} onClose={() => setSettingsOpen(false)} />}
    </>
  );
}

function SettingsSheet({ settings, onClose }) {
  const qc = useQueryClient();
  const [waNumber, setWaNumber] = useState(settings?.waNumber || "");
  const [imgs, setImgs] = useState(settings?.paymentMethodImgs || {});

  const saveMut = useMutation({
    mutationFn: () => settingsApi.update({ waNumber, paymentMethodImgs: imgs }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["settings"] }); toast("Saved"); onClose(); },
  });

  async function handleImg(method, e) {
    const file = e.target.files[0];
    if (!file) return;
    const url = await uploadFile(file);
    setImgs((prev) => ({ ...prev, [method]: url }));
  }

  return (
    <div className="sheet-bg open" onClick={onClose}>
      <div className="sheet open" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head"><h2>WhatsApp number</h2><button className="x" onClick={onClose}>×</button></div>
        <div className="sheet-body">
          <div className="field">
            <label>Your studio WhatsApp number <span className="hint">(with country code)</span></label>
            <input type="tel" value={waNumber} onChange={(e) => setWaNumber(e.target.value)} placeholder="e.g. 923001234567" />
          </div>
          <div className="filter-note" style={{ marginBottom: 16 }}>
            Enter digits only, including the country code — no "+", spaces or dashes. This is the number every customer order is sent to.
          </div>
          <button className="btn teal" disabled={saveMut.isPending} onClick={() => saveMut.mutate()}>Save number</button>

          <div className="eyebrow" style={{ margin: "22px 0 8px" }}>Payment methods</div>
          <div className="filter-note" style={{ marginBottom: 8 }}>Optional — add a logo/icon shown next to each payment method during checkout.</div>
          {PAYMENT_METHODS.map((m) => (
            <div key={m} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--paper)", backgroundImage: imgs[m] ? `url('${imgs[m]}')` : "none", backgroundSize: "cover", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {!imgs[m] && "💳"}
              </div>
              <div style={{ flex: 1, fontWeight: 700, fontSize: 13.5 }}>{m}</div>
              <label className="btn ghost sm" style={{ cursor: "pointer" }}>
                {imgs[m] ? "Change" : "Add image"}
                <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => handleImg(m, e)} />
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
