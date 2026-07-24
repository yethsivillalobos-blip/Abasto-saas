import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMembership, requireAdmin } from "@/lib/authz";

export async function GET(
  _req: Request,
  { params }: { params: { orgId: string } }
) {
  const ctx = await requireMembership(params.orgId);
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const products = await prisma.product.findMany({
    where: { organizationId: params.orgId },
    include: { stocks: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(products);
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

  const product = await prisma.product.create({
    data: {
      organizationId: params.orgId,
      name,
      sku: body.sku ? String(body.sku).trim() : null,
      category: body.category ? String(body.category).trim() : null,
      unit: body.unit ? String(body.unit).trim() : "unidad",
      costPrice: Number(body.costPrice) || 0,
      salePrice: Number(body.salePrice) || 0,
      minStock: Number(body.minStock) || 0,
      ivaExempt: !!body.ivaExempt,
    },
    include: { stocks: true },
  });
  return NextResponse.json(product);
}
