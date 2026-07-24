"use client";
import { useMemo, useState } from "react";

type OrgRow = {
  id: string;
  name: string;
  businessType: string;
  createdAt: string;
  adminEmail: string;
  adminName: string;
  subscription: { phase: "trial" | "active" | "blocked"; daysLeft: number; label: string; accessGranted: boolean };
};

type SubPayment = {
  id: string;
  organizationId: string;
  organization: { name: string };
  amount: number;
  method: "PAGO_MOVIL" | "ZELLE" | "BINANCE" | "OTRO";
  reference: string | null;
  notes: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reportedAt: string;
};

const METHOD_LABEL: Record<string, string> = {
  PAGO_MOVIL: "Pago Móvil",
  ZELLE: "Zelle",
  BINANCE: "Binance",
  OTRO: "Otro",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-VE", { day: "2-digit", month: "short", year: "numeric" });
}

export default function AdminClient({
  initialOrgs,
  initialPayments,
}: {
  initialOrgs: OrgRow[];
  initialPayments: SubPayment[];
}) {
  const [orgs, setOrgs] = useState(initialOrgs);
  const [payments, setPayments] = useState(initialPayments);
  const [tab, setTab] = useState<"pendientes" | "negocios" | "historial">("pendientes");
  const [busyId, setBusyId] = useState<string | null>(null);

  const pending = useMemo(() => payments.filter((p) => p.status === "PENDING"), [payments]);
  const kpis = useMemo(() => ({
    total: orgs.length,
    trial: orgs.filter((o) => o.subscription.phase === "trial").length,
    active: orgs.filter((o) => o.subscription.phase === "active").length,
    blocked: orgs.filter((o) => o.subscription.phase === "blocked").length,
  }), [orgs]);

  async function approve(paymentId: string, organizationId: string) {
    setBusyId(paymentId);
    try {
      const res = await fetch(`/api/admin/payments/${paymentId}/approve`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPayments((prev) => prev.map((p) => (p.id === paymentId ? { ...p, status: "APPROVED" } : p)));
      setOrgs((prev) => prev.map((o) => (o.id === organizationId
        ? { ...o, subscription: { phase: "active", daysLeft: 30, label: `Plan activo — vence el ${new Date(data.paidUntil).toLocaleDateString("es-VE")}`, accessGranted: true } }
        : o)));
    } catch (e) {
      alert((e as Error).message || "No se pudo aprobar el pago");
    } finally {
      setBusyId(null);
    }
  }
  async function reject(paymentId: string) {
    if (!confirm("¿Rechazar este pago reportado?")) return;
    setBusyId(paymentId);
    try {
      const res = await fetch(`/api/admin/payments/${paymentId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPayments((prev) => prev.map((p) => (p.id === paymentId ? { ...p, status: "REJECTED" } : p)));
    } catch (e) {
      alert((e as Error).message || "No se pudo rechazar el pago");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="page-wrap" style={{ maxWidth: 1100 }}>
      <h1>Panel de facturación — ABASTO OS</h1>
      <p style={{ color: "var(--ink-soft)", fontSize: 13, marginTop: -8, marginBottom: 20 }}>
        Aprueba o rechaza los pagos reportados por tus clientes y revisa el estado de cada negocio.
      </p>

      <div className="kpi-grid">
        <div className="kpi"><div className="lbl">Negocios totales</div><div className="val">{kpis.total}</div></div>
        <div className="kpi"><div className="lbl">En prueba gratis</div><div className="val">{kpis.trial}</div></div>
        <div className="kpi"><div className="lbl">Con plan activo</div><div className="val">{kpis.active}</div></div>
        <div className="kpi danger"><div className="lbl">Bloqueados</div><div className="val">{kpis.blocked}</div></div>
      </div>

      <div className="tabs-sub">
        <button className={tab === "pendientes" ? "active" : ""} onClick={() => setTab("pendientes")}>Pagos pendientes ({pending.length})</button>
        <button className={tab === "negocios" ? "active" : ""} onClick={() => setTab("negocios")}>Negocios</button>
        <button className={tab === "historial" ? "active" : ""} onClick={() => setTab("historial")}>Historial de pagos</button>
      </div>

      {tab === "pendientes" && (
        <div className="table-card">
          <table>
            <thead><tr><th>Negocio</th><th>Fecha</th><th>Método</th><th>Referencia</th><th className="right">Monto</th><th className="right">Acciones</th></tr></thead>
            <tbody>
              {pending.map((p) => (
                <tr key={p.id}>
                  <td><b>{p.organization.name}</b></td>
                  <td className="num">{fmtDate(p.reportedAt)}</td>
                  <td>{METHOD_LABEL[p.method]}</td>
                  <td className="num">{p.reference || "—"}{p.notes ? ` · ${p.notes}` : ""}</td>
                  <td className="right num">${p.amount.toLocaleString("es-VE", { minimumFractionDigits: 2 })}</td>
                  <td className="right">
                    <button className="btn btn-primary2" style={{ padding: "5px 10px", fontSize: 12 }} disabled={busyId === p.id}
                      onClick={() => approve(p.id, p.organizationId)}>
                      {busyId === p.id ? "…" : "Aprobar (+30 días)"}
                    </button>{" "}
                    <button className="btn btn-danger" style={{ padding: "5px 10px", fontSize: 12 }} disabled={busyId === p.id}
                      onClick={() => reject(p.id)}>
                      Rechazar
                    </button>
                  </td>
                </tr>
              ))}
              {!pending.length && (
                <tr><td colSpan={6}><div className="empty">No hay pagos pendientes de revisión. 🎉</div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === "negocios" && (
        <div className="table-card">
          <table>
            <thead><tr><th>Negocio</th><th>Rubro</th><th>Administrador</th><th>Creado</th><th>Estado</th></tr></thead>
            <tbody>
              {orgs.map((o) => (
                <tr key={o.id}>
                  <td><b>{o.name}</b></td>
                  <td>{o.businessType}</td>
                  <td>{o.adminName}<br /><span style={{ fontSize: 11, color: "var(--ink-soft)" }}>{o.adminEmail}</span></td>
                  <td className="num">{fmtDate(o.createdAt)}</td>
                  <td>
                    {o.subscription.phase === "trial" && <span className="badge badge-info">Prueba · {o.subscription.daysLeft}d</span>}
                    {o.subscription.phase === "active" && <span className="badge badge-ok">Activo</span>}
                    {o.subscription.phase === "blocked" && <span className="badge badge-danger">Bloqueado</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "historial" && (
        <div className="table-card">
          <table>
            <thead><tr><th>Negocio</th><th>Fecha</th><th>Método</th><th className="right">Monto</th><th>Estado</th></tr></thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td>{p.organization.name}</td>
                  <td className="num">{fmtDate(p.reportedAt)}</td>
                  <td>{METHOD_LABEL[p.method]}</td>
                  <td className="right num">${p.amount.toLocaleString("es-VE", { minimumFractionDigits: 2 })}</td>
                  <td>
                    {p.status === "PENDING" && <span className="badge badge-warn">En revisión</span>}
                    {p.status === "APPROVED" && <span className="badge badge-ok">Aprobado</span>}
                    {p.status === "REJECTED" && <span className="badge badge-danger">Rechazado</span>}
                  </td>
                </tr>
              ))}
              {!payments.length && (
                <tr><td colSpan={5}><div className="empty">Aún no hay pagos reportados.</div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
