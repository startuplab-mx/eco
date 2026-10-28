"use client";

import { useState } from "react";
import { Globe } from "lucide-react";
import { celdas, ETAPAS, MINIMO, type Celda, type Etapa, type PeriodoMapa } from "@/lib/mock/tablero";
import { Cuenta, Leyenda, Segmentado, Tabla, Tarjeta, VerTabla } from "./ui";

type FiltroEtapa = "todas" | Etapa;

// Contornos esquemáticos. Las celdas reales se dibujan con el plantel.
const FORMAS: Record<string, { x: number; y: number; w: number; h: number }> = {
  colonia_norte: { x: 20, y: 16, w: 420, h: 92 },
  adentro: { x: 90, y: 156, w: 270, h: 118 },
  entrada: { x: 150, y: 282, w: 160, h: 40 },
  colonia_sur: { x: 20, y: 364, w: 420, h: 60 },
  parada: { x: 500, y: 178, w: 120, h: 80 },
};

const ESCALA = [
  { desde: 5, hasta: 7, fondo: "var(--seq-200)", tinta: "var(--seq-t-claro)" },
  { desde: 8, hasta: 11, fondo: "var(--seq-300)", tinta: "var(--seq-t-claro)" },
  { desde: 12, hasta: 15, fondo: "var(--seq-400)", tinta: "#fff" },
  { desde: 16, hasta: Infinity, fondo: "var(--seq-500)", tinta: "#fff" },
];

function tono(n: number) {
  return ESCALA.find((e) => n >= e.desde && n <= e.hasta) ?? ESCALA[ESCALA.length - 1];
}

function contar(c: Celda, p: PeriodoMapa, etapa: FiltroEtapa) {
  const v = c.conteos[p];
  return etapa === "todas" ? v.reduce((a, b) => a + b, 0) : v[ETAPAS.indexOf(etapa)];
}

export default function Mapa() {
  const [periodo, setPeriodo] = useState<PeriodoMapa>("30d");
  const [etapa, setEtapa] = useState<FiltroEtapa>("todas");
  const [sel, setSel] = useState<string>("parada");

  const celda = celdas.find((c) => c.id === sel)!;
  const nSel = contar(celda, periodo, etapa);
  const enLinea = celdas.find((c) => c.id === "en_linea")!;
  const nLinea = contar(enLinea, periodo, etapa);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Segmentado
          etiqueta="Periodo"
          valor={periodo}
          onCambio={setPeriodo}
          opciones={[
            { id: "7d", nombre: "7 días" },
            { id: "30d", nombre: "30 días" },
            { id: "90d", nombre: "90 días" },
          ]}
        />
        <label className="flex items-center gap-2 text-sm text-t-ink-2">
          Etapa
          <select
            value={etapa}
            onChange={(e) => setEtapa(e.target.value as FiltroEtapa)}
            className="rounded-lg border border-t-border bg-t-surface px-3 py-1.5 text-t-ink capitalize"
          >
            <option value="todas">Todas</option>
            {ETAPAS.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <Tarjeta>
          <svg viewBox="0 0 640 440" className="w-full" role="img" aria-label="Mapa esquemático de celdas alrededor del plantel">
            <defs>
              <pattern id="rayas" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="6" stroke="var(--t-grid)" strokeWidth="1.5" />
              </pattern>
            </defs>
            {/* Calles */}
            <rect x="0" y="122" width="640" height="22" fill="var(--t-grid)" opacity="0.6" />
            <rect x="0" y="332" width="640" height="22" fill="var(--t-grid)" opacity="0.6" />
            <rect x="458" y="0" width="30" height="440" fill="var(--t-grid)" opacity="0.9" />
            <text x="12" y="137" className="fill-t-muted text-[11px]">Calle</text>
            <text x="12" y="347" className="fill-t-muted text-[11px]">Calle</text>
            <text x="473" y="420" textAnchor="middle" transform="rotate(-90 473 420)" className="fill-t-muted text-[11px]">
              Avenida
            </text>

            {Object.entries(FORMAS).map(([id, f]) => {
              const c = celdas.find((x) => x.id === id)!;
              const n = contar(c, periodo, etapa);
              const visible = n >= MINIMO;
              const t = tono(n);
              const activa = sel === id;
              return (
                <g key={id} onClick={() => setSel(id)} onMouseEnter={() => setSel(id)} className="cursor-pointer">
                  <rect
                    x={f.x}
                    y={f.y}
                    width={f.w}
                    height={f.h}
                    rx={8}
                    fill={visible ? t.fondo : "url(#rayas)"}
                    stroke={activa ? "var(--t-ink)" : visible ? "var(--t-surface)" : "var(--t-axis)"}
                    strokeWidth={activa ? 2 : 1}
                  />
                  <text x={f.x + 12} y={f.y + 25} className="text-[12px] font-medium" fill={visible ? t.tinta : "var(--t-ink-2)"}>
                    {id === "entrada" ? "Entrada" : c.nombre}
                  </text>
                  <text
                    x={f.h > 50 ? f.x + 12 : f.x + f.w - 12}
                    y={f.h > 50 ? f.y + 50 : f.y + 25}
                    textAnchor={f.h > 50 ? "start" : "end"}
                    className={`font-semibold tabular ${f.h > 50 ? "text-[20px]" : "text-[13px]"}`}
                    fill={visible ? t.tinta : "var(--t-muted)"}
                  >
                    {visible ? n : "< 5"}
                  </text>
                </g>
              );
            })}
          </svg>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-t-border pt-3">
            <Leyenda
              items={[
                ...ESCALA.map((e) => ({
                  nombre: e.hasta === Infinity ? `${e.desde} o más` : `${e.desde} a ${e.hasta}`,
                  color: e.fondo,
                })),
                { nombre: "Menos de 5 (oculto)", color: "", rayado: true },
              ]}
            />
            <p className="text-xs text-t-muted">Esquema. Las celdas reales se dibujan con el plantel.</p>
          </div>
        </Tarjeta>

        <div className="space-y-4">
          <Tarjeta titulo={celda.nombre} subtitulo="Reportes con señal de reclutamiento">
            <p className="text-4xl font-semibold tracking-tight">
              <Cuenta n={nSel} />
            </p>
            {nSel >= MINIMO ? (
              <dl className="mt-4 space-y-3 text-sm">
                <div>
                  <dt className="text-t-muted">Medio predominante</dt>
                  <dd>{celda.medio}</dd>
                </div>
                <div>
                  <dt className="text-t-muted">Oferta típica</dt>
                  <dd>{celda.oferta}</dd>
                </div>
                <div>
                  <dt className="text-t-muted">Franja</dt>
                  <dd>{celda.franja}</dd>
                </div>
              </dl>
            ) : (
              <p className="mt-3 text-sm text-t-muted">Menos de 5 registros en este periodo. No se muestran detalles.</p>
            )}
          </Tarjeta>
          <button
            onClick={() => setSel("en_linea")}
            className={`flex w-full items-center gap-3 rounded-xl border bg-t-surface p-4 text-left ${
              sel === "en_linea" ? "border-t-ink" : "border-t-border hover:bg-t-hover"
            }`}
          >
            <Globe className="size-5 text-t-muted" />
            <span className="flex-1">
              <span className="block text-sm font-medium">En línea</span>
              <span className="block text-xs text-t-muted">No es un lugar físico</span>
            </span>
            <Cuenta n={nLinea} className="text-xl font-semibold" />
          </button>
        </div>
      </div>

      <VerTabla>
        <Tabla
          columnas={["Celda", "Reportes", "Medio", "Oferta típica", "Franja"]}
          filas={celdas.map((c) => {
            const n = contar(c, periodo, etapa);
            const v = n >= MINIMO;
            return [c.nombre, <Cuenta key="n" n={n} />, v ? c.medio : "—", v ? c.oferta : "—", v ? c.franja : "—"];
          })}
        />
      </VerTabla>
    </div>
  );
}
