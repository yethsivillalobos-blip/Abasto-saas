import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMembership, requireAdmin } from "@/lib/authz";

export async function GET(
  _req: Request,
  { params }: { params: { orgId: string } }
) {
  const ctx = await requireMembership(params.orgId);
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const payments = await prisma.subscriptionPayment.findMany({
    where: { organizationId: params.orgId },
    orderBy: { reportedAt: "desc" },
  });
  return NextResponse.json(payments);
}

export async function POST(
  req: Request,
  { params }: { params: { orgId: string } }
) {
  const ctx = await requireAdmin(params.orgId);
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const amount = Number(body.amount);
  const method = String(body.method || "");
  const reference = body.reference ? String(body.reference).trim() : null;
  const notes = body.notes ? String(body.notes).trim() : null;

  if (!amount || amount <= 0) return NextResponse.json({ error: "El monto debe ser mayor a 0" }, { status: 400 });
  if (!["PAGO_MOVIL", "ZELLE", "BINANCE", "OTRO"].includes(method)) {
    return NextResponse.json({ error: "Selecciona un método de pago válido" }, { status: 400 });
  }

  const payment = await prisma.subscriptionPayment.create({
    data: {
      organizationId: params.orgId,
      amount,
      method: method as "PAGO_MOVIL" | "ZELLE" | "BINANCE" | "OTRO",
      reference,
      notes,
    },
  });
  return NextResponse.json(payment);
}
