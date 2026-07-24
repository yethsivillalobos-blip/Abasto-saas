import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMembership } from "@/lib/authz";

export async function GET(
  _req: Request,
  { params }: { params: { orgId: string } }
) {
  const ctx = await requireMembership(params.orgId);
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const branches = await prisma.branch.findMany({
    where: { organizationId: params.orgId },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(branches);
}
