"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreateOrgForm() {
  const [name, setName] = useState("");
  const [businessType, setBusinessType] = useState("Bodega / Abasto");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/organizations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, businessType }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error || "No se pudo crear el negocio."); return; }
    router.push(`/${data.id}/dashboard`);
  }

  return (
    <form onSubmit={handleSubmit} className="card">
      <h3>Crear nuevo negocio</h3>
      <label>
        Nombre del negocio
        <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Ej: Repuestos El Motor" />
      </label>
      <label>
        Tipo de negocio
        <select value={businessType} onChange={(e) => setBusinessType(e.target.value)}>
          <option>Bodega / Abasto</option>
          <option>Venta de repuestos</option>
          <option>Ferretería</option>
          <option>Farmacia</option>
          <option>Ropa y calzado</option>
          <option>Restaurante / Comida</option>
          <option>Otro</option>
        </select>
      </label>
      {error && <div className="error">{error}</div>}
      <button className="btn-primary2 btn" disabled={loading} style={{ width: "100%" }}>
        {loading ? "Creando..." : "Crear negocio"}
      </button>
    </form>
  );
}
