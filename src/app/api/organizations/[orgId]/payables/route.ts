import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMembership, requireAdmin } from "@/lib/authz";
import { createPayableWithNotification } from "@/lib/payables";

export async function GET(
  req: Request,
  { params }: { params: { orgId: string } }
) {
  const ctx = await requireMembership(params.orgId);
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status"); // PENDING | PAID | OVERDUE | null(=todas)

  const payables = await prisma.payable.findMany({
    where: {
      organizationId: params.orgId,
      ...(status ? { status: status as "PENDING" | "PAID" | "OVERDUE" } : {}),
    },
    include: { supplier: true },
    orderBy: { dueDate: "asc" },
  });
  return NextResponse.json(payables);
}

export async function POST(
  req: Request,
  { params }: { params: { orgId: string } }
) {
  const ctx = await requireAdmin(params.orgId);
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const supplierId = String(body.supplierId || "");
  const description = String(body.description || "").trim();
  const amount = Number(body.amount);
  const dueDate = body.dueDate ? new Date(body.dueDate) : null;

  if (!supplierId) return NextResponse.json({ error: "Selecciona un proveedor" }, { status: 400 });
  if (!description) return NextResponse.json({ error: "La descripción es obligatoria" }, { status: 400 });
  if (!amount || amount <= 0) return NextResponse.json({ error: "El monto debe ser mayor a 0" }, { status: 400 });
  if (!dueDate || isNaN(dueDate.getTime())) return NextResponse.json({ error: "Fecha de vencimiento inválida" }, { status: 400 });

  try {
    const payable = await createPayableWithNotification({
      organizationId: params.orgId,
      supplierId,
      description,
      amount,
      dueDate,
    });
    return NextResponse.json(payable);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message || "Proveedor no encontrado" }, { status: 404 });
  }
}
