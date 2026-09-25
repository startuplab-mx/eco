"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import textos from "@/config/textos.json";

// Salida rápida: reemplaza la entrada del historial para que "atrás" no regrese.
function salir() {
  try {
    sessionStorage.clear();
  } catch {}
  window.location.replace("/salir");
}

export default function Encabezado({ atras }: { atras?: string }) {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-e-bg/90 px-4 py-3 backdrop-blur">
      <div className="flex items-center gap-2">
        {atras && (
          <Link
            href={atras}
            aria-label="Regresar"
            className="-ml-1 grid size-9 place-items-center rounded-full text-e-muted hover:bg-e-card hover:text-e-ink"
          >
            <ArrowLeft className="size-5" />
          </Link>
        )}
        <Link href="/" className="flex items-center gap-1.5 font-display text-xl font-bold tracking-tight">
          <span className="relative grid size-2.5 place-items-center">
            <span className="absolute size-2.5 rounded-full bg-e-acento" style={{ animation: "pulso 2.4s ease-in-out infinite" }} />
          </span>
          eco
        </Link>
      </div>
      <button
        onClick={salir}
        className="rounded-full border border-e-line bg-e-card px-4 py-1.5 text-sm font-semibold text-e-ink hover:bg-e-card-2"
      >
        {textos.salida_rapida}
      </button>
    </header>
  );
}
