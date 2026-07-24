import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const sub = await req.json();
  const endpoint = String(sub.endpoint || "");
  const p256dh = sub?.keys?.p256dh ? String(sub.keys.p256dh) : "";
  const authKey = sub?.keys?.auth ? String(sub.keys.auth) : "";
  if (!endpoint || !p256dh || !authKey) {
    return NextResponse.json({ error: "Suscripción inválida" }, { status: 400 });
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: { p256dh, auth: authKey, userId },
    create: { endpoint, p256dh, auth: authKey, userId },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { endpoint } = await req.json();
  if (endpoint) {
    await prisma.pushSubscription.deleteMany({ where: { endpoint, userId } });
  }
  return NextResponse.json({ ok: true });
}
