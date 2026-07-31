import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Topbar from "../components/Topbar.jsx";
import { barcodesApi } from "../api/misc";
import { ean13SVG } from "../utils/ean13";
import LottieLoader from "../components/LottieLoader.jsx";

export default function Barcodes() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const { data: list = [] , isPending: barcodeLoading } = useQuery({ queryKey: ["barcodes", search], queryFn: () => barcodesApi.list(search) });

  function printOne(item) {
    const n = prompt("How many copies to print?", "1");
    if (n === null) return;
    printSheet(Array.from({ length: Math.max(1, parseInt(n, 10) || 1) }, () => item));
  }
  function printAll() {
    if (!list.length) return;
    printSheet([...list].sort((a, b) => a.titleEn.localeCompare(b.titleEn)));
  }
  function printSheet(items) {
    const w = window.open("", "_blank");
    if (!w) return;
    const labels = items
      .map((it) => `<div class="label"><div class="label-name">${it.titleEn}</div>${ean13SVG(it.barcode, { moduleW: 2, height: 50, fontSize: 11 })}</div>`)
      .join("");
    w.document.write(`<html><head><title>Barcodes</title><style>
      @page{ size:A4; margin:12mm; } body{font-family:sans-serif;margin:0}
      .sheet{display:flex;flex-wrap:wrap;gap:6mm}
      .label{width:58mm;border:1px dashed #ccc;border-radius:2mm;padding:4mm;text-align:center;
        display:flex;flex-direction:column;align-items:center;justify-content:center}
      .label-name{font-size:11px;font-weight:700;margin-bottom:3px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      svg{max-width:100%;height:auto}
    </style></head><body><div class="sheet">${labels}</div></body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 400);
  }

  return (
    <>
      <Topbar title="Barcodes" sub={`${list.length} generated`} />
      <div className="screen">
        <span className="backlink" onClick={() => navigate("/admin/accounts")}>‹ Accounts</span>
        <div className="actions"><button className="btn brass" onClick={printAll}>🖨 Print all barcodes (A4)</button></div>
        <input type="text" className="ord-search" placeholder="🔍 Search by product name or code" value={search} onChange={(e) => setSearch(e.target.value)} />
        { barcodeLoading? <LottieLoader/>: 
        list.length ? list.map((item) => (
          <div key={item.productId} style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, marginBottom: 10, background: "var(--card)", border: "1px solid var(--line)", borderRadius: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: "var(--paper) center/cover no-repeat", backgroundImage: item.img ? `url('${item.img}')` : "none", flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.titleEn}</div>
              <div dangerouslySetInnerHTML={{ __html: ean13SVG(item.barcode, { moduleW: 1.4, height: 38, fontSize: 10 }) }} />
            </div>
            <button className="btn ghost sm" onClick={() => printOne(item)}>🖨 Print</button>
          </div>
        )) : (
          <div className="empty"><div className="big">🏷️</div><p>No barcodes match "{search}".</p></div>
        )}
      </div>
    </>
  );
}
