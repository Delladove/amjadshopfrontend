import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Topbar from "../components/Topbar.jsx";
import { categoriesApi } from "../api/categories";
import { productsApi } from "../api/products";
import { openQuickNewProductMenu } from "../components/QuickNewProduct.jsx";
import { toast } from "../utils/format";

export default function Products() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: categoriesApi.list });
  const { data: allProducts = [] } = useQuery({ queryKey: ["products"], queryFn: () => productsApi.list() });

  const [showAddCat, setShowAddCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");

  const createCat = useMutation({
    mutationFn: () => categoriesApi.create(newCatName.trim()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      setShowAddCat(false);
      setNewCatName("");
      toast("Category created");
    },
    onError: (e) => {toast(e.message);
      console.error("Error creating category:", e);
    },
  });

  const totalProducts = allProducts.length;

  return (
    <>
      <Topbar title="Products" sub={`${totalProducts} product${totalProducts !== 1 ? "s" : ""} across ${categories.length} categor${categories.length !== 1 ? "ies" : "y"}`} />
      <div className="screen">
        <div className="actions">
          <button className="btn brass" style={{ flex: 1 }} onClick={openQuickNewProductMenu}>＋ Add product</button>
          <button className="btn ghost" style={{ flex: 1 }} onClick={() => setShowAddCat(true)}>＋ Add category</button>
        </div>

        {showAddCat && (
          <div className="field" style={{ display: "flex", gap: 8, alignItems: "flex-end", marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <label>New category name</label>
              <input type="text" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="e.g. Party Masks" autoFocus />
            </div>
            <button className="btn teal sm" disabled={!newCatName.trim() || createCat.isPending} onClick={() => createCat.mutate()}>Save</button>
          </div>
        )}

        {!categories.length ? (
          <div className="empty"><div className="big">📦</div><p>No categories yet.<br />Tap "＋ Add category" to get started.</p></div>
        ) : (
          categories.map((c) => {
            const prods = allProducts.filter((p) => p.catId === c.id).slice(0, 6);
            const extra = c.product_count - prods.length;
            return (
              <div className="cat-card tall" key={c.id} onClick={() => navigate(`/admin/products/${c.id}`)}>
                <div className="accent" />
                <h3>{c.name}</h3>
                <div className="meta">{c.product_count} product{c.product_count !== 1 ? "s" : ""} · {c.shared_count} shared · {c.campaign_count} campaign{c.campaign_count !== 1 ? "s" : ""}</div>
                {prods.length ? (
                  <div className="cat-thumbs">
                    {prods.map((p) => (
                      <div key={p.id} className="cat-thumb" style={{ backgroundImage: p.img ? `url('${p.img}')` : "none" }} />
                    ))}
                    {extra > 0 && <div className="cat-thumb more">+{extra}</div>}
                  </div>
                ) : (
                  <div className="cat-thumbs" style={{ fontSize: 12, color: "var(--muted)", padding: "8px 0" }}>No products yet</div>
                )}
                <div className="arrow">›</div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
