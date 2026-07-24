import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function requireMembership(organizationId: string) {
  const session = await auth();
  if (!session?.user?.id) return null;
  const membership = await prisma.membership.findUnique({
    where: { userId_organizationId: { userId: session.user.id, organizationId } },
  });
  if (!membership || !membership.active) return null;
  return { session, membership };
}

export async function requireAdmin(organizationId: string) {
  const ctx = await requireMembership(organizationId);
  if (!ctx || ctx.membership.role !== "ADMIN") return null;
  return ctx;
}

/**
 * Acceso al panel de dueño de la plataforma (para aprobar pagos manuales).
 * No usa un rol en la base de datos: compara el correo de la sesión contra
 * la lista SUPERADMIN_EMAILS definida en las variables de entorno, separada por comas.
 */
export async function requireSuperAdmin() {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  const allowed = (process.env.SUPERADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (!email || !allowed.includes(email)) return null;
  return { session };
}
