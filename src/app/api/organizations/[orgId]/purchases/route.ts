import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMembership, requireAdmin } from "@/lib/authz";
import { createPayableWithNotification } from "@/lib/payables";

export async function GET(
  _req: Request,
  { params }: { params: { orgId: string } }
) {
  const ctx = await requireMembership(params.orgId);
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const purchases = await prisma.purchase.findMany({
    where: { organizationId: params.orgId },
    include: { supplier: true, branch: true, items: true, payable: true },
    orderBy: { date: "desc" },
    take: 100,
  });
  return NextResponse.json(purchases);
}

type ItemInput = { productId: string; qty: number; unitCost: number };

export async function POST(
  req: Request,
  { params }: { params: { orgId: string } }
) {
  const ctx = await requireAdmin(params.orgId);
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const supplierId = String(body.supplierId || "");
  const branchId = String(body.branchId || "");
  const paymentStatus = body.paymentStatus === "CREDIT" ? "CREDIT" : "PAID";
  const dueDate = body.dueDate ? new Date(body.dueDate) : null;
  const notes = body.notes ? String(body.notes).trim() : null;
  const updateCost = body.updateCost !== false;
  const items: ItemInput[] = Array.isArray(body.items) ? body.items : [];

  if (!supplierId) return NextResponse.json({ error: "Selecciona un proveedor" }, { status: 400 });
  if (!branchId) return NextResponse.json({ error: "Selecciona una sucursal" }, { status: 400 });
  if (!items.length) return NextResponse.json({ error: "Agrega al menos un producto" }, { status: 400 });
  for (const it of items) {
    if (!it.productId || !it.qty || it.qty <= 0) {
      return NextResponse.json({ error: "Cada línea necesita un producto y una cantidad válida" }, { status: 400 });
    }
    if (it.unitCost === undefined || it.unitCost === null || it.unitCost < 0) {
      return NextResponse.json({ error: "Cada línea necesita un costo unitario válido" }, { status: 400 });
    }
  }
  if (paymentStatus === "CREDIT" && (!dueDate || isNaN(dueDate.getTime()))) {
    return NextResponse.json({ error: "Indica la fecha de vencimiento del pago a crédito" }, { status: 400 });
  }

  const [supplier, branch, products] = await Promise.all([
    prisma.supplier.findFirst({ where: { id: supplierId, organizationId: params.orgId } }),
    prisma.branch.findFirst({ where: { id: branchId, organizationId: params.orgId } }),
    prisma.product.findMany({ where: { id: { in: items.map((i) => i.productId) }, organizationId: params.orgId } }),
  ]);
  if (!supplier) return NextResponse.json({ error: "Proveedor no encontrado" }, { status: 404 });
  if (!branch) return NextResponse.json({ error: "Sucursal no encontrada" }, { status: 404 });
  if (products.length !== new Set(items.map((i) => i.productId)).size) {
    return NextResponse.json({ error: "Algún producto no pertenece a este negocio" }, { status: 404 });
  }
  const productMap = new Map(products.map((p) => [p.id, p]));

  const total = items.reduce((a, i) => a + i.qty * i.unitCost, 0);

  const purchase = await prisma.$transaction(async (tx) => {
    const created = await tx.purchase.create({
      data: {
        organizationId: params.orgId,
        supplierId,
        branchId,
        total,
        paymentStatus,
        notes,
        items: {
          create: items.map((i) => ({
            productId: i.productId,
            name: productMap.get(i.productId)!.name,
            qty: i.qty,
            unitCost: i.unitCost,
          })),
        },
      },
      include: { items: true },
    });

    for (const it of items) {
      await tx.stock.upsert({
        where: { productId_branchId: { productId: it.productId, branchId } },
        update: { quantity: { increment: it.qty } },
        create: { productId: it.productId, branchId, quantity: it.qty },
      });
      if (updateCost) {
        await tx.product.update({ where: { id: it.productId }, data: { costPrice: it.unitCost } });
      }
    }

    return created;
  });

  if (paymentStatus === "CREDIT" && dueDate) {
    const payable = await createPayableWithNotification({
      organizationId: params.orgId,
      supplierId,
      description: `Compra #${purchase.id.slice(-6).toUpperCase()} — ${items.length} producto(s)`,
      amount: total,
      dueDate,
    });
    await prisma.purchase.update({ where: { id: purchase.id }, data: { payableId: payable.id } });
  }

  const full = await prisma.purchase.findUnique({
    where: { id: purchase.id },
    include: { supplier: true, branch: true, items: true, payable: true },
  });
  return NextResponse.json(full);
}
