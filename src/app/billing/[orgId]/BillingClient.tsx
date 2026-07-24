"use client";
import { useState } from "react";
import Link from "next/link";

type SubscriptionInfo = {
  phase: "trial" | "active" | "blocked";
  daysLeft: number;
  label: string;
  accessGranted: boolean;
};

type SubPayment = {
  id: string;
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

export default function BillingClient({
  orgId,
  orgName,
  role,
  subscription,
  planPriceUsd,
  paymentInfo,
  initialPayments,
}: {
  orgId: string;
  orgName: string;
  role: string;
  subscription: SubscriptionInfo;
  planPriceUsd: string;
  paymentInfo: { pagoMovil: string; zelle: string; binance: string };
  initialPayments: SubPayment[];
}) {
  const [payments, setPayments] = useState<SubPayment[]>(initialPayments);
  const [amount, setAmount] = useState(planPriceUsd);
  const [method, setMethod] = useState<"PAGO_MOVIL" | "ZELLE" | "BINANCE" | "OTRO">("PAGO_MOVIL");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const hasPendingReport = payments.some((p) => p.status === "PENDING");

  async function submitPayment() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/organizations/${orgId}/subscription-payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: parseFloat(amount), method, reference, notes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo reportar el pago");
      setPayments((prev) => [data, ...prev]);
      setReference("");
      setNotes("");
      setSent(true);
      setTimeout(() => setSent(false), 5000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page-wrap">
      <div style={{ marginBottom: 18 }}>
        <Link href="/select-org" style={{ fontSize: 12.5, color: "var(--primary)", fontWeight: 700 }}>← Mis negocios</Link>
      </div>
      <h1>Facturación — {orgName}</h1>

      <div className={`banner ${subscription.phase === "blocked" ? "danger" : subscription.daysLeft <= 5 ? "warn" : ""}`} style={subscription.phase === "active" && subscription.daysLeft > 5 ? { background: "var(--success-tint)", color: "var(--success)", border: "1px solid #BFE0CC" } : undefined}>
        {subscription.phase === "trial" && "🎁 "}
        {subscription.phase === "active" && "✅ "}
        {subscription.phase === "blocked" && "🔒 "}
        {subscription.label}
      </div>

      {role !== "ADMIN" ? (
        <div className="card">
          <p style={{ fontSize: 13.5, color: "var(--ink-soft)" }}>
            Solo el administrador de este negocio puede reportar pagos. Pídele que entre a esta misma pantalla desde su cuenta.
          </p>
        </div>
      ) : (
        <div className="row" style={{ alignItems: "flex-start" }}>
          <div className="col card">
            <h3>Formas de pago</h3>
            <p style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: -6, marginBottom: 16 }}>
              Plan mensual: <b>${planPriceUsd} USD</b> (o su equivalente en bolívares a la tasa del día). Realiza el pago por cualquiera de estos medios y luego repórtalo abajo — lo activamos manualmente en cuanto lo confirmemos.
            </p>
            <div style={{ marginBottom: 14 }}>
              <div className="badge badge-info" style={{ marginBottom: 6 }}>Pago Móvil</div>
              <div style={{ fontSize: 13, whiteSpace: "pre-line", color: "var(--ink)" }}>{paymentInfo.pagoMovil}</div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <div className="badge badge-info" style={{ marginBottom: 6 }}>Zelle</div>
              <div style={{ fontSize: 13, whiteSpace: "pre-line", color: "var(--ink)" }}>{paymentInfo.zelle}</div>
            </div>
            <div>
              <div className="badge badge-info" style={{ marginBottom: 6 }}>Binance</div>
              <div style={{ fontSize: 13, whiteSpace: "pre-line", color: "var(--ink)" }}>{paymentInfo.binance}</div>
            </div>
          </div>

          <div className="col card">
            <h3>Reportar mi pago</h3>
            {error && <div className="error">{error}</div>}
            {sent && <div className="banner" style={{ background: "var(--success-tint)", color: "var(--success)", border: "1px solid #BFE0CC" }}>✅ Pago reportado. Lo revisamos y activamos tu acceso en cuanto lo confirmemos.</div>}
            {hasPendingReport && !sent && (
              <div className="banner warn">Ya tienes un reporte de pago pendiente de revisión. Puedes reportar otro si corresponde a un pago distinto.</div>
            )}
            <label className="f"><span>Monto pagado</span>
              <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </label>
            <label className="f"><span>Método</span>
              <select value={method} onChange={(e) => setMethod(e.target.value as typeof method)}>
                <option value="PAGO_MOVIL">Pago Móvil</option>
                <option value="ZELLE">Zelle</option>
                <option value="BINANCE">Binance</option>
                <option value="OTRO">Otro</option>
              </select>
            </label>
            <label className="f"><span>Número de referencia</span>
              <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Últimos dígitos de la operación" />
            </label>
            <label className="f"><span>Notas (opcional)</span>
              <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </label>
            <button className="btn btn-acc" style={{ width: "100%" }} disabled={busy || !amount || parseFloat(amount) <= 0} onClick={submitPayment}>
              {busy ? "Enviando…" : "Reportar pago"}
            </button>
          </div>
        </div>
      )}

      {payments.length > 0 && (
        <div className="table-card" style={{ marginTop: 18 }}>
          <table>
            <thead><tr><th>Fecha</th><th>Método</th><th>Referencia</th><th className="right">Monto</th><th>Estado</th></tr></thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="num">{fmtDate(p.reportedAt)}</td>
                  <td>{METHOD_LABEL[p.method]}</td>
                  <td className="num">{p.reference || "—"}</td>
                  <td className="right num">${p.amount.toLocaleString("es-VE", { minimumFractionDigits: 2 })}</td>
                  <td>
                    {p.status === "PENDING" && <span className="badge badge-warn">En revisión</span>}
                    {p.status === "APPROVED" && <span className="badge badge-ok">Aprobado</span>}
                    {p.status === "REJECTED" && <span className="badge badge-danger">Rechazado</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
