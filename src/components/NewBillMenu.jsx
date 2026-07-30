import { openSheet, closeSheet } from "./Sheet.jsx";
import { goTo } from "../utils/navigation";

export function openNewBillMenu() {
  openSheet("New bill", <Menu />);
}

function Menu() {
  function go(type) {
    closeSheet();
    goTo(`/admin/bills/new?type=${type}`);
  }
  return (
    <div>
      <div className="filter-note" style={{ marginBottom: 14 }}>What type of bill is this?</div>
      <div className="cat-card" onClick={() => go("Walkin")}>
        <div className="accent" style={{ background: "var(--brass)" }} />
        <h3>🚶 Walk-in</h3>
        <div className="meta">Customer is here in the shop right now</div>
        <div className="arrow">›</div>
      </div>
      <div className="cat-card" onClick={() => go("Booking")}>
        <div className="accent" style={{ background: "var(--teal)" }} />
        <h3>📅 Booking</h3>
        <div className="meta">Order placed in advance, for later pickup or delivery</div>
        <div className="arrow">›</div>
      </div>
    </div>
  );
}
