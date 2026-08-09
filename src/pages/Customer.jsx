import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Topbar from "../components/Topbar.jsx";
import { categoriesApi } from "../api/categories";
import { productsApi } from "../api/products";
import { settingsApi } from "../api/misc";
import { visitsApi } from "../api/misc";
import { money } from "../utils/format";
import LottieLoader from "../components/LottieLoader.jsx";
const backendapiUrl = import.meta.env.VITE_API_URL;

export default function Customer() {
  const [params] = useSearchParams();
  const entrySlug = params.get("cat");
  const { data: categories = [], isPending: categoryPending } = useQuery({ queryKey: ["categories"], queryFn: categoriesApi.list });
  const { data: products = [] , isPending: productPending} = useQuery({ queryKey: ["products"], queryFn: () => productsApi.list() });
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: settingsApi.get });
  const [viewerProduct, setViewerProduct] = useState(null);

  // dwell-time tracking — attribute the visit to whichever category the shared link pointed at
  const visitRef = useRef({ catId: null, start: Date.now() });
  useEffect(() => {
    const entryCat = categories.find((c) => c.link_slug === entrySlug) || categories[0];
    if (entryCat) visitRef.current = { catId: entryCat.id, start: Date.now() };
    return () => {
      const dwellMs = Date.now() - visitRef.current.start;
      if (visitRef.current.catId && dwellMs >= 1000) {
        visitsApi.log(visitRef.current.catId, visitRef.current.start, dwellMs);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories.length]);

  const usable = categories.filter((c) => products.some((p) => p.catId === c.id));

  return (
    <div id="app">
      <Topbar title="Amjad Magic Center" sub="Customer view" />
  
      {(categoryPending || productPending)? <LottieLoader/> :
      (usable.length ? (
        usable.map((cat) => {
          const ps = products.filter((p) => p.catId === cat.id && p.titleEn && p.titleUr && p.unitPrice && p.shared > 0);
          return (
            <div key={cat.id}>
              <div className="cust-hero">
                <div className="name">{cat.name}</div>
                <div className="tag">Tap any item to view &amp; order</div>
              </div>
              <div className="screen">
                <div className="grid">
                  {ps.map((p) => (
                    <div className="prod" key={p.id} onClick={() => setViewerProduct(p)}>
                      <div className="img" style={{ backgroundImage: p.img ? `url('${p.img}')` : "none" }} />
                      <div className="body">
                        <div className="t-en">{p.titleEn}</div>
                        <div className="t-ur urdu">{p.titleUr}</div>
                        <div className="price-row"><span className="retail">{money(p.unitPrice)}</span><span className="whole">unit price</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })) : (
        <div className="screen"><div className="empty"><div className="big">🛍️</div><p>No products available yet.</p></div></div>
      ))}

      {viewerProduct && (
        <ProductViewer product={viewerProduct} category={categories.find((c) => c.id === viewerProduct.catId)} waNumber={settings?.waNumber} onClose={() => setViewerProduct(null)} />
      )}
    </div>
  );
}

function ProductViewer({ product, category, waNumber, onClose }) {
  const [photoIdx, setPhotoIdx] = useState(0);
  const photos = product.imgs && product.imgs.length ? product.imgs : product.img ? [product.img] : [];

  function order() {
    const msg = encodeURIComponent(
      `${backendapiUrl}/api/products/product/${product.id}\n آپ کو کتنی مقدار چاہیے؟ \n\n-`
    );
    const url = waNumber ? `https://wa.me/${waNumber}?text=${msg}` : `https://wa.me/?text=${msg}`;
    window.open(url, "_blank");
  }

  return (
    <div className="viewer open" style={{ position: "fixed", inset: 0, zIndex: 70, background: "var(--paper)", maxWidth: 480, margin: "0 auto", display: "flex", flexDirection: "column" }}>
      <div style={{ position: "relative", flex: 1, minHeight: 0, background: "#000" }}>
        <button onClick={onClose} style={{ position: "absolute", top: "calc(14px + env(safe-area-inset-top,0))", right: 16, zIndex: 5, width: 40, height: 40, borderRadius: "50%", background: "rgba(28,26,23,.55)", color: "#fff", fontSize: 26, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        {photos.length > 1 && (
          <div style={{ position: "absolute", top: "calc(20px + env(safe-area-inset-top,0))", left: 16, zIndex: 5, background: "rgba(28,26,23,.55)", color: "#fff", fontSize: 13, fontWeight: 600, padding: "6px 12px", borderRadius: 999 }}>
            {photoIdx + 1} / {photos.length}
          </div>
        )}
        <div style={{ width: "100%", height: "100%", backgroundImage: photos[photoIdx] ? `url('${photos[photoIdx]}')` : "none", backgroundSize: "contain", backgroundPosition: "center", backgroundRepeat: "no-repeat" }}
          onClick={() => photos.length > 1 && setPhotoIdx((i) => (i + 1) % photos.length)} />
      </div>
      <div className="screen">
        <h2 style={{ fontSize: 19, fontWeight: 800 }}>{product.titleEn}</h2>
        <div className="urdu" style={{ fontSize: 15, color: "var(--muted)", marginBottom: 12 }}>{product.titleUr}</div>
        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 14, padding: 14, marginBottom: 16, textAlign: "center" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>Unit Price</div>
          <div style={{ fontSize: 24, fontWeight: 800 }}>{money(product.unitPrice)}</div>
          <div style={{ fontSize: 11, color: "var(--muted)" }}>per piece</div>
        </div>
        <div className="v-info-row">
          <button className="btn v-order" onClick={order}>
            <span>Order on WhatsApp</span>
            <span className="urdu" style={{ fontSize: 14, opacity: .95 }}>واٹس ایپ پر آرڈر کریں</span>
          </button>
          <button className="v-fab-wa" onClick={order} aria-label="Order on WhatsApp">
            <svg viewBox="0 0 32 32" fill="currentColor"><path d="M16.004 3C9.11 3 3.5 8.61 3.5 15.505c0 2.35.646 4.55 1.77 6.435L3 29l7.238-2.226a12.42 12.42 0 0 0 5.766 1.42h.005c6.894 0 12.5-5.61 12.5-12.505C28.51 8.61 22.9 3 16.004 3zm0 22.72h-.004a10.34 10.34 0 0 1-5.27-1.442l-.378-.224-4.296 1.32 1.34-4.19-.246-.43a10.27 10.27 0 0 1-1.577-5.45c0-5.702 4.64-10.34 10.34-10.34 2.762 0 5.36 1.078 7.313 3.033a10.28 10.28 0 0 1 3.03 7.313c0 5.702-4.64 10.41-10.412 10.41zm5.664-7.78c-.31-.155-1.833-.905-2.117-1.01-.284-.104-.49-.155-.697.156-.207.31-.8 1.01-.98 1.217-.18.207-.36.233-.67.078-.31-.156-1.31-.483-2.494-1.54-.922-.822-1.545-1.838-1.726-2.148-.18-.31-.02-.478.137-.633.14-.14.31-.362.465-.543.155-.18.207-.31.31-.517.104-.207.052-.388-.026-.543-.078-.155-.697-1.68-.955-2.3-.252-.605-.507-.523-.697-.533l-.593-.01c-.207 0-.543.078-.827.388-.284.31-1.084 1.06-1.084 2.584 0 1.524 1.11 2.996 1.264 3.203.155.207 2.185 3.337 5.293 4.68.74.32 1.317.51 1.767.653.742.236 1.418.203 1.952.123.596-.089 1.833-.75 2.09-1.474.259-.724.259-1.345.181-1.474-.077-.13-.284-.207-.594-.362z" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}
