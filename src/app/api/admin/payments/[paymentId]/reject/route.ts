import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/authz";

export async function POST(
  req: Request,
  { params }: { params: { paymentId: string } }
) {
  const ctx = await requireSuperAdmin();
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const payment = await prisma.subscriptionPayment.findUnique({ where: { id: params.paymentId } });
  if (!payment) return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 });
  if (payment.status !== "PENDING") return NextResponse.json({ error: "Este pago ya fue revisado" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const notes = body?.notes ? String(body.notes).trim() : payment.notes;

  const updated = await prisma.subscriptionPayment.update({
    where: { id: params.paymentId },
    data: { status: "REJECTED", reviewedAt: new Date(), reviewedBy: ctx.session.user?.email || "admin", notes },
  });
  return NextResponse.json(updated);
}
