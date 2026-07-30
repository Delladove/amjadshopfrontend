import { useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Topbar from "../components/Topbar.jsx";
import { categoriesApi } from "../api/categories";
import { productsApi } from "../api/products";
import { uploadFile, API_URL } from "../api/client";
import { money, toast } from "../utils/format";

export default function CategoryDetail() {
  const { catId } = useParams();
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState("products");
  const [uploadOpen, setUploadOpen] = useState(!!search.get("upload"));
  const [editingProduct, setEditingProduct] = useState(null);
  const [selectMode, setSelectMode] = useState(false);
  const [staged, setStaged] = useState(new Set());

  const { data: category } = useQuery({ queryKey: ["category", catId], queryFn: () => categoriesApi.get(catId) });
  const { data: products = [] } = useQuery({ queryKey: ["products", "cat", catId], queryFn: () => productsApi.list({ catId }) });

  const shareMut = useMutation({
    mutationFn: async () => {
      for (const id of staged) {
        console.log("Sharing product", id);
        await productsApi.share(id);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products", "cat", catId] });
      qc.invalidateQueries({ queryKey: ["categories"] });
      toast(`Shared ${staged.size} product${staged.size !== 1 ? "s" : ""}`);
      setSelectMode(false);
      setStaged(new Set());
    },
  });

  const shareLink = category ? `${window.location.origin}/customer?cat=${category.link_slug}` : "";
  const waMessage = category ? encodeURIComponent(`Check out our latest ${category.name}!\n${shareLink}`) : "";

  if (!category) return null;

  return (
    <>
      <Topbar title={category.name} sub={`${products.length} products`} />
      <div className="screen">
        <span className="backlink" onClick={() => navigate("/admin/products")}>‹ All products</span>

        <div className="bill-type-tabs">
          <button className={`bt-tab ${tab === "products" ? "on" : ""}`} onClick={() => setTab("products")}>Products</button>
          <button className={`bt-tab ${tab === "share" ? "on" : ""}`} onClick={() => setTab("share")}>Shared</button>
          <button className={`bt-tab ${tab === "history" ? "on" : ""}`} onClick={() => setTab("history")}>History</button>
        </div>

        {tab === "products" && (
          <>
            <div className="actions">
              <button className="btn brass" style={{ flex: 1 }} onClick={() => setUploadOpen(true)}>＋ Upload photos</button>
              {!selectMode ? (
                <button className="btn ghost" style={{ flex: 1 }} onClick={() => setSelectMode(true)}>🔗 Share</button>
              ) : (
                <button className="btn ghost" style={{ flex: 1 }} onClick={() => { setSelectMode(false); setStaged(new Set()); }}>Cancel</button>
              )}
            </div>
            {selectMode && (
              <div className="filter-note" style={{ marginBottom: 12 }}>
                Tap products to select, then confirm. {staged.size} selected.
                <button className="btn teal sm" style={{ marginLeft: 10 }} disabled={!staged.size || shareMut.isPending} onClick={() => shareMut.mutate()}>
                  Confirm share
                </button>
              </div>
            )}
            <div className="grid">
              {products.map((p) => (
                <div
                  key={p.id}
                  className={`prod ${staged.has(p.id) ? "selected" : ""}`}
                  onClick={() => {
                    if (selectMode) {
                      setStaged((prev) => {
                        const next = new Set(prev);
                        next.has(p.id) ? next.delete(p.id) : next.add(p.id);
                        return next;
                      });
                    } else {
                      setEditingProduct(p);
                    }
                  }}
                >
                  <div className="img" style={{ backgroundImage: p.img ? `url('${p.img}')` : "none" }}>
                    {p.shared && <span className="pill shared" style={{ position: "absolute", top: 8, left: 8 }}>Shared</span>}
                  </div>
                  <div className="body">
                    <div className="t-en">{p.titleEn}</div>
                    <div className="t-ur urdu">{p.titleUr}</div>
                    <div className="price-row"><span className="retail">{money(p.unitPrice)}</span></div>
                  </div>
                </div>
              ))}
            </div>
            {!products.length && <div className="empty"><div className="big">📷</div><p>No products yet — tap "＋ Upload photos" to add some.</p></div>}
          </>
        )}

        {tab === "share" && (
          <div>
            <div className="cat-card" style={{ cursor: "default" }}>
              <div className="accent" style={{ background: "var(--teal)" }} />
              <h3>Permanent link for this category</h3>
              <div className="meta" style={{ wordBreak: "break-all" }}>{shareLink}</div>
            </div>
            <div className="actions">
              <button className="btn ghost" style={{ flex: 1 }} onClick={() => { navigator.clipboard.writeText(shareLink); toast("Link copied"); }}>📋 Copy link</button>
              <a className="btn brass" style={{ flex: 1, textDecoration: "none", display: "flex" }} href={`https://wa.me/?text=${waMessage}`} target="_blank" rel="noreferrer">💬 Send on WhatsApp</a>
            </div>
            <div className="eyebrow" style={{ marginTop: 16 }}>Shared with customers</div>
            {products.filter((p) => p.shared).map((p) => (
              <div className="cat-card" key={p.id} style={{ cursor: "default" }}>
                <div className="accent" />
                <h3>{p.titleEn}</h3>
                <div className="meta">Shared {p.shareCount}×</div>
              </div>
            ))}
          </div>
        )}

        {tab === "history" && (
          <div className="filter-note">Campaign history — {category.campaign_count ?? 0} share event(s) logged for this category.</div>
        )}
      </div>

      {uploadOpen && (
        <UploadSheet
          catId={catId}
          onClose={() => setUploadOpen(false)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["products", "cat", catId] });
            setUploadOpen(false);
          }}
        />
      )}
      {editingProduct && (
        <EditProductSheet
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["products", "cat", catId] });
            setEditingProduct(null);
          }}
        />
      )}
    </>
  );
}

function UploadSheet({ catId, onClose, onSaved }) {
  const [titleEn, setTitleEn] = useState("");
  const [titleUr, setTitleUr] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [imgs, setImgs] = useState([]);
  const [uploading, setUploading] = useState(false);

  const createMut = useMutation({
    mutationFn: () => productsApi.create({ catId, titleEn, titleUr, unitPrice: Number(unitPrice) || 0, imgs }),
    onSuccess: () => { toast("Product published"); onSaved(); },
    onError: (e) => toast(e.message),
  });

  async function handleFiles(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      const urls = await Promise.all(files.map(uploadFile));
      setImgs((prev) => [...prev, ...urls]);
    } catch {
      toast("Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="sheet-bg open" onClick={onClose}>
      <div className="sheet open" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head"><h2>Add product</h2><button className="x" onClick={onClose}>×</button></div>
        <div className="sheet-body">
          <div className="field">
            <label>Photos</label>
            <input type="file" accept="image/*" multiple onChange={handleFiles} disabled={uploading} />
            {imgs.length > 0 && (
              <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                {imgs.map((url, i) => (
                  <img key={i} src={url} alt="" style={{ width: 60, height: 60, borderRadius: 10, objectFit: "cover" }} />
                ))}
              </div>
            )}
          </div>
          <div className="field"><label>Title (English)</label><input type="text" value={titleEn} onChange={(e) => setTitleEn(e.target.value)} placeholder="e.g. Ceramic Tea Set" /></div>
          <div className="field"><label className="urdu">عنوان</label><input type="text" className="urdu" value={titleUr} onChange={(e) => setTitleUr(e.target.value)} placeholder="عنوان لکھیں" /></div>
          <div className="field"><label>Unit price <span className="hint">(per piece)</span></label><input type="number" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} placeholder="0" /></div>
          <button className="btn primary" disabled={!titleEn.trim() || createMut.isPending} onClick={() => createMut.mutate()}>
            {createMut.isPending ? "Publishing…" : "Publish product"}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditProductSheet({ product, onClose, onSaved }) {
  const [titleEn, setTitleEn] = useState(product.titleEn);
  const [titleUr, setTitleUr] = useState(product.titleUr);
  const [unitPrice, setUnitPrice] = useState(product.unitPrice);

  const saveMut = useMutation({
    mutationFn: () => productsApi.update(product.id, { titleEn, titleUr, unitPrice: Number(unitPrice) || 0 }),
    onSuccess: () => { toast("Saved"); onSaved(); },
    onError: (e) => toast(e.message),
  });
  const deleteMut = useMutation({
    mutationFn: () => productsApi.remove(product.id),
    onSuccess: () => { toast("Product deleted"); onSaved(); },
  });

  return (
    <div className="sheet-bg open" onClick={onClose}>
      <div className="sheet open" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head"><h2>Edit product</h2><button className="x" onClick={onClose}>×</button></div>
        <div className="sheet-body">
          <div className="field"><label>Title (English)</label><input type="text" value={titleEn} onChange={(e) => setTitleEn(e.target.value)} /></div>
          <div className="field"><label className="urdu">عنوان</label><input type="text" className="urdu" value={titleUr} onChange={(e) => setTitleUr(e.target.value)} /></div>
          <div className="field"><label>Unit price <span className="hint">(per piece)</span></label><input type="number" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} /></div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 14 }}>Barcode: {product.barcode}</div>
          <button className="btn primary" disabled={saveMut.isPending} onClick={() => saveMut.mutate()}>Save changes</button>
          <button className="btn ghost" style={{ marginTop: 10, color: "var(--danger)", borderColor: "var(--danger)" }}
            onClick={() => { if (confirm("Delete this product?")) deleteMut.mutate(); }}>
            Delete product
          </button>
        </div>
      </div>
    </div>
  );
}
