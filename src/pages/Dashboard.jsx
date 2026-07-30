import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Topbar from "../components/Topbar.jsx";
import { dashboardApi } from "../api/misc";
import { money } from "../utils/format";

export default function Dashboard() {
  const navigate = useNavigate();
  const { data } = useQuery({ queryKey: ["dashboard"], queryFn: dashboardApi.get });

  if (!data) return null;

  function fmtDur(ms) {
    const s = Math.round(ms / 1000);
    if (s < 60) return s + "s";
    const m = Math.floor(s / 60), r = s % 60;
    return r ? `${m}m ${r}s` : `${m}m`;
  }

  return (
    <>
      <Topbar title="Dashboard" sub="Statistics & KPIs" />
      <div className="screen">
        <span className="backlink" onClick={() => navigate("/admin/accounts")}>‹ Accounts</span>

        <div className="eyebrow">Key metrics</div>
        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", marginBottom: 20 }}>
          <Kpi value={data.totalProducts} label="Products" />
          <Kpi value={data.totalCategories} label="Categories" />
          <Kpi value={data.totalOrders} label="Total bills" />
          <Kpi value={data.totalShares} label="Shares sent" />
          <Kpi value={money(data.revenue)} label="Revenue (non-cancelled)" />
          <Kpi value={money(data.pendingBalance)} label="Pending balance" />
          <Kpi value={fmtDur(data.avgDwellMs)} label="Avg. time on page" />
        </div>

        <div className="eyebrow">Bills by status</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
          {Object.entries(data.statusCounts).map(([status, n]) => (
            <span key={status} className="pill total" style={{ background: "#efece5" }}>{status}: {n}</span>
          ))}
        </div>

        <div className="eyebrow">By category</div>
        {data.byCategory.map((c) => (
          <div className="cat-card" key={c.id} style={{ cursor: "default" }}>
            <div className="accent" />
            <h3>{c.name}</h3>
            <div className="meta">{c.products} products · {c.campaigns} campaigns · {c.visits} visits · avg {fmtDur(c.avg_dwell_ms)}</div>
          </div>
        ))}
      </div>
    </>
  );
}

function Kpi({ value, label }) {
  return (
    <div className="cat-card" style={{ cursor: "default", textAlign: "center" }}>
      <div style={{ fontSize: 20, fontWeight: 800 }}>{value}</div>
      <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{label}</div>
    </div>
  );
}
