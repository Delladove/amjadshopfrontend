import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Topbar from "../components/Topbar.jsx";
import { categoriesApi } from "../api/categories";
import { productsApi } from "../api/products";
import { uploadFile, API_URL } from "../api/client";
import { money, toast } from "../utils/format";
// validation imports
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { productSchema } from "../validations/productSchema.js";

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
              <div className="filter-note">
                Tap products to select, then confirm. {staged.size} selected.
                <button className="btn teal sm" style={{ margin: "8px 0" }} disabled={!staged.size || shareMut.isPending} onClick={() => shareMut.mutate()}>
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
                    {p.shared &&  <span className="pill shared" style={{ position: "absolute", top: 8, left: 8 }}>Shared</span>}
                    {staged.has(p.id) && <div class="checkmark"><span class="tick">✓</span></div> }
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

  const [imgs, setImgs] = useState([]);
  const [dataSubmitted, setDataSubmitted] = useState(false);

  const createMut = useMutation({
    mutationFn: (data) => {
      console.log("Creating product with data:", data);
      return productsApi.create({
        catId,
        ...data,
        unitPrice: Number(data.unitPrice),
      })
    },
    onSuccess: () => { toast("Product published"); onSaved(); },
    onError: (e) => toast(e.message),
  });

  function handleFiles(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const newImages = files.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      file,
      preview: URL.createObjectURL(file),
    }));
    setImgs((prev) => [...prev, ...newImages])
    e.target.value = "";
  }
  function removeImage(id) {
    setImgs((prev) => {
      const img = prev.find((i) => i.id === id);

      if (img)
        URL.revokeObjectURL(img.preview);

      return prev.filter((i) => i.id !== id);
    });
  }

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(productSchema),
  });

  const onSubmit = async (data) => {
    // if (imgs.length === 0) {
    //   toast("Please upload at least one photo");
    //   return;
    // }
    setDataSubmitted(true);
    try {
      // const urls = await Promise.all(
      //   imgs.map((img) => uploadFile(img.file))
      // );

      await createMut.mutateAsync({
        ...data,
        // imgs: urls,
        imgs: ["https://duaazure5096.blob.core.windows.net/container1/DuGPFAeieHjnMbEhqM9VQ.webp"],
      });
      
      toast("Product created");
    } catch (err) {
      toast(`${err}Something went wrong`);
    } finally {
      setDataSubmitted(false);
    }

  };

  return (
    <div className="sheet-bg open" onClick={onClose}>
      <div className="sheet open" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head"><h2>Add product</h2><button className="x" onClick={onClose}>×</button></div>
        <div className="sheet-body">
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="field">
              <label>Photos</label>
              <label className="ep-add-long">
                <span className="ep-plus-long">＋</span><span>{dataSubmitted ? "Uploading Files..." : "Add photos"}</span>
                <input hidden type="file" accept="image/*" multiple onChange={handleFiles} disabled={dataSubmitted} />
              </label>
              {imgs.length > 0 && (
                <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                  {
                    imgs.map((img) => (
                      <div className="preview-item" key={img.id}>
                        <img src={img.preview} alt="" style={{ width: 60, height: 60, borderRadius: 10, objectFit: "cover" }} />

                        <button
                          type="button"
                          className="remove-btn"
                          onClick={() => removeImage(img.id)}
                        >
                          ✕
                        </button>
                      </div>))
                  }
                </div>
              )}
            </div>
            <div className="field"><label>Title (English)</label><input type="text" style={{ border: errors.titleEn ? "1px solid var(--danger)" : undefined }} placeholder="e.g. Ceramic Tea Set"  {...register("titleEn")} />
              {errors.titleEn && (<p className="error">{errors.titleEn.message}</p>)}</div>
            <div className="field"><label className="urdu">عنوان</label><input type="text" style={{ border: errors.titleUr ? "1px solid var(--danger)" : undefined }} className="urdu" {...register("titleUr")} placeholder="عنوان لکھیں" />
              {errors.titleUr && (<p className="error">{errors.titleUr.message}</p>)}</div>
            <div className="field"><label>Unit price <span className="hint">(per piece)</span></label><input type="number" style={{ border: errors.unitPrice ? "1px solid var(--danger)" : undefined }} {...register("unitPrice")} placeholder="0" />
              {errors.unitPrice && (<p className="error">{errors.unitPrice.message}</p>)}</div>
            <button className="btn primary" disabled={dataSubmitted} type="submit">
              {dataSubmitted ? "Publishing…" : "Publish product"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function EditProductSheet({ product, onClose, onSaved }) {
  const [editimgs, setEditImgs] = useState(product.imgs);
  // console.log("editimgs", editimgs);
  const [newImgs, setNewImgs] = useState([]); // newly selected files

  function handleEditFiles(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const images = files.map(file => ({
      id: crypto.randomUUID(),
      file,
      preview: URL.createObjectURL(file),
    }));

    setNewImgs(prev => [...prev, ...images]);

    e.target.value = "";
  }

  function removeeditImage(id) {
    setEditImgs((prev) => {
      return prev.filter((i) => i !== id);
    });
  }
  function removeNewImage(id) {
    setNewImgs(prev => {
      const img = prev.find(i => i.id === id);

      if (img) URL.revokeObjectURL(img.preview);

      return prev.filter(i => i.id !== id);
    });
  }
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(productSchema),
    defaultValues: {
      titleEn: product.titleEn,
      titleUr: product.titleUr,
      unitPrice: product.unitPrice,
    }
  });

  const saveMut = useMutation({
    mutationFn: (data) => {
      console.log(data);
      return productsApi.update(product.id, { ...data, unitPrice: Number(data.unitPrice) })
    },
    onSuccess: () => { toast("Saved"); onSaved(); },
    onError: (e) => toast(e.message),
  });
  const deleteMut = useMutation({
    mutationFn: () => productsApi.remove(product.id),
    onSuccess: () => { toast("Product deleted"); onSaved(); },
  });
  const onSubmit = async (data) => {
    if (editimgs.length === 0 && newImgs.length === 0) {
      toast("Please upload at least one photo");
      return;
    }
    try {
      // upload only newly added files
      const uploadedUrls = await Promise.all(
        newImgs.map(img => uploadFile(img.file))
      );

      // merge with remaining existing images
      const imgs = [...editimgs, ...uploadedUrls];

      await saveMut.mutateAsync({
        ...data,
        imgs,
      });
    } catch (err) {
      toast(err.message);
    }
  }

  useEffect(() => {
    return () => {
      newImgs.forEach(img => URL.revokeObjectURL(img.preview));
    };
  }, [newImgs]);

  return (
    <div className="sheet-bg open" onClick={onClose}>
      <div className="sheet open" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head"><h2>Edit product</h2><button className="x" onClick={onClose}>×</button></div>
        <div className="sheet-body">
          <div style={{marginBottom:10}}>
          <div className="ep-strip">
            {editimgs.map((i,index) => (
              <div key={i} className={`ep-thumb ${index===0?'main':''}`} style={{ backgroundImage: `url('${i}')` }}>
                {index===0 && <span className="ep-badge">Main</span>}
                <button className="ep-del" onClick={() => removeeditImage(i)} >×</button>
              </div>
            ))}
            {newImgs.map((i,index) => (
              <div key={i.id} className={`ep-thumb ${(index===0 && editimgs.length === 0)?'main':''}`} style={{ backgroundImage: `url('${i.preview}')` }}>
                 {(index===0 && editimgs.length === 0) && <span className="ep-badge">Main</span>}
                <button className="ep-del" onClick={() => removeNewImage(i.id)} >×</button>
              </div>
            ))}
            <label className="ep-add">
              <span className="ep-plus">＋</span>
              <input hidden type="file" accept="image/*" multiple onChange={handleEditFiles} disabled={saveMut.isPending} />
            </label>
          </div>
          <div className="ep-hint">First photo is the main one customers see. Tap ＋ to add more.</div>
          </div>
          {/* ============================== */}
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="field"><label>Title (English)</label><input type="text" {...register("titleEn")} />
              {errors.titleEn && (<p className="error">{errors.titleEn.message}</p>)}</div>
            <div className="field"><label className="urdu">عنوان</label><input type="text" className="urdu" {...register("titleUr")} />
              {errors.titleUr && (<p className="error">{errors.titleUr.message}</p>)}</div>
            <div className="field"><label>Unit price <span className="hint">(per piece)</span></label><input type="number" {...register("unitPrice")} />
              {errors.unitPrice && (<p className="error">{errors.unitPrice.message}</p>)}</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 14 }}>Barcode: {product.barcode}</div>
            <button className="btn primary" disabled={saveMut.isPending} type="submit">{saveMut.isPending ? "Saving…" : "Save changes"}</button>
          </form>
          <button className="btn ghost" style={{ marginTop: 10, color: "var(--danger)", borderColor: "var(--danger)" }}
            onClick={() => { if (confirm("Delete this product?")) deleteMut.mutate(); }}>
            Delete product
          </button>
        </div>
      </div>
    </div>
  );
}
