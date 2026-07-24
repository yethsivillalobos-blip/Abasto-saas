import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMembership, requireAdmin } from "@/lib/authz";

export async function GET(
  _req: Request,
  { params }: { params: { orgId: string } }
) {
  const ctx = await requireMembership(params.orgId);
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const suppliers = await prisma.supplier.findMany({
    where: { organizationId: params.orgId },
    include: {
      payables: {
        where: { status: { not: "PAID" } },
        orderBy: { dueDate: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(suppliers);
}

export async function POST(
  req: Request,
  { params }: { params: { orgId: string } }
) {
  const ctx = await requireAdmin(params.orgId);
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const name = String(body.name || "").trim();
  if (!name) return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });

  const supplier = await prisma.supplier.create({
    data: {
      organizationId: params.orgId,
      name,
      doc: body.doc ? String(body.doc).trim() : null,
      phone: body.phone ? String(body.phone).trim() : null,
      email: body.email ? String(body.email).trim() : null,
      contactName: body.contactName ? String(body.contactName).trim() : null,
      notes: body.notes ? String(body.notes).trim() : null,
    },
  });
  return NextResponse.json(supplier);
}
