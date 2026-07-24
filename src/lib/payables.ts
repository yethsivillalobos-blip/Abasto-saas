import { prisma } from "@/lib/prisma";
import { sendPushToOrgAdmins } from "@/lib/pushSend";

export async function createPayableWithNotification(params: {
  organizationId: string;
  supplierId: string;
  description: string;
  amount: number;
  dueDate: Date;
}) {
  const { organizationId, supplierId, description, amount, dueDate } = params;

  const supplier = await prisma.supplier.findFirst({
    where: { id: supplierId, organizationId },
  });
  if (!supplier) throw new Error("Proveedor no encontrado");

  const payable = await prisma.payable.create({
    data: { organizationId, supplierId, description, amount, dueDate },
    include: { supplier: true },
  });

  const now = new Date();
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysLeft = Math.ceil((dueDate.getTime() - now.getTime()) / msPerDay);
  if (daysLeft <= 1) {
    await sendPushToOrgAdmins(organizationId, {
      title: "💰 Cuenta por pagar registrada",
      body: `${supplier.name}: ${description} — vence ${dueDate.toLocaleDateString("es-VE")}`,
      url: `/${organizationId}/proveedores`,
    }).catch(() => {});
  }

  return payable;
}
