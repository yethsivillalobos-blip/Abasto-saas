import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const memberships = await prisma.membership.findMany({
    where: { userId, active: true },
    include: { organization: true },
  });
  return NextResponse.json(
    memberships.map((m) => ({ ...m.organization, role: m.role }))
  );
}

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await req.json();
  const name = String(body.name || "").trim();
  const businessType = String(body.businessType || "General").trim();
  if (!name) return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });

  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 30);

  const org = await prisma.organization.create({
    data: {
      name,
      businessType,
      trialEndsAt,
      branches: { create: [{ name: "Sucursal Principal" }] },
      payrollParams: { create: {} },
      memberships: { create: [{ userId, role: "ADMIN" }] },
    },
  });
  return NextResponse.json(org);
}
