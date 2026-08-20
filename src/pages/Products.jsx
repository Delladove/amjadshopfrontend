import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Topbar from "../components/Topbar.jsx";
import { categoriesApi } from "../api/categories";
import { productsApi } from "../api/products";
import { openQuickNewProductMenu } from "../components/QuickNewProduct.jsx";
import { toast } from "../utils/format";
import LottieLoader from "../components/LottieLoader.jsx";
// okokaok
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { categorySchema } from "../validations/categorySchema.js";

export default function Products() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: categories = [], isPending: categoriesLoading } = useQuery({ queryKey: ["categories"], queryFn: categoriesApi.list });
  const { data: allProducts = [], isPending: productsLoading } = useQuery({ queryKey: ["products"], queryFn: () => productsApi.list() });

  const [showAddCat, setShowAddCat] = useState(false);

  // validation for category name 
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: yupResolver(categorySchema),
  });

  const onSubmit = (data) => {
    createCat.mutate(data);
  };
  // ==========================

  const createCat = useMutation({
    mutationFn: (data) => categoriesApi.create(data.newCatName),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      setShowAddCat(false);
      reset();
      toast("Category created");
    },
    onError: (e) => {
      toast(e.message);
      console.error("Error creating category:", e);
    },
  });
  const deleteCat = useMutation({
    mutationFn: (data) => {
      console.log("deletecatdata", data);
      return categoriesApi.remove(data)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      toast("Category deleted");
    },
    onError: (e) => {
      toast(e.message);
      console.error("Error deleting category:", e);
    },
  })

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
          <form className="field" onSubmit={handleSubmit(onSubmit)} >
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              <div style={{ flex: 1 }}>
                <label>New category name</label>
                <input type="text" {...register("newCatName")} placeholder="e.g. Party Masks" autoFocus />
              </div>
              <button className="btn teal sm" type="submit" disabled={createCat.isPending} >Save</button>
            </div>
            {errors.newCatName && <p className="error">{errors.newCatName.message}</p>}
          </form>
        )}
        {(categoriesLoading || productsLoading) ? <LottieLoader /> :
          (!categories.length ? (
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

                  <div className="arrow" onClick={(e) => { 
                    e.stopPropagation();
                    if(!c.product_count){
                      if(confirm("Do you want to delete Category"))
                        deleteCat.mutate(c.id);
                    }
                    else
                      toast("Category should be empty.")
                    }}>
                  <svg fill="#c81f2e" width="100%" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M5.755,20.283,4,8H20L18.245,20.283A2,2,0,0,1,16.265,22H7.735A2,2,0,0,1,5.755,20.283ZM21,4H16V3a1,1,0,0,0-1-1H9A1,1,0,0,0,8,3V4H3A1,1,0,0,0,3,6H21a1,1,0,0,0,0-2Z" /></svg>
                  </div>
                </div>
              );
            })
          ))
        }
      </div>
    </>
  );
}
