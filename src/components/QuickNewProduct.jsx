import { useQuery } from "@tanstack/react-query";
import { categoriesApi } from "../api/categories";
import { openSheet, closeSheet } from "./Sheet.jsx";
import { goTo } from "../utils/navigation";
import { toast } from "../utils/format";

export async function openQuickNewProductMenu() {
  const cats = await categoriesApi.list();
  if (!cats.length) {
    toast("Create a category first");
    goTo("/admin/products");
    return;
  }
  if (cats.length === 1) {
    console.log("Only one category, going straight to upload for", cats[0]);
    goTo(`/admin/products/${cats[0].id}?upload=1`);
    return;
  }
  openSheet("Add product to…", <Menu cats={cats} />);
}

function Menu({ cats }) {
  function go(catId) {
    closeSheet();
    goTo(`/admin/products/${catId}?upload=1`);
  }
  return (
    <div>
      <div className="filter-note" style={{ marginBottom: 14 }}>Choose which category the new photos belong to.</div>
      {cats.map((c) => (
        <div className="cat-card" key={c.id} onClick={() => go(c.id)}>
          <div className="accent" />
          <h3>{c.name}</h3>
          <div className="meta">{c.product_count} product{c.product_count !== 1 ? "s" : ""}</div>
          <div className="arrow">›</div>
        </div>
      ))}
    </div>
  );
}
