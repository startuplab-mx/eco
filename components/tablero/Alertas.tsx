"use client";

import { useState } from "react";
import { Check, CircleDashed, Lock } from "lucide-react";
import { fichas as iniciales, type Ficha } from "@/lib/mock/tablero";
import { Segmentado } from "./ui";

type Filtro = "todas" | "nueva" | "revisada";

export default function Alertas() {
  const [fichas, setFichas] = useState<Ficha[]>(iniciales);
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const visibles = fichas.filter((f) => filtro === "todas" || f.estado === filtro);
  const nuevas = fichas.filter((f) => f.estado === "nueva").length;

  const marcar = (id: string) =>
    setFichas((xs) => xs.map((f) => (f.id === id ? { ...f, estado: f.estado === "nueva" ? "revisada" : "nueva" } : f)));

  return (
    <div className="space-y-4">
      <Segmentado
        etiqueta="Estado"
        valor={filtro}
        onCambio={setFiltro}
        opciones={[
          { id: "todas", nombre: `Todas (${fichas.length})` },
          { id: "nueva", nombre: `Nuevas (${nuevas})` },
          { id: "revisada", nombre: `Revisadas (${fichas.length - nuevas})` },
        ]}
      />

      <ul className="space-y-4">
        {visibles.map((f) => (
          <li key={f.id} className="rounded-xl border border-t-border bg-t-surface">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-t-border p-5">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                      f.estado === "nueva" ? "bg-t-ink text-t-page" : "bg-t-hover text-t-ink-2"
                    }`}
                  >
                    {f.estado === "nueva" ? <CircleDashed className="size-3" /> : <Check className="size-3" />}
                    {f.estado === "nueva" ? "Nueva" : "Revisada"}
                  </span>
                  <span className="text-xs text-t-muted tabular">{f.id}</span>
                </div>
                <h3 className="mt-2 text-lg font-semibold">
                  {f.regla} · {f.zona}
                </h3>
                <p className="text-sm text-t-muted">{f.descripcion}</p>
              </div>
              <button
                onClick={() => marcar(f.id)}
                className="rounded-lg border border-t-border px-3 py-1.5 text-sm font-medium hover:bg-t-hover"
              >
                {f.estado === "nueva" ? "Marcar revisada" : "Marcar nueva"}
              </button>
            </div>
            <dl className="grid gap-x-6 gap-y-4 p-5 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <Campo nombre="Zona" valor={f.zona} />
              <Campo nombre="Periodo" valor={f.periodo} />
              <Campo nombre="Reportes independientes" valor={String(f.reportes)} />
              <Campo nombre="Medio" valor={f.medio} />
              <Campo nombre="Oferta y tarea" valor={f.ofertaTarea} />
              <Campo nombre="Monto típico" valor={f.monto} />
              <Campo nombre="Franja" valor={f.franja} />
              <Campo nombre="Etapa predominante" valor={f.etapa} />
              <Campo nombre="Señal de escalamiento" valor={f.escalamiento} />
              <Campo
                nombre="Confianza"
                valor={`${f.confianza.reportes} reportes · ${f.confianza.coincidentes} coincidentes · ${f.confianza.descartados} descartados`}
                ancho
              />
              {f.grupo && <Campo nombre="Grupo" valor="Identificado por los reportantes (nombre no se muestra)" />}
            </dl>
          </li>
        ))}
        <li className="flex items-center gap-3 rounded-xl border border-dashed border-t-border p-5 text-sm text-t-muted">
          <Lock className="size-4 shrink-0" aria-hidden />
          <span>
            <span className="font-medium text-t-ink-2">Oferta replicada</span> · misma oferta (tipo y monto ±20 %) en más de un
            plantel. Se activa cuando el piloto tenga dos o más planteles.
          </span>
        </li>
      </ul>
    </div>
  );
}

function Campo({ nombre, valor, ancho }: { nombre: string; valor: string; ancho?: boolean }) {
  return (
    <div className={ancho ? "sm:col-span-2" : ""}>
      <dt className="text-t-muted">{nombre}</dt>
      <dd className="mt-0.5">{valor}</dd>
    </div>
  );
}
