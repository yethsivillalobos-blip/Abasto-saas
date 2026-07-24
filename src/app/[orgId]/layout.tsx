import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import Sidebar from "./Sidebar";
import { getSubscriptionInfo } from "@/lib/subscription";

export default async function OrgLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { orgId: string };
}) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/login");

  const membership = await prisma.membership.findUnique({
    where: { userId_organizationId: { userId, organizationId: params.orgId } },
    include: { organization: true },
  });
  if (!membership || !membership.active) redirect("/select-org");

  const sub = getSubscriptionInfo(membership.organization);

  if (!sub.accessGranted) {
    return (
      <div className="shell" style={{ alignItems: "center", justifyContent: "center" }}>
        <div className="card" style={{ maxWidth: 460, textAlign: "center" }}>
          <div style={{ fontSize: 34, marginBottom: 8 }}>🔒</div>
          <h3 style={{ marginBottom: 6 }}>{membership.organization.name}</h3>
          <p style={{ fontSize: 13.5, color: "var(--ink-soft)", lineHeight: 1.6, marginBottom: 18 }}>
            {sub.label}
          </p>
          {membership.role === "ADMIN" ? (
            <Link href={`/billing/${params.orgId}`} className="btn btn-primary2" style={{ display: "inline-block" }}>
              Reportar mi pago
            </Link>
          ) : (
            <p style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>
              Pídele al administrador de este negocio que reporte el pago para reactivar el acceso.
            </p>
          )}
          <div style={{ marginTop: 18 }}>
            <Link href="/select-org" style={{ fontSize: 12.5, color: "var(--primary)", fontWeight: 700, textDecoration: "underline" }}>
              ← Volver a mis negocios
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="shell">
      <Sidebar
        orgName={membership.organization.name}
        businessType={membership.organization.businessType}
        role={membership.role}
        userName={session?.user?.name || "Usuario"}
        orgId={params.orgId}
        subscriptionLabel={sub.phase === "blocked" ? null : sub.label}
        subscriptionUrgent={sub.daysLeft <= 5}
      />
      <main className="main-wrap">{children}</main>
    </div>
  );
}
