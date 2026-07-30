import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { registerNavigate } from "./utils/navigation";
import AdminLayout from "./components/AdminLayout.jsx";
import Home from "./pages/Home.jsx";
import Bills from "./pages/Bills.jsx";
import NewBill from "./pages/NewBill.jsx";
import Products from "./pages/Products.jsx";
import CategoryDetail from "./pages/CategoryDetail.jsx";
import Accounts from "./pages/Accounts.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Barcodes from "./pages/Barcodes.jsx";
import Customer from "./pages/Customer.jsx";
import Warehouse from "./pages/Warehouse.jsx";
import Sheet from "./components/Sheet.jsx";

function NavigateRegistrar() {
  const navigate = useNavigate();
  useEffect(() => { registerNavigate(navigate); }, [navigate]);
  return null;
}

export default function App() {
  return (
    <>
      <NavigateRegistrar />
      <Routes>
        <Route path="/" element={<Navigate to="/admin/home" replace />} />

        <Route element={<AdminLayout />}>
          <Route path="/admin/home" element={<Home />} />
          <Route path="/admin/bills" element={<Bills />} />
          <Route path="/admin/bills/new" element={<NewBill />} />
          <Route path="/admin/products" element={<Products />} />
          <Route path="/admin/products/:catId" element={<CategoryDetail />} />
          <Route path="/admin/accounts" element={<Accounts />} />
          <Route path="/admin/accounts/dashboard" element={<Dashboard />} />
          <Route path="/admin/accounts/barcodes" element={<Barcodes />} />
        </Route>

        <Route path="/customer" element={<Customer />} />
        <Route path="/warehouse" element={<Warehouse />} />

        <Route path="*" element={<Navigate to="/admin/home" replace />} />
      </Routes>

      {/* the receipt/checkout/cargo/etc. sheets render through this single portal-like host */}
      <Sheet.Host />
    </>
  );
}
