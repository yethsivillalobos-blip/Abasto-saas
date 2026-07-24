"use client";
import { useMemo, useState } from "react";
import NotificationSetup from "../NotificationSetup";

type Supplier = {
  id: string;
  name: string;
  doc: string | null;
  phone: string | null;
  email: string | null;
  contactName: string | null;
  notes: string | null;
};

type Payable = {
  id: string;
  supplierId: string;
  supplier: Supplier;
  description: string;
  amount: number;
  dueDate: string;
  status: "PENDING" | "PAID" | "OVERDUE";
  paidDate: string | null;
  paidAmount: number | null;
};

type Stock = { id: string; productId: string; branchId: string; quantity: number };
type Product = {
  id: string;
  name: string;
  sku: string | null;
  unit: string;
  costPrice: number;
  salePrice: number;
  stocks: Stock[];
};
type Branch = { id: string; name: string; address: string | null };
type PurchaseItem = { id: string; productId: string | null; name: string; qty: number; unitCost: number };
type Purchase = {
  id: string;
  supplierId: string;
  supplier: Supplier;
  branchId: string;
  branch: Branch;
  date: string;
  total: number;
  paymentStatus: "PAID" | "CREDIT";
  payableId: string | null;
  payable: Payable | null;
  notes: string | null;
  items: PurchaseItem[];
};

function fmtBs(n: number) {
  return n.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " Bs";
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-VE");
}
function daysLeft(iso: string) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const due = new Date(iso);
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  return Math.round((dueDay.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}
function daysLeftLabel(d: number) {
  if (d < 0) return { text: `Vencida hace ${Math.abs(d)} día(s)`, cls: "danger" };
  if (d === 0) return { text: "Vence hoy", cls: "danger" };
  if (d <= 3) return { text: `Vence en ${d} día(s)`, cls: "warn" };
  return { text: `Vence en ${d} días`, cls: "ok" };
}

export default function ProveedoresClient({
  orgId,
  initialSuppliers,
  initialPayables,
  initialProducts,
  initialBranches,
  initialPurchases,
}: {
  orgId: string;
  initialSuppliers: Supplier[];
  initialPayables: Payable[];
  initialProducts: Product[];
  initialBranches: Branch[];
  initialPurchases: Purchase[];
}) {
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers);
  const [payables, setPayables] = useState<Payable[]>(initialPayables);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [branches] = useState<Branch[]>(initialBranches);
  const [purchases, setPurchases] = useState<Purchase[]>(initialPurchases);
  const [tab, setTab] = useState<"cuentas" | "proveedores" | "compras">("cuentas");
  const [statusFilter, setStatusFilter] = useState<"all" | "PENDING" | "OVERDUE" | "PAID">("all");
  const [supplierFilter, setSupplierFilter] = useState<string>("all");
  const [showSupplierModal, setShowSupplierModal] = useState<Supplier | null | false>(false);
  const [showPayableModal, setShowPayableModal] = useState<Payable | null | false>(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [purchaseDetail, setPurchaseDetail] = useState<Purchase | null>(null);
  const [payModal, setPayModal] = useState<Payable | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const api = (path: string) => `/api/organizations/${orgId}${path}`;

  function flashSuccess(msg: string) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 4000);
  }

  const kpis = useMemo(() => {
    const pendingOrOverdue = payables.filter((p) => p.status !== "PAID");
    const totalPending = pendingOrOverdue.reduce((a, p) => a + p.amount, 0);
    const overdue = payables.filter((p) => p.status === "OVERDUE" || (p.status === "PENDING" && daysLeft(p.dueDate) < 0));
    const dueSoon = payables.filter((p) => p.status === "PENDING" && daysLeft(p.dueDate) >= 0 && daysLeft(p.dueDate) <= 3);
    return {
      totalPending,
      overdueCount: overdue.length,
      overdueAmount: overdue.reduce((a, p) => a + p.amount, 0),
      dueSoonCount: dueSoon.length,
      supplierCount: suppliers.length,
    };
  }, [payables, suppliers]);

  const filteredPayables = useMemo(() => {
    let list = [...payables];
    if (statusFilter !== "all") {
      if (statusFilter === "OVERDUE") {
        list = list.filter((p) => p.status === "OVERDUE" || (p.status === "PENDING" && daysLeft(p.dueDate) < 0));
      } else {
        list = list.filter((p) => p.status === statusFilter);
      }
    }
    if (supplierFilter !== "all") list = list.filter((p) => p.supplierId === supplierFilter);
    return list.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [payables, statusFilter, supplierFilter]);

  function supplierDebt(supplierId: string) {
    return payables
      .filter((p) => p.supplierId === supplierId && p.status !== "PAID")
      .reduce((a, p) => a + p.amount, 0);
  }

  /* ---------- Proveedores CRUD ---------- */
  async function saveSupplier(form: Supplier) {
    setBusy(true);
    setError("");
    try {
      const isEdit = !!form.id;
      const res = await fetch(isEdit ? api(`/suppliers/${form.id}`) : api(`/suppliers`), {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al guardar");
      setSuppliers((prev) => (isEdit ? prev.map((s) => (s.id === data.id ? data : s)) : [...prev, data].sort((a, b) => a.name.localeCompare(b.name))));
      setShowSupplierModal(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function deleteSupplier(id: string) {
    if (!confirm("¿Eliminar este proveedor? También se eliminarán sus cuentas por pagar.")) return;
    const res = await fetch(api(`/suppliers/${id}`), { method: "DELETE" });
    if (res.ok) {
      setSuppliers((prev) => prev.filter((s) => s.id !== id));
      setPayables((prev) => prev.filter((p) => p.supplierId !== id));
    }
  }

  /* ---------- Payables CRUD ---------- */
  async function savePayable(form: { id?: string; supplierId: string; description: string; amount: number; dueDate: string }) {
    setBusy(true);
    setError("");
    try {
      const isEdit = !!form.id;
      const res = await fetch(isEdit ? api(`/payables/${form.id}`) : api(`/payables`), {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al guardar");
      setPayables((prev) => (isEdit ? prev.map((p) => (p.id === data.id ? data : p)) : [...prev, data]));
      setShowPayableModal(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function markPaid(id: string, paidAmount: number) {
    const res = await fetch(api(`/payables/${id}`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "markPaid", paidAmount }),
    });
    const data = await res.json();
    if (res.ok) {
      setPayables((prev) => prev.map((p) => (p.id === id ? data : p)));
      setPayModal(null);
    }
  }
  async function reopenPayable(id: string) {
    const res = await fetch(api(`/payables/${id}`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reopen" }),
    });
    const data = await res.json();
    if (res.ok) setPayables((prev) => prev.map((p) => (p.id === id ? data : p)));
  }
  async function deletePayable(id: string) {
    if (!confirm("¿Eliminar esta cuenta por pagar?")) return;
    const res = await fetch(api(`/payables/${id}`), { method: "DELETE" });
    if (res.ok) setPayables((prev) => prev.filter((p) => p.id !== id));
  }

  /* ---------- Compras ---------- */
  async function addProductQuick(form: { name: string; sku: string; unit: string; salePrice: string }) {
    const res = await fetch(api(`/products`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.name, sku: form.sku, unit: form.unit || "unidad", salePrice: parseFloat(form.salePrice) || 0 }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "No se pudo crear el producto");
    setProducts((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    return data as Product;
  }

  async function savePurchase(form: {
    supplierId: string;
    branchId: string;
    paymentStatus: "PAID" | "CREDIT";
    dueDate: string;
    notes: string;
    updateCost: boolean;
    items: { productId: string; qty: number; unitCost: number }[];
  }) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(api(`/purchases`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data: Purchase = await res.json();
      if (!res.ok) throw new Error((data as unknown as { error?: string })?.error || "Error al registrar la compra");

      setPurchases((prev) => [data, ...prev]);

      // Reflejar el nuevo stock localmente
      setProducts((prev) =>
        prev.map((p) => {
          const item = data.items.find((i) => i.productId === p.id);
          if (!item) return p;
          const stocks = [...p.stocks];
          const idx = stocks.findIndex((s) => s.branchId === data.branchId);
          if (idx >= 0) stocks[idx] = { ...stocks[idx], quantity: stocks[idx].quantity + item.qty };
          else stocks.push({ id: `tmp_${p.id}_${data.branchId}`, productId: p.id, branchId: data.branchId, quantity: item.qty });
          return { ...p, stocks, costPrice: form.updateCost ? item.unitCost : p.costPrice };
        })
      );

      if (data.payable) {
        setPayables((prev) => [...prev, data.payable as Payable]);
      }

      setShowPurchaseModal(false);
      flashSuccess(
        data.paymentStatus === "CREDIT"
          ? `Compra registrada. Se creó una cuenta por pagar a ${data.supplier.name} por ${fmtBs(data.total)}.`
          : `Compra registrada y stock actualizado en ${data.branch.name}.`
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="content">
      <div className="pagehead-row">
        <div>
          <h1>Proveedores</h1>
          <div className="sub" style={{ color: "var(--ink-soft)", fontSize: 13 }}>
            Cuentas por pagar y alertas de vencimiento
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <NotificationSetup />
          <button className="btn btn-primary2" onClick={() => setShowPurchaseModal(true)} disabled={!suppliers.length}>
            + Registrar compra
          </button>
        </div>
      </div>

      {successMsg && <div className="banner" style={{ background: "var(--success-tint)", border: "1px solid #BFE0CC", color: "var(--success)" }}>✅ {successMsg}</div>}
      {!suppliers.length && (
        <div className="banner warn">Registra tu primer proveedor en la pestaña &quot;Proveedores&quot; para poder registrar compras.</div>
      )}

      {kpis.overdueCount > 0 && (
        <div className="banner danger">
          🚨 Tienes <b>{kpis.overdueCount}</b> cuenta(s) vencida(s) por {fmtBs(kpis.overdueAmount)}. Revísalas en la pestaña de cuentas por pagar.
        </div>
      )}

      <div className="kpi-grid">
        <div className="kpi danger">
          <div className="lbl">Total por pagar</div>
          <div className="val">{fmtBs(kpis.totalPending)}</div>
        </div>
        <div className="kpi danger">
          <div className="lbl">Vencidas</div>
          <div className="val">{kpis.overdueCount}</div>
        </div>
        <div className="kpi">
          <div className="lbl">Por vencer (≤3 días)</div>
          <div className="val">{kpis.dueSoonCount}</div>
        </div>
        <div className="kpi">
          <div className="lbl">Proveedores</div>
          <div className="val">{kpis.supplierCount}</div>
        </div>
      </div>

      <div className="tabs-sub">
        <button className={tab === "cuentas" ? "active" : ""} onClick={() => setTab("cuentas")}>Cuentas por pagar</button>
        <button className={tab === "proveedores" ? "active" : ""} onClick={() => setTab("proveedores")}>Proveedores</button>
        <button className={tab === "compras" ? "active" : ""} onClick={() => setTab("compras")}>Historial de compras</button>
      </div>

      {tab === "cuentas" && (
        <>
          <div className="row" style={{ alignItems: "flex-end", marginBottom: 14 }}>
            <div className="col" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <select style={{ width: "auto", padding: "8px 10px", border: "1.5px solid var(--line)", borderRadius: 8 }}
                value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}>
                <option value="all">Todas</option>
                <option value="PENDING">Pendientes</option>
                <option value="OVERDUE">Vencidas</option>
                <option value="PAID">Pagadas</option>
              </select>
              <select style={{ width: "auto", padding: "8px 10px", border: "1.5px solid var(--line)", borderRadius: 8 }}
                value={supplierFilter} onChange={(e) => setSupplierFilter(e.target.value)}>
                <option value="all">Todos los proveedores</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <button className="btn btn-acc" onClick={() => setShowPayableModal(null)} disabled={!suppliers.length}>
              + Nueva cuenta por pagar
            </button>
          </div>
          <div className="table-card">
            <table>
              <thead>
                <tr>
                  <th>Proveedor</th><th>Descripción</th><th>Vencimiento</th><th>Estado</th>
                  <th className="right">Monto</th><th className="right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayables.map((p) => {
                  const dl = daysLeft(p.dueDate);
                  const lbl = daysLeftLabel(dl);
                  const rowCls = p.status === "PAID" ? "" : dl < 0 ? "overdue-row" : dl <= 3 ? "duesoon-row" : "";
                  return (
                    <tr key={p.id} className={rowCls}>
                      <td><b>{p.supplier.name}</b></td>
                      <td>{p.description}</td>
                      <td className="num">
                        {fmtDate(p.dueDate)}
                        {p.status !== "PAID" && <div className={`days-left ${lbl.cls}`}>{lbl.text}</div>}
                      </td>
                      <td>
                        {p.status === "PAID" && <span className="badge badge-ok">Pagada {p.paidDate ? fmtDate(p.paidDate) : ""}</span>}
                        {p.status === "OVERDUE" && <span className="badge badge-danger">Vencida</span>}
                        {p.status === "PENDING" && <span className="badge badge-warn">Pendiente</span>}
                      </td>
                      <td className="right num">{fmtBs(p.amount)}</td>
                      <td className="right">
                        {p.status !== "PAID" ? (
                          <>
                            <button className="btn" style={{ padding: "5px 10px", fontSize: 12 }} onClick={() => setPayModal(p)}>Marcar pagada</button>{" "}
                            <button className="btn" style={{ padding: "5px 10px", fontSize: 12 }} onClick={() => setShowPayableModal(p)}>Editar</button>{" "}
                          </>
                        ) : (
                          <button className="btn" style={{ padding: "5px 10px", fontSize: 12 }} onClick={() => reopenPayable(p.id)}>Reabrir</button>
                        )}{" "}
                        <button className="btn btn-danger" style={{ padding: "5px 10px", fontSize: 12 }} onClick={() => deletePayable(p.id)}>Eliminar</button>
                      </td>
                    </tr>
                  );
                })}
                {!filteredPayables.length && (
                  <tr><td colSpan={6}><div className="empty">No hay cuentas por pagar que coincidan con el filtro.</div></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "proveedores" && (
        <>
          <div className="row" style={{ justifyContent: "flex-end", marginBottom: 14 }}>
            <button className="btn btn-acc" onClick={() => setShowSupplierModal(null)}>+ Nuevo proveedor</button>
          </div>
          <div className="table-card">
            <table>
              <thead>
                <tr><th>Nombre</th><th>Documento</th><th>Contacto</th><th>Teléfono / Correo</th><th className="right">Debe actualmente</th><th className="right">Acciones</th></tr>
              </thead>
              <tbody>
                {suppliers.map((s) => (
                  <tr key={s.id}>
                    <td><b>{s.name}</b></td>
                    <td className="num">{s.doc || "—"}</td>
                    <td>{s.contactName || "—"}</td>
                    <td>{s.phone || ""}{s.phone && s.email ? " · " : ""}{s.email || ""}</td>
                    <td className="right num" style={{ fontWeight: 700, color: supplierDebt(s.id) > 0 ? "var(--danger)" : "var(--success)" }}>
                      {fmtBs(supplierDebt(s.id))}
                    </td>
                    <td className="right">
                      <button className="btn" style={{ padding: "5px 10px", fontSize: 12 }} onClick={() => { setSupplierFilter(s.id); setTab("cuentas"); }}>Ver cuentas</button>{" "}
                      <button className="btn" style={{ padding: "5px 10px", fontSize: 12 }} onClick={() => setShowSupplierModal(s)}>Editar</button>{" "}
                      <button className="btn btn-danger" style={{ padding: "5px 10px", fontSize: 12 }} onClick={() => deleteSupplier(s.id)}>Eliminar</button>
                    </td>
                  </tr>
                ))}
                {!suppliers.length && (
                  <tr><td colSpan={6}><div className="empty">Aún no tienes proveedores registrados.</div></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "compras" && (
        <div className="table-card">
          <table>
            <thead>
              <tr><th>Fecha</th><th>Proveedor</th><th>Sucursal</th><th>Productos</th><th>Pago</th><th className="right">Total</th><th className="right">Acciones</th></tr>
            </thead>
            <tbody>
              {purchases.map((pu) => (
                <tr key={pu.id}>
                  <td className="num">{fmtDate(pu.date)}</td>
                  <td><b>{pu.supplier.name}</b></td>
                  <td>{pu.branch.name}</td>
                  <td>{pu.items.length} línea(s)</td>
                  <td>
                    {pu.paymentStatus === "PAID"
                      ? <span className="badge badge-ok">Contado</span>
                      : <span className={`badge ${pu.payable?.status === "PAID" ? "badge-ok" : pu.payable?.status === "OVERDUE" ? "badge-danger" : "badge-warn"}`}>
                          Crédito {pu.payable ? `· ${pu.payable.status === "PAID" ? "pagada" : pu.payable.status === "OVERDUE" ? "vencida" : "pendiente"}` : ""}
                        </span>}
                  </td>
                  <td className="right num">{fmtBs(pu.total)}</td>
                  <td className="right">
                    <button className="btn" style={{ padding: "5px 10px", fontSize: 12 }} onClick={() => setPurchaseDetail(pu)}>Ver detalle</button>
                  </td>
                </tr>
              ))}
              {!purchases.length && (
                <tr><td colSpan={7}><div className="empty">Aún no has registrado compras a proveedores.</div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showSupplierModal !== false && (
        <SupplierModal
          supplier={showSupplierModal}
          busy={busy}
          error={error}
          onClose={() => { setShowSupplierModal(false); setError(""); }}
          onSave={saveSupplier}
        />
      )}
      {showPayableModal !== false && (
        <PayableModal
          payable={showPayableModal}
          suppliers={suppliers}
          busy={busy}
          error={error}
          onClose={() => { setShowPayableModal(false); setError(""); }}
          onSave={savePayable}
        />
      )}
      {payModal && (
        <MarkPaidModal payable={payModal} onClose={() => setPayModal(null)} onConfirm={markPaid} />
      )}
      {showPurchaseModal && (
        <PurchaseModal
          suppliers={suppliers}
          branches={branches}
          products={products}
          busy={busy}
          error={error}
          onClose={() => { setShowPurchaseModal(false); setError(""); }}
          onSave={savePurchase}
          onQuickAddProduct={addProductQuick}
        />
      )}
      {purchaseDetail && (
        <PurchaseDetailModal purchase={purchaseDetail} onClose={() => setPurchaseDetail(null)} />
      )}
    </div>
  );
}

/* ---------------- Modales ---------------- */

function SupplierModal({
  supplier, busy, error, onClose, onSave,
}: {
  supplier: Supplier | null;
  busy: boolean;
  error: string;
  onClose: () => void;
  onSave: (form: Supplier) => void;
}) {
  const [name, setName] = useState(supplier?.name || "");
  const [doc, setDoc] = useState(supplier?.doc || "");
  const [phone, setPhone] = useState(supplier?.phone || "");
  const [email, setEmail] = useState(supplier?.email || "");
  const [contactName, setContactName] = useState(supplier?.contactName || "");
  const [notes, setNotes] = useState(supplier?.notes || "");

  return (
    <div className="modal-bg" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-head">
          <h3>{supplier ? "Editar proveedor" : "Nuevo proveedor"}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {error && <div className="error">{error}</div>}
          <label className="f"><span>Nombre / Razón social</span><input value={name} onChange={(e) => setName(e.target.value)} /></label>
          <label className="f"><span>RIF / Documento</span><input value={doc} onChange={(e) => setDoc(e.target.value)} /></label>
          <div className="row">
            <label className="f col"><span>Teléfono</span><input value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
            <label className="f col"><span>Correo</span><input value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          </div>
          <label className="f"><span>Persona de contacto</span><input value={contactName} onChange={(e) => setContactName(e.target.value)} /></label>
          <label className="f"><span>Notas</span><textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
        </div>
        <div className="modal-foot">
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn btn-acc" disabled={busy || !name.trim()}
            onClick={() => onSave({ id: supplier?.id || "", name, doc, phone, email, contactName, notes } as Supplier)}>
            {busy ? "Guardando…" : "Guardar proveedor"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PayableModal({
  payable, suppliers, busy, error, onClose, onSave,
}: {
  payable: Payable | null;
  suppliers: Supplier[];
  busy: boolean;
  error: string;
  onClose: () => void;
  onSave: (form: { id?: string; supplierId: string; description: string; amount: number; dueDate: string }) => void;
}) {
  const [supplierId, setSupplierId] = useState(payable?.supplierId || suppliers[0]?.id || "");
  const [description, setDescription] = useState(payable?.description || "");
  const [amount, setAmount] = useState(payable?.amount?.toString() || "");
  const [dueDate, setDueDate] = useState(payable ? payable.dueDate.slice(0, 10) : "");

  return (
    <div className="modal-bg" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-head">
          <h3>{payable ? "Editar cuenta por pagar" : "Nueva cuenta por pagar"}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {error && <div className="error">{error}</div>}
          <label className="f"><span>Proveedor</span>
            <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
          <label className="f"><span>Descripción (ej: Factura #00123, mercancía de julio)</span>
            <input value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
          <div className="row">
            <label className="f col"><span>Monto (Bs)</span><input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
            <label className="f col"><span>Fecha de vencimiento</span><input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></label>
          </div>
          <div className="msg">Recibirás una alerta push 3 días antes, el día del vencimiento y si se atrasa (con las alertas activadas).</div>
        </div>
        <div className="modal-foot">
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn btn-acc" disabled={busy || !supplierId || !description.trim() || !amount || !dueDate}
            onClick={() => onSave({ id: payable?.id, supplierId, description, amount: parseFloat(amount), dueDate })}>
            {busy ? "Guardando…" : "Guardar cuenta"}
          </button>
        </div>
      </div>
    </div>
  );
}

function MarkPaidModal({
  payable, onClose, onConfirm,
}: {
  payable: Payable;
  onClose: () => void;
  onConfirm: (id: string, paidAmount: number) => void;
}) {
  const [amount, setAmount] = useState(payable.amount.toString());
  return (
    <div className="modal-bg" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-head">
          <h3>Marcar como pagada</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="msg" style={{ marginBottom: 14 }}>
            {payable.supplier.name} — {payable.description}
          </div>
          <label className="f"><span>Monto pagado (Bs)</span>
            <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </label>
        </div>
        <div className="modal-foot">
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn btn-acc" onClick={() => onConfirm(payable.id, parseFloat(amount) || payable.amount)}>Confirmar pago</button>
        </div>
      </div>
    </div>
  );
}

type ItemRow = { productId: string; qty: string; unitCost: string };

function PurchaseModal({
  suppliers, branches, products, busy, error, onClose, onSave, onQuickAddProduct,
}: {
  suppliers: Supplier[];
  branches: Branch[];
  products: Product[];
  busy: boolean;
  error: string;
  onClose: () => void;
  onSave: (form: {
    supplierId: string; branchId: string; paymentStatus: "PAID" | "CREDIT";
    dueDate: string; notes: string; updateCost: boolean;
    items: { productId: string; qty: number; unitCost: number }[];
  }) => void;
  onQuickAddProduct: (form: { name: string; sku: string; unit: string; salePrice: string }) => Promise<Product>;
}) {
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id || "");
  const [branchId, setBranchId] = useState(branches[0]?.id || "");
  const [paymentStatus, setPaymentStatus] = useState<"PAID" | "CREDIT">("CREDIT");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [updateCost, setUpdateCost] = useState(true);
  const [items, setItems] = useState<ItemRow[]>([{ productId: products[0]?.id || "", qty: "1", unitCost: "" }]);
  const [quickAddRow, setQuickAddRow] = useState<number | null>(null);
  const [qaName, setQaName] = useState("");
  const [qaSku, setQaSku] = useState("");
  const [qaUnit, setQaUnit] = useState("unidad");
  const [qaPrice, setQaPrice] = useState("");
  const [qaBusy, setQaBusy] = useState(false);

  function updateItem(i: number, patch: Partial<ItemRow>) {
    setItems((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function addRow() {
    setItems((prev) => [...prev, { productId: products[0]?.id || "", qty: "1", unitCost: "" }]);
  }
  function removeRow(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }
  function onPickProduct(i: number, productId: string) {
    const p = products.find((x) => x.id === productId);
    updateItem(i, { productId, unitCost: p ? String(p.costPrice || "") : "" });
  }

  async function submitQuickAdd(i: number) {
    if (!qaName.trim()) return;
    setQaBusy(true);
    try {
      const p = await onQuickAddProduct({ name: qaName, sku: qaSku, unit: qaUnit, salePrice: qaPrice });
      updateItem(i, { productId: p.id, unitCost: qaPrice || "0" });
      setQuickAddRow(null);
      setQaName(""); setQaSku(""); setQaUnit("unidad"); setQaPrice("");
    } catch {
      // el error general se muestra a nivel de página si falla la compra;
      // aquí simplemente no cerramos el formulario para que el usuario reintente
    } finally {
      setQaBusy(false);
    }
  }

  const total = items.reduce((a, r) => a + (parseFloat(r.qty) || 0) * (parseFloat(r.unitCost) || 0), 0);
  const canSubmit =
    supplierId && branchId && items.length > 0 &&
    items.every((r) => r.productId && parseFloat(r.qty) > 0 && parseFloat(r.unitCost) >= 0) &&
    (paymentStatus === "PAID" || !!dueDate);

  return (
    <div className="modal-bg" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 640 }}>
        <div className="modal-head">
          <h3>Registrar compra a proveedor</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {error && <div className="error">{error}</div>}
          <div className="row">
            <label className="f col"><span>Proveedor</span>
              <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
            <label className="f col"><span>Sucursal que recibe</span>
              <select value={branchId} onChange={(e) => setBranchId(e.target.value)}>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </label>
          </div>

          <span style={{ display: "block", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.4, fontWeight: 700, color: "var(--ink-soft)", marginBottom: 8 }}>
            Productos comprados
          </span>
          {items.map((row, i) => (
            <div key={i} style={{ marginBottom: 10, border: "1px solid var(--line)", borderRadius: 8, padding: 10 }}>
              <div className="row" style={{ marginBottom: quickAddRow === i ? 8 : 0 }}>
                <div className="col" style={{ minWidth: 160 }}>
                  <select style={{ width: "100%", padding: "8px 10px", border: "1.5px solid var(--line)", borderRadius: 8 }}
                    value={row.productId} onChange={(e) => onPickProduct(i, e.target.value)}>
                    <option value="">Selecciona producto…</option>
                    {products.map((p) => <option key={p.id} value={p.id}>{p.name}{p.sku ? ` (${p.sku})` : ""}</option>)}
                  </select>
                  <button type="button" className="btn" style={{ marginTop: 6, padding: "4px 8px", fontSize: 11 }}
                    onClick={() => setQuickAddRow(quickAddRow === i ? null : i)}>
                    + Producto nuevo
                  </button>
                </div>
                <input type="number" min="1" placeholder="Cantidad" style={{ width: 90, padding: "8px 10px", border: "1.5px solid var(--line)", borderRadius: 8 }}
                  value={row.qty} onChange={(e) => updateItem(i, { qty: e.target.value })} />
                <input type="number" step="0.01" min="0" placeholder="Costo unit. (Bs)" style={{ width: 130, padding: "8px 10px", border: "1.5px solid var(--line)", borderRadius: 8 }}
                  value={row.unitCost} onChange={(e) => updateItem(i, { unitCost: e.target.value })} />
                <div style={{ width: 90, textAlign: "right", fontFamily: "var(--mono)", fontSize: 13, alignSelf: "center" }}>
                  {fmtBs((parseFloat(row.qty) || 0) * (parseFloat(row.unitCost) || 0))}
                </div>
                {items.length > 1 && (
                  <button type="button" className="btn btn-danger" style={{ padding: "6px 10px" }} onClick={() => removeRow(i)}>✕</button>
                )}
              </div>
              {quickAddRow === i && (
                <div style={{ background: "var(--primary-tint)", borderRadius: 8, padding: 10, marginTop: 4 }}>
                  <div className="row">
                    <input placeholder="Nombre del producto" style={{ flex: 2, padding: "7px 9px", border: "1.5px solid var(--line)", borderRadius: 6, fontSize: 12.5 }}
                      value={qaName} onChange={(e) => setQaName(e.target.value)} />
                    <input placeholder="SKU (opcional)" style={{ flex: 1, padding: "7px 9px", border: "1.5px solid var(--line)", borderRadius: 6, fontSize: 12.5 }}
                      value={qaSku} onChange={(e) => setQaSku(e.target.value)} />
                    <input placeholder="Precio de venta" type="number" style={{ flex: 1, padding: "7px 9px", border: "1.5px solid var(--line)", borderRadius: 6, fontSize: 12.5 }}
                      value={qaPrice} onChange={(e) => setQaPrice(e.target.value)} />
                    <button type="button" className="btn btn-primary2" style={{ padding: "6px 10px", fontSize: 12 }} disabled={qaBusy || !qaName.trim()}
                      onClick={() => submitQuickAdd(i)}>
                      {qaBusy ? "Creando…" : "Crear y usar"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          <button type="button" className="btn" style={{ marginBottom: 16 }} onClick={addRow}>+ Agregar otra línea</button>

          <label className="f"><input type="checkbox" checked={updateCost} onChange={(e) => setUpdateCost(e.target.checked)} /> Actualizar el costo del producto con este precio de compra</label>

          <div className="row">
            <label className="f col"><span>Forma de pago</span>
              <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value as "PAID" | "CREDIT")}>
                <option value="CREDIT">A crédito (fiado con el proveedor)</option>
                <option value="PAID">Pagado de contado</option>
              </select>
            </label>
            {paymentStatus === "CREDIT" && (
              <label className="f col"><span>Fecha de vencimiento del pago</span>
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </label>
            )}
          </div>
          <label className="f"><span>Notas (opcional)</span><textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></label>

          <div className="cart-total"><span>Total de la compra</span><span className="num">{fmtBs(total)}</span></div>
          {paymentStatus === "CREDIT" && (
            <div className="msg">Se creará automáticamente una cuenta por pagar a este proveedor, con alertas push 3 días antes, el día del vencimiento y si se atrasa.</div>
          )}
        </div>
        <div className="modal-foot">
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn btn-acc" disabled={busy || !canSubmit}
            onClick={() => onSave({
              supplierId, branchId, paymentStatus, dueDate, notes, updateCost,
              items: items.map((r) => ({ productId: r.productId, qty: parseFloat(r.qty), unitCost: parseFloat(r.unitCost) })),
            })}>
            {busy ? "Registrando…" : "Registrar compra"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PurchaseDetailModal({ purchase, onClose }: { purchase: Purchase; onClose: () => void }) {
  return (
    <div className="modal-bg" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-head">
          <h3>Compra a {purchase.supplier.name}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="row" style={{ fontSize: 12.5, color: "var(--ink-soft)", marginBottom: 12 }}>
            <div className="col">Fecha: <b style={{ color: "var(--ink)" }}>{fmtDate(purchase.date)}</b></div>
            <div className="col">Sucursal: <b style={{ color: "var(--ink)" }}>{purchase.branch.name}</b></div>
          </div>
          <table>
            <thead><tr><th>Producto</th><th className="right">Cant.</th><th className="right">Costo unit.</th><th className="right">Total</th></tr></thead>
            <tbody>
              {purchase.items.map((it) => (
                <tr key={it.id}>
                  <td>{it.name}</td>
                  <td className="right num">{it.qty}</td>
                  <td className="right num">{fmtBs(it.unitCost)}</td>
                  <td className="right num">{fmtBs(it.qty * it.unitCost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="cart-total"><span>Total</span><span className="num">{fmtBs(purchase.total)}</span></div>
          {purchase.notes && <div className="msg">{purchase.notes}</div>}
          {purchase.payable && (
            <div className="msg" style={{ marginTop: 10 }}>
              Cuenta por pagar vinculada: vence {fmtDate(purchase.payable.dueDate)} —{" "}
              {purchase.payable.status === "PAID" ? "ya pagada" : purchase.payable.status === "OVERDUE" ? "vencida" : "pendiente"}
            </div>
          )}
        </div>
        <div className="modal-foot">
          <button className="btn" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}
