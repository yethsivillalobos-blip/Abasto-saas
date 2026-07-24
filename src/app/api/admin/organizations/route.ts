import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/authz";

export async function GET() {
  const ctx = await requireSuperAdmin();
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const orgs = await prisma.organization.findMany({
    include: {
      subscriptionPayments: { where: { status: "PENDING" } },
      memberships: { where: { role: "ADMIN" }, include: { user: true }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(orgs);
}
