import { requireSuperAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { getSubscriptionInfo } from "@/lib/subscription";
import AdminClient from "./AdminClient";

export default async function AdminPage() {
  const ctx = await requireSuperAdmin();
  if (!ctx) {
    return (
      <div className="page-wrap">
        <h1>Acceso restringido</h1>
        <p style={{ color: "var(--ink-soft)" }}>
          Esta pantalla es solo para el dueño de la plataforma. Si crees que deberías tener acceso, revisa la
          variable de entorno <code>SUPERADMIN_EMAILS</code> en Vercel.
        </p>
      </div>
    );
  }

  const [orgs, payments] = await Promise.all([
    prisma.organization.findMany({
      include: {
        memberships: { where: { role: "ADMIN" }, include: { user: true }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.subscriptionPayment.findMany({
      include: { organization: true },
      orderBy: { reportedAt: "desc" },
      take: 200,
    }),
  ]);

  const orgsWithStatus = orgs.map((o) => ({
    id: o.id,
    name: o.name,
    businessType: o.businessType,
    createdAt: o.createdAt.toISOString(),
    adminEmail: o.memberships[0]?.user?.email || "—",
    adminName: o.memberships[0]?.user?.name || "—",
    subscription: getSubscriptionInfo(o),
  }));

  return (
    <AdminClient
      initialOrgs={JSON.parse(JSON.stringify(orgsWithStatus))}
      initialPayments={JSON.parse(JSON.stringify(payments))}
    />
  );
}
