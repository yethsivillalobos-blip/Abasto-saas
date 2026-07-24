export type SubscriptionPhase = "trial" | "active" | "blocked";

export type SubscriptionInfo = {
  phase: SubscriptionPhase;
  daysLeft: number;
  label: string;
  accessGranted: boolean;
};

/**
 * Calcula el estado de acceso de una organización según su prueba gratuita
 * o su último pago manual aprobado.
 */
export function getSubscriptionInfo(org: {
  subscriptionStatus: string;
  trialEndsAt: Date | string;
  paidUntil: Date | string | null;
}): SubscriptionInfo {
  const now = new Date();
  const trialEndsAt = new Date(org.trialEndsAt);
  const paidUntil = org.paidUntil ? new Date(org.paidUntil) : null;
  const msPerDay = 1000 * 60 * 60 * 24;

  // Si tiene un pago vigente (paidUntil en el futuro), manda sobre el trial.
  if (paidUntil && paidUntil.getTime() > now.getTime()) {
    const daysLeft = Math.ceil((paidUntil.getTime() - now.getTime()) / msPerDay);
    return {
      phase: "active",
      daysLeft,
      label: daysLeft <= 5 ? `Tu plan vence en ${daysLeft} día(s)` : `Plan activo — vence el ${paidUntil.toLocaleDateString("es-VE")}`,
      accessGranted: true,
    };
  }

  // Si no hay pago vigente pero el trial sigue corriendo.
  if (trialEndsAt.getTime() > now.getTime()) {
    const daysLeft = Math.ceil((trialEndsAt.getTime() - now.getTime()) / msPerDay);
    return {
      phase: "trial",
      daysLeft,
      label: `Prueba gratuita — ${daysLeft} día(s) restante(s)`,
      accessGranted: true,
    };
  }

  // Ni trial ni pago vigente: acceso bloqueado.
  return {
    phase: "blocked",
    daysLeft: 0,
    label: "Tu prueba gratuita venció. Reporta tu pago para reactivar el acceso.",
    accessGranted: false,
  };
}
