"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";
import Link from "next/link";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "No se pudo crear la cuenta.");
      setLoading(false);
      return;
    }
    const signInRes = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (signInRes?.error) setError("Cuenta creada, pero no se pudo iniciar sesión. Intenta desde Ingresar.");
    else window.location.href = "/select-org";
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>Crea tu cuenta</h1>
        <p className="sub">Un solo usuario puede administrar varios negocios</p>
        <button className="btn-google" onClick={() => signIn("google", { callbackUrl: "/select-org" })}>
          Registrarme con Google
        </button>
        <div className="divider"><span>o con tu correo</span></div>
        <form onSubmit={handleSubmit}>
          <label>
            Nombre
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label>
            Correo
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label>
            Contraseña (mínimo 6 caracteres)
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
          </label>
          {error && <div className="error">{error}</div>}
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? "Creando..." : "Crear cuenta"}
          </button>
        </form>
        <p className="alt">¿Ya tienes cuenta? <Link href="/login">Ingresa</Link></p>
      </div>
    </div>
  );
}
