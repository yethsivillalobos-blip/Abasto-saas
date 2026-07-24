import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPushToOrgAdmins } from "@/lib/pushSend";

export const dynamic = "force-dynamic";

/**
 * Se ejecuta una vez al día (ver vercel.json → crons).
 * Revisa todas las cuentas por pagar PENDIENTES de todas las organizaciones y:
 *  - Envía un aviso 3 días antes del vencimiento (una sola vez).
 *  - Envía un aviso el día que vence (una sola vez).
 *  - Marca como OVERDUE y avisa si ya venció y sigue sin pagarse (una sola vez).
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msPerDay = 1000 * 60 * 60 * 24;

  const pending = await prisma.payable.findMany({
    where: { status: { in: ["PENDING", "OVERDUE"] } },
    include: { supplier: true },
  });

  let notified3d = 0, notifiedDue = 0, notifiedLate = 0, markedOverdue = 0;

  for (const p of pending) {
    const due = new Date(p.dueDate);
    const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
    const daysLeft = Math.round((dueDay.getTime() - startOfToday.getTime()) / msPerDay);
    const fecha = due.toLocaleDateString("es-VE");

    if (daysLeft === 3 && !p.notified3d) {
      await sendPushToOrgAdmins(p.organizationId, {
        title: "⏰ Pago próximo a vencer",
        body: `${p.supplier.name}: ${p.description} (${p.amount.toLocaleString("es-VE")} Bs) vence en 3 días — ${fecha}`,
        url: `/${p.organizationId}/proveedores`,
      }).catch(() => {});
      await prisma.payable.update({ where: { id: p.id }, data: { notified3d: true } });
      notified3d++;
    }

    if (daysLeft === 0 && !p.notifiedDue) {
      await sendPushToOrgAdmins(p.organizationId, {
        title: "🔔 Pago vence hoy",
        body: `${p.supplier.name}: ${p.description} (${p.amount.toLocaleString("es-VE")} Bs) vence hoy`,
        url: `/${p.organizationId}/proveedores`,
      }).catch(() => {});
      await prisma.payable.update({ where: { id: p.id }, data: { notifiedDue: true } });
      notifiedDue++;
    }

    if (daysLeft < 0) {
      if (p.status !== "OVERDUE") {
        await prisma.payable.update({ where: { id: p.id }, data: { status: "OVERDUE" } });
        markedOverdue++;
      }
      if (!p.notifiedLate) {
        await sendPushToOrgAdmins(p.organizationId, {
          title: "🚨 Pago atrasado",
          body: `${p.supplier.name}: ${p.description} (${p.amount.toLocaleString("es-VE")} Bs) venció el ${fecha}`,
          url: `/${p.organizationId}/proveedores`,
        }).catch(() => {});
        await prisma.payable.update({ where: { id: p.id }, data: { notifiedLate: true } });
        notifiedLate++;
      }
    }
  }

  return NextResponse.json({ ok: true, checked: pending.length, notified3d, notifiedDue, notifiedLate, markedOverdue });
}
