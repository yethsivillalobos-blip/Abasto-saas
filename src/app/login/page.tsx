"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) setError("Correo o contraseña incorrectos.");
    else window.location.href = "/select-org";
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>ABASTO OS</h1>
        <p className="sub">Inicia sesión para administrar tu negocio</p>
        <button className="btn-google" onClick={() => signIn("google", { callbackUrl: "/select-org" })}>
          Continuar con Google
        </button>
        <div className="divider"><span>o con tu correo</span></div>
        <form onSubmit={handleCredentials}>
          <label>
            Correo
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label>
            Contraseña
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          {error && <div className="error">{error}</div>}
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
        <p className="alt">¿No tienes cuenta? <Link href="/register">Regístrate</Link></p>
      </div>
    </div>
  );
}
