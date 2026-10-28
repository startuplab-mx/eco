import type { Metadata } from "next";
import { FlaskConical } from "lucide-react";
import Navegacion from "@/components/tablero/Navegacion";
import { CORTE, PLANTEL } from "@/lib/mock/tablero";

export const metadata: Metadata = {
  title: "eco · tablero",
};

export default function LayoutTablero({ children }: LayoutProps<"/tablero">) {
  return (
    <div className="tablero flex min-h-dvh flex-1 bg-t-page text-t-ink lg:flex-row flex-col">
      <Navegacion />
      <div className="min-w-0 flex-1">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-t-border px-4 py-3 text-sm sm:px-8">
          <span className="inline-flex items-center gap-2 rounded-full bg-warning/15 px-3 py-1 font-medium text-t-ink">
            <FlaskConical className="size-4" aria-hidden />
            Datos sintéticos · mockup sin funciones
          </span>
          <span className="text-t-ink-2">
            {PLANTEL} · corte al {CORTE}
          </span>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
