"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const TABS = [
  { href: "dashboard", label: "Inicio", adminOnly: true },
  { href: "pos", label: "Punto de Venta", adminOnly: false },
  { href: "inventario", label: "Inventario", adminOnly: true },
  { href: "proveedores", label: "Proveedores", adminOnly: true },
];

export default function Sidebar({
  orgName,
  businessType,
  role,
  userName,
  orgId,
  subscriptionLabel,
  subscriptionUrgent,
}: {
  orgName: string;
  businessType: string;
  role: string;
  userName: string;
  orgId: string;
  subscriptionLabel?: string | null;
  subscriptionUrgent?: boolean;
}) {
  const pathname = usePathname();
  return (
    <aside className="sidebar">
      <div className="sb-brand">{orgName}</div>
      <div className="sb-type">{businessType}</div>
      <nav>
        {TABS.filter((t) => !t.adminOnly || role === "ADMIN").map((t) => (
          <Link
            key={t.href}
            href={`/${orgId}/${t.href}`}
            className={pathname?.includes(`/${t.href}`) ? "active" : ""}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {subscriptionLabel && role === "ADMIN" && (
        <div style={{ margin: "0 16px 12px", padding: "10px 12px", borderRadius: 12, fontSize: 11.5, lineHeight: 1.5,
          background: subscriptionUrgent ? "rgba(178,75,62,0.20)" : "rgba(255,255,255,0.06)",
          border: `1px solid ${subscriptionUrgent ? "rgba(178,75,62,0.45)" : "rgba(255,255,255,0.10)"}`,
          color: subscriptionUrgent ? "#F0C4BC" : "#A7A398" }}>
          {subscriptionLabel}
          <Link href={`/billing/${orgId}`} style={{ display: "block", marginTop: 4, color: "#fff", fontWeight: 700, textDecoration: "underline" }}>
            {subscriptionUrgent ? "Renovar ahora →" : "Ver facturación →"}
          </Link>
        </div>
      )}
      <div className="sb-user">
        <div><b>{userName}</b></div>
        <div className="role">{role === "ADMIN" ? "Administrador" : "Cajero"}</div>
        <Link className="switch" href="/select-org">Cambiar de negocio</Link>
        <button onClick={() => signOut({ callbackUrl: "/login" })}>Cerrar sesión</button>
      </div>
    </aside>
  );
}
