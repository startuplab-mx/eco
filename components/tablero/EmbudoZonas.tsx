"use client";

import { useState } from "react";
import { TrendingUp } from "lucide-react";
import { embudos, ETAPAS, zonas, type Zona } from "@/lib/mock/tablero";
import { Embudo } from "./graficas";
import { Tarjeta } from "./ui";

export default function EmbudoZonas() {
  const [zona, setZona] = useState<Zona>("Parada de la avenida");
  const e = embudos[zona];
  return (
    <Tarjeta
      titulo="Embudo del reclutamiento"
      subtitulo="Contacto → oferta → tarea → enganche → amenaza, por zona"
      accion={
        <select
          value={zona}
          onChange={(ev) => setZona(ev.target.value as Zona)}
          aria-label="Zona"
          className="rounded-lg border border-t-border bg-t-surface px-3 py-1.5 text-sm"
        >
          {zonas.map((z) => (
            <option key={z}>{z}</option>
          ))}
        </select>
      }
    >
      <Embudo etapas={ETAPAS} anterior={e.anterior} actual={e.actual} nombres={["jun–jul", "ago–sep"]} />
      <div className="mt-5 flex items-start gap-2 rounded-lg bg-t-hover p-3 text-sm">
        <TrendingUp className="mt-0.5 size-4 shrink-0 text-t-ink-2" aria-hidden />
        {e.escalamiento ? (
          <p>
            <span className="font-semibold">Escalamiento ×{e.escalamiento}.</span>{" "}
            <span className="text-t-ink-2">
              El peso de tarea y amenaza sobre contacto y oferta creció entre periodos en esta zona.
            </span>
          </p>
        ) : (
          <p className="text-t-ink-2">Sin señal de escalamiento: no hay suficientes reportes en etapas avanzadas.</p>
        )}
      </div>
    </Tarjeta>
  );
}
