import { prisma } from "@/lib/prisma";
import webpush from "@/lib/webpush";

type PushPayload = { title: string; body: string; url?: string };

/**
 * Envía una notificación push a todos los administradores de una
 * organización. Si una suscripción ya no es válida (410/404), la borra.
 */
export async function sendPushToOrgAdmins(organizationId: string, payload: PushPayload) {
  const admins = await prisma.membership.findMany({
    where: { organizationId, role: "ADMIN", active: true },
    select: { userId: true },
  });
  const userIds = admins.map((a) => a.userId);
  if (!userIds.length) return;

  const subs = await prisma.pushSubscription.findMany({
    where: { userId: { in: userIds } },
  });

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(payload)
        );
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        }
      }
    })
  );
}
