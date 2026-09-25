"use client";

import { useState } from "react";
import textos from "@/config/textos.json";
import { FILAS, MINIMO, radar, totalRadar, type Periodo } from "@/lib/mock/estudiante";

function Conteo({ n }: { n: number }) {
  const [antes, despues] = textos.radar_conteo.split("{n}");
  return (
    <p className="text-e-muted">
      {antes}
      <span className="sr-only">{n}</span>
      {despues.trim()}
    </p>
  );
}

function Barrido({ n }: { n: number }) {
  return (
    <div className="relative mx-auto grid size-40 place-items-center" aria-hidden>
      <div className="absolute inset-0 rounded-full border border-e-line" />
      <div className="absolute inset-[18%] rounded-full border border-e-line" />
      <div className="absolute inset-[36%] rounded-full border border-e-line" />
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: "conic-gradient(from 0deg, rgba(215,255,60,0.28), rgba(215,255,60,0) 28%)",
          animation: "barrido 5s linear infinite",
        }}
      />
      <span className="relative font-display text-6xl font-bold tracking-tight">{n}</span>
    </div>
  );
}

export default function Radar({ compacto = false }: { compacto?: boolean }) {
  const [periodo, setPeriodo] = useState<Periodo>("semana");
  const total = totalRadar(periodo);
  const titulo = periodo === "semana" ? textos.radar_titulo : textos.radar_titulo_mes;

  return (
    <section className={compacto ? "space-y-4" : "space-y-6"}>
      <div className={compacto ? "flex flex-wrap items-center justify-between gap-3" : "space-y-3"}>
        <h1 className={compacto ? "font-display text-lg font-bold" : "font-display text-2xl font-bold leading-tight"}>
          {titulo}
        </h1>
        <div className="flex w-fit shrink-0 rounded-full bg-e-card p-1 text-xs font-semibold" role="tablist">
          {(["semana", "mes"] as Periodo[]).map((p) => (
            <button
              key={p}
              role="tab"
              aria-selected={periodo === p}
              onClick={() => setPeriodo(p)}
              className={`rounded-full px-3 py-1.5 ${
                periodo === p ? "bg-e-ink text-e-bg" : "text-e-muted hover:text-e-ink"
              }`}
            >
              {p === "semana" ? textos.periodo_semana : textos.periodo_mes}
            </button>
          ))}
        </div>
      </div>

      {compacto ? (
        <p className="text-e-muted">
          <span className="font-display text-3xl font-bold text-e-ink">{total}</span>{" "}
          {textos.radar_conteo.replace("{n}", "").trim()}
        </p>
      ) : (
        <div className="space-y-3 text-center">
          <Barrido n={total} />
          <Conteo n={total} />
        </div>
      )}

      <ul className="divide-y divide-e-line overflow-hidden rounded-2xl bg-e-card">
        {FILAS.map((f) => {
          const n = radar[periodo][f];
          const visible = n >= MINIMO;
          return (
            <li key={f} className="flex items-center justify-between gap-4 px-4 py-3.5">
              <span className="text-[15px] leading-snug">{textos.filas[f]}</span>
              <span
                className={`font-display text-2xl font-bold tabular ${visible ? "text-e-ink" : "text-e-muted"}`}
                aria-label={visible ? String(n) : "menos de 5"}
              >
                {visible ? n : "—"}
              </span>
            </li>
          );
        })}
      </ul>

      <p className="text-xs text-e-muted">{textos.radar_nota}</p>
    </section>
  );
}
