"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { lexicoPropuestas } from "@/lib/mock/tablero";
import { Tarjeta } from "./ui";

type Decision = "pendiente" | "aprobado" | "descartado";

export default function ColaLexico() {
  const [decisiones, setDecisiones] = useState<Record<string, Decision>>({});
  const decidir = (t: string, d: Decision) => setDecisiones((x) => ({ ...x, [t]: x[t] === d ? "pendiente" : d }));
  const pendientes = lexicoPropuestas.filter((p) => (decisiones[p.termino] ?? "pendiente") === "pendiente").length;

  return (
    <Tarjeta titulo="Cola de propuestas" subtitulo={`${pendientes} por revisar · septiembre`}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-t-border text-t-muted">
              <th className="py-2 pr-4 font-medium">Término</th>
              <th className="py-2 pr-4 font-medium">Apariciones</th>
              <th className="py-2 pr-4 font-medium">Primera vez</th>
              <th className="py-2 pr-4 font-medium">Significado sugerido</th>
              <th className="py-2 pr-4 font-medium">Categoría</th>
              <th className="py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {lexicoPropuestas.map((p) => {
              const d = decisiones[p.termino] ?? "pendiente";
              return (
                <tr key={p.termino} className={`border-b border-t-border last:border-0 ${d !== "pendiente" ? "opacity-60" : ""}`}>
                  <td className="py-3 pr-4 font-medium">&ldquo;{p.termino}&rdquo;</td>
                  <td className="py-3 pr-4 tabular">{p.n}</td>
                  <td className="py-3 pr-4 text-t-ink-2">{p.primera}</td>
                  <td className="py-3 pr-4 text-t-ink-2">{p.significado}</td>
                  <td className="py-3 pr-4">
                    <code className="rounded bg-t-hover px-1.5 py-0.5 text-xs">{p.categoria}</code>
                  </td>
                  <td className="py-3">
                    <div className="flex justify-end gap-1.5">
                      <button
                        onClick={() => decidir(p.termino, "aprobado")}
                        aria-pressed={d === "aprobado"}
                        className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium ${
                          d === "aprobado" ? "border-t-ink bg-t-ink text-t-page" : "border-t-border hover:bg-t-hover"
                        }`}
                      >
                        <Check className="size-3.5" /> Aprobar
                      </button>
                      <button
                        onClick={() => decidir(p.termino, "descartado")}
                        aria-pressed={d === "descartado"}
                        className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium ${
                          d === "descartado" ? "border-t-ink bg-t-ink text-t-page" : "border-t-border hover:bg-t-hover"
                        }`}
                      >
                        <X className="size-3.5" /> Descartar
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Tarjeta>
  );
}
