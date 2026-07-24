import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getSubscriptionInfo } from "@/lib/subscription";
import BillingClient from "./BillingClient";

export default async function BillingPage({
  params,
}: {
  params: { orgId: string };
}) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/login");

  const membership = await prisma.membership.findUnique({
    where: { userId_organizationId: { userId, organizationId: params.orgId } },
    include: { organization: true },
  });
  if (!membership || !membership.active) redirect("/select-org");

  const payments = await prisma.subscriptionPayment.findMany({
    where: { organizationId: params.orgId },
    orderBy: { reportedAt: "desc" },
  });

  const sub = getSubscriptionInfo(membership.organization);

  return (
    <BillingClient
      orgId={params.orgId}
      orgName={membership.organization.name}
      role={membership.role}
      subscription={sub}
      planPriceUsd={process.env.PLAN_PRICE_USD || "10"}
      paymentInfo={{
        pagoMovil: process.env.PAYMENT_INFO_PAGOMOVIL || "Configura PAYMENT_INFO_PAGOMOVIL en tus variables de entorno",
        zelle: process.env.PAYMENT_INFO_ZELLE || "Configura PAYMENT_INFO_ZELLE en tus variables de entorno",
        binance: process.env.PAYMENT_INFO_BINANCE || "Configura PAYMENT_INFO_BINANCE en tus variables de entorno",
      }}
      initialPayments={JSON.parse(JSON.stringify(payments))}
    />
  );
}
