import { prisma } from "@/lib/prisma";
import { requireMembership } from "@/lib/authz";
import { redirect } from "next/navigation";
import ProveedoresClient from "./ProveedoresClient";

export default async function ProveedoresPage({
  params,
}: {
  params: { orgId: string };
}) {
  const ctx = await requireMembership(params.orgId);
  if (!ctx) redirect("/select-org");
  if (ctx.membership.role !== "ADMIN") redirect(`/${params.orgId}/pos`);

  const [suppliers, payables, products, branches, purchases] = await Promise.all([
    prisma.supplier.findMany({
      where: { organizationId: params.orgId },
      orderBy: { name: "asc" },
    }),
    prisma.payable.findMany({
      where: { organizationId: params.orgId },
      include: { supplier: true },
      orderBy: { dueDate: "asc" },
    }),
    prisma.product.findMany({
      where: { organizationId: params.orgId },
      include: { stocks: true },
      orderBy: { name: "asc" },
    }),
    prisma.branch.findMany({
      where: { organizationId: params.orgId },
      orderBy: { name: "asc" },
    }),
    prisma.purchase.findMany({
      where: { organizationId: params.orgId },
      include: { supplier: true, branch: true, items: true, payable: true },
      orderBy: { date: "desc" },
      take: 50,
    }),
  ]);

  return (
    <ProveedoresClient
      orgId={params.orgId}
      initialSuppliers={JSON.parse(JSON.stringify(suppliers))}
      initialPayables={JSON.parse(JSON.stringify(payables))}
      initialProducts={JSON.parse(JSON.stringify(products))}
      initialBranches={JSON.parse(JSON.stringify(branches))}
      initialPurchases={JSON.parse(JSON.stringify(purchases))}
    />
  );
}
