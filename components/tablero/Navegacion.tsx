"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BellRing,
  BookA,
  LayoutDashboard,
  LogOut,
  Map as MapIcon,
  ScrollText,
  Send,
  Smartphone,
  Workflow,
} from "lucide-react";
import { fichas } from "@/lib/mock/tablero";

const VISTAS = [
  { href: "/tablero", nombre: "Resumen", Icono: LayoutDashboard },
  { href: "/tablero/mapa", nombre: "Mapa físico", Icono: MapIcon },
  { href: "/tablero/canales", nombre: "Canales digitales", Icono: Smartphone },
  { href: "/tablero/modo", nombre: "Modo de operar", Icono: Workflow },
  { href: "/tablero/alertas", nombre: "Alertas de patrón", Icono: BellRing },
  { href: "/tablero/respuesta", nombre: "Respuesta institucional", Icono: Send },
];

const ADMIN = [
  { href: "/tablero/lexico", nombre: "Léxico", Icono: BookA },
  { href: "/tablero/accesos", nombre: "Registro de accesos", Icono: ScrollText },
];

const nuevas = fichas.filter((f) => f.estado === "nueva").length;

function Enlace({ href, nombre, Icono }: (typeof VISTAS)[number]) {
  const ruta = usePathname();
  const activo = ruta === href;
  return (
    <Link
      href={href}
      aria-current={activo ? "page" : undefined}
      className={`flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm ${
        activo ? "bg-t-surface font-medium text-t-ink shadow-sm ring-1 ring-t-border" : "text-t-ink-2 hover:bg-t-hover"
      }`}
    >
      <Icono className="size-4" aria-hidden />
      <span>{nombre}</span>
      {href === "/tablero/alertas" && nuevas > 0 && (
        <span className="ml-auto rounded-full bg-t-ink px-1.5 text-xs font-semibold text-t-page tabular">{nuevas}</span>
      )}
    </Link>
  );
}

export default function Navegacion() {
  return (
    <>
      {/* Escritorio */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-6 border-r border-t-border px-3 py-5 lg:flex">
        <Link href="/tablero" className="flex items-center gap-2 px-3">
          <span className="size-2.5 rounded-full bg-s1" />
          <span className="font-semibold tracking-tight">eco</span>
          <span className="text-t-muted">· tablero</span>
        </Link>
        <nav className="space-y-0.5" aria-label="Vistas">
          {VISTAS.map((v) => (
            <Enlace key={v.href} {...v} />
          ))}
        </nav>
        <nav className="space-y-0.5" aria-label="Administración">
          <p className="px-3 pb-1 text-xs font-medium uppercase tracking-wider text-t-muted">Administración</p>
          {ADMIN.map((v) => (
            <Enlace key={v.href} {...v} />
          ))}
        </nav>
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-t-border px-3 pt-4 text-sm">
          <span>
            <span className="block font-medium">Embajada</span>
            <span className="text-t-muted">analista 1</span>
          </span>
          <Link href="/tablero/entrar" aria-label="Cerrar sesión" className="rounded-lg p-2 text-t-muted hover:bg-t-hover hover:text-t-ink">
            <LogOut className="size-4" />
          </Link>
        </div>
      </aside>

      {/* Móvil y tableta */}
      <nav
        className="sticky top-0 z-20 flex gap-1 overflow-x-auto border-b border-t-border bg-t-page px-3 py-2 lg:hidden"
        aria-label="Vistas"
      >
        {[...VISTAS, ...ADMIN].map((v) => (
          <Enlace key={v.href} {...v} />
        ))}
      </nav>
    </>
  );
}
