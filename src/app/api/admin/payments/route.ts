import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/authz";

export async function GET(req: Request) {
  const ctx = await requireSuperAdmin();
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const payments = await prisma.subscriptionPayment.findMany({
    where: status ? { status: status as "PENDING" | "APPROVED" | "REJECTED" } : {},
    include: { organization: true },
    orderBy: { reportedAt: "desc" },
  });
  return NextResponse.json(payments);
}
