import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthProvider";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { loginApi } from "../api/misc"

export default function Topbar({ title, sub }) {
  const { data } = useQuery({
    queryKey: ["warehouse"],
    queryFn: loginApi.getwarehouse,
    // refetchInterval: 3000,
  });
  const warehouseDisabled = data?.warehouseDisabled;

  const qc = useQueryClient();

  const setWarehouseMut = useMutation({
    mutationFn: loginApi.setwarehouse,
    onSuccess: (data) => {
      qc.setQueryData(["warehouse"], data);
    },
  });
  const { user, isAuthenticated } = useAuth();
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

  return (<>
    {
    (isAuthenticated && user?.role === 'admin') ?
      <div className="topbar">
        <div style={{ flex: 1 }}>
          <h1>{title}</h1>
          {sub && <div className="sub">{sub}</div>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer" }}>
          <div className="roleswitch">
            <button className={role === "admin" ? "on" : ""} onClick={() => switchTo("admin")}>Admin</button>
            <button className={role === "customer" ? "on" : ""} onClick={() => switchTo("customer")}>Customer</button>
            <button className={role === "warehouse" ? "on" : ""} onClick={() => switchTo("warehouse")}>Warehouse</button>
          </div>
          {warehouseDisabled ? (
            <p
              className="sub"
              style={{ color: "var(--danger)" }}
              onClick={() => { setWarehouseMut.mutate(false) }}
              disabled={setWarehouseMut.isPending}
            >
              Warehouse disabled
            </p>
          ) : (
            <p
              className="sub"
              onClick={() => { setWarehouseMut.mutate(true) }}
              disabled={setWarehouseMut.isPending}
            >
              Disable warehouse?
            </p>
          )}
        </div>
      </div> :
      <div className="topbar">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img src="hat-logo.png" alt="Amjad Magic Center" style={{ height: 45 }} />
          <div style={{ flex: 1 }}>
            <h1>{title}</h1>
            <div className="sub">{sub}</div>
          </div>
        </div>
      </div>
      }
  </>
  );
}


