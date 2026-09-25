import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "eco · entrar al tablero" };

export default function Entrar() {
  return (
    <div className="tablero flex min-h-dvh flex-1 items-center justify-center bg-t-page p-4 text-t-ink">
      <div className="w-full max-w-sm rounded-xl border border-t-border bg-t-surface p-6">
        <p className="flex items-center gap-2 text-sm">
          <span className="size-2.5 rounded-full bg-s1" />
          <span className="font-semibold">eco</span>
          <span className="text-t-muted">· tablero</span>
        </p>
        <h1 className="mt-6 text-xl font-semibold">Entrar</h1>
        <p className="mt-1 text-sm text-t-ink-2">Solo para el equipo de la embajada y StartupLab. Cada acceso queda registrado.</p>
        <div className="mt-6 space-y-4 text-sm">
          <label className="block">
            <span className="text-t-ink-2">Correo</span>
            <input
              type="email"
              placeholder="nombre@dependencia.gov"
              className="mt-1 w-full rounded-lg border border-t-border bg-t-page px-3 py-2 outline-none focus:ring-2 focus:ring-s1"
            />
          </label>
          <label className="block">
            <span className="text-t-ink-2">Contraseña</span>
            <input
              type="password"
              className="mt-1 w-full rounded-lg border border-t-border bg-t-page px-3 py-2 outline-none focus:ring-2 focus:ring-s1"
            />
          </label>
          <Link href="/tablero" className="block rounded-lg bg-t-ink py-2.5 text-center font-medium text-t-page">
            Entrar
          </Link>
        </div>
        <p className="mt-4 text-center text-xs text-t-muted">Mockup: no valida nada ni guarda lo que escribas.</p>
      </div>
    </div>
  );
}
