"use client";
import { useEffect, useState } from "react";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

/**
 * Botón pequeño para activar las alertas push del navegador.
 * Se usa dentro de la página de Proveedores.
 */
export default function NotificationSetup() {
  const [status, setStatus] = useState<"idle" | "asking" | "on" | "denied" | "unsupported">("idle");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }
    navigator.serviceWorker.getRegistration().then(async (reg) => {
      const sub = await reg?.pushManager.getSubscription();
      if (sub) setStatus("on");
    });
  }, []);

  async function activate() {
    setStatus("asking");
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") { setStatus("denied"); return; }

      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      });

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub),
      });
      setStatus("on");
    } catch {
      setStatus("denied");
    }
  }

  if (status === "unsupported") return null;
  if (status === "on") return <span className="badge badge-ok">🔔 Alertas push activadas</span>;

  return (
    <button className="btn btn-acc" onClick={activate} disabled={status === "asking"}>
      {status === "asking" ? "Activando..." : "🔔 Activar alertas push de pagos"}
    </button>
  );
}
