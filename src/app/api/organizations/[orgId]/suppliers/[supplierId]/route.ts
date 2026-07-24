import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";

export async function PATCH(
  req: Request,
  { params }: { params: { orgId: string; supplierId: string } }
) {
  const ctx = await requireAdmin(params.orgId);
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const supplier = await prisma.supplier.findFirst({
    where: { id: params.supplierId, organizationId: params.orgId },
  });
  if (!supplier) return NextResponse.json({ error: "Proveedor no encontrado" }, { status: 404 });

  const body = await req.json();
  const updated = await prisma.supplier.update({
    where: { id: params.supplierId },
    data: {
      name: body.name !== undefined ? String(body.name).trim() : undefined,
      doc: body.doc !== undefined ? String(body.doc).trim() : undefined,
      phone: body.phone !== undefined ? String(body.phone).trim() : undefined,
      email: body.email !== undefined ? String(body.email).trim() : undefined,
      contactName: body.contactName !== undefined ? String(body.contactName).trim() : undefined,
      notes: body.notes !== undefined ? String(body.notes).trim() : undefined,
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: { orgId: string; supplierId: string } }
) {
  const ctx = await requireAdmin(params.orgId);
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const supplier = await prisma.supplier.findFirst({
    where: { id: params.supplierId, organizationId: params.orgId },
  });
  if (!supplier) return NextResponse.json({ error: "Proveedor no encontrado" }, { status: 404 });

  await prisma.supplier.delete({ where: { id: params.supplierId } });
  return NextResponse.json({ ok: true });
}
