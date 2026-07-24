import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";

export async function PATCH(
  req: Request,
  { params }: { params: { orgId: string; payableId: string } }
) {
  const ctx = await requireAdmin(params.orgId);
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const payable = await prisma.payable.findFirst({
    where: { id: params.payableId, organizationId: params.orgId },
  });
  if (!payable) return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });

  const body = await req.json();

  // Acción específica: marcar como pagada
  if (body.action === "markPaid") {
    const paidAmount = Number(body.paidAmount ?? payable.amount);
    const updated = await prisma.payable.update({
      where: { id: params.payableId },
      data: {
        status: "PAID",
        paidDate: new Date(),
        paidAmount: paidAmount > 0 ? paidAmount : payable.amount,
      },
      include: { supplier: true },
    });
    return NextResponse.json(updated);
  }

  // Acción específica: reabrir (deshacer pago)
  if (body.action === "reopen") {
    const updated = await prisma.payable.update({
      where: { id: params.payableId },
      data: { status: "PENDING", paidDate: null, paidAmount: null },
      include: { supplier: true },
    });
    return NextResponse.json(updated);
  }

  // Edición general de campos
  const data: Record<string, unknown> = {};
  if (body.description !== undefined) data.description = String(body.description).trim();
  if (body.amount !== undefined) data.amount = Number(body.amount);
  if (body.dueDate !== undefined) data.dueDate = new Date(body.dueDate);
  if (body.supplierId !== undefined) data.supplierId = String(body.supplierId);

  const updated = await prisma.payable.update({
    where: { id: params.payableId },
    data,
    include: { supplier: true },
  });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: { orgId: string; payableId: string } }
) {
  const ctx = await requireAdmin(params.orgId);
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const payable = await prisma.payable.findFirst({
    where: { id: params.payableId, organizationId: params.orgId },
  });
  if (!payable) return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });

  await prisma.payable.delete({ where: { id: params.payableId } });
  return NextResponse.json({ ok: true });
}
