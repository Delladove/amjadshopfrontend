import { useNavigate, useLocation } from "react-router-dom";

export default function Topbar({ title, sub }) {
  const navigate = useNavigate();
  const location = useLocation();
  const role = location.pathname.startsWith("/customer")
    ? "customer"
    : location.pathname.startsWith("/warehouse")
    ? "warehouse"
    : "admin";

  function switchTo(r) {
    if (r === "admin") navigate("/admin/home");
    else navigate(`/${r}`);
  }

  return (
    <div className="topbar">
      <div style={{ flex: 1 }}>
        <h1>{title}</h1>
        {sub && <div className="sub">{sub}</div>}
      </div>
      <div className="roleswitch">
        <button className={role === "admin" ? "on" : ""} onClick={() => switchTo("admin")}>Admin</button>
        {/* <button className={role === "customer" ? "on" : ""} onClick={() => switchTo("customer")}>Customer</button> */}
        <button className={role === "warehouse" ? "on" : ""} onClick={() => switchTo("warehouse")}>Warehouse</button>
      </div>
    </div>
  );
}
