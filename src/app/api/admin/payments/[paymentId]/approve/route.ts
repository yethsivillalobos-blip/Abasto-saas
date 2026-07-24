import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/authz";

export async function POST(
  _req: Request,
  { params }: { params: { paymentId: string } }
) {
  const ctx = await requireSuperAdmin();
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const payment = await prisma.subscriptionPayment.findUnique({
    where: { id: params.paymentId },
    include: { organization: true },
  });
  if (!payment) return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 });
  if (payment.status !== "PENDING") return NextResponse.json({ error: "Este pago ya fue revisado" }, { status: 400 });

  const now = new Date();
  const currentPaidUntil = payment.organization.paidUntil;
  // Si aún tiene plan vigente, la renovación se suma a partir de esa fecha (no se pierden días pagados).
  // Si ya venció (o nunca pagó), se cuenta a partir de hoy.
  const base = currentPaidUntil && currentPaidUntil.getTime() > now.getTime() ? currentPaidUntil : now;
  const newPaidUntil = new Date(base);
  newPaidUntil.setDate(newPaidUntil.getDate() + 30);

  const [updatedPayment] = await prisma.$transaction([
    prisma.subscriptionPayment.update({
      where: { id: params.paymentId },
      data: { status: "APPROVED", reviewedAt: now, reviewedBy: ctx.session.user?.email || "admin" },
    }),
    prisma.organization.update({
      where: { id: payment.organizationId },
      data: { subscriptionStatus: "ACTIVE", paidUntil: newPaidUntil },
    }),
  ]);

  return NextResponse.json({ ok: true, payment: updatedPayment, paidUntil: newPaidUntil });
}
