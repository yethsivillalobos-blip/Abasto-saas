import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import CreateOrgForm from "./CreateOrgForm";

export default async function SelectOrgPage() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/login");

  const memberships = await prisma.membership.findMany({
    where: { userId, active: true },
    include: { organization: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="page-wrap">
      <h1>Tus negocios</h1>
      {memberships.length ? (
        <div className="org-grid">
          {memberships.map((m) => (
            <a key={m.organizationId} className="org-card" href={`/${m.organizationId}/dashboard`}>
              <div className="org-name">{m.organization.name}</div>
              <div className="org-type">{m.organization.businessType}</div>
              <div className="org-role">{m.role === "ADMIN" ? "Administrador" : "Cajero"}</div>
            </a>
          ))}
        </div>
      ) : (
        <p style={{ color: "var(--ink-soft)", marginBottom: 24 }}>
          Aún no perteneces a ningún negocio. Crea el primero abajo.
        </p>
      )}
      <CreateOrgForm />
    </div>
  );
}
