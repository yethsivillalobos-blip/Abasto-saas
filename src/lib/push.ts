import webpush from "web-push";

let configured = false;

export function getWebPush() {
  if (!configured) {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT || "mailto:soporte@example.com";
    if (publicKey && privateKey) {
      webpush.setVapidDetails(subject, publicKey, privateKey);
      configured = true;
    }
  }
  return webpush;
}

export async function sendPushToUser(userId: string, payload: { title: string; body: string; url?: string }) {
  const { prisma } = await import("@/lib/prisma");
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  const wp = getWebPush();
  const results = await Promise.allSettled(
    subs.map((s) =>
      wp.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(payload)
      )
    )
  );
  // Limpia suscripciones que ya no son válidas (410 Gone / 404)
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status === "rejected") {
      const statusCode = (r.reason && (r.reason.statusCode || r.reason.status)) || 0;
      if (statusCode === 404 || statusCode === 410) {
        await prisma.pushSubscription.delete({ where: { id: subs[i].id } }).catch(() => {});
      }
    }
  }
}
