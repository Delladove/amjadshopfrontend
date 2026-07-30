import { Outlet, useLocation } from "react-router-dom";
import BottomNav from "./BottomNav.jsx";

export default function AdminLayout() {
  const { pathname } = useLocation();
  const isNewBill = pathname === "/admin/bills/new";

  return (
    <div id="app">
      <Outlet />
      {!isNewBill && <BottomNav />}
    </div>
  );
}
