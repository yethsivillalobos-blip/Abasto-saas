import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const body = await req.json();
  const email = String(body.email || "").toLowerCase().trim();
  const name = String(body.name || "").trim();
  const password = String(body.password || "");

  if (!email || !password || password.length < 6) {
    return NextResponse.json(
      { error: "Correo y contraseña (mínimo 6 caracteres) son obligatorios." },
      { status: 400 }
    );
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Ya existe una cuenta con ese correo." }, { status: 400 });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { email, name, passwordHash } });
  return NextResponse.json({ id: user.id, email: user.email });
}
