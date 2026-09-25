"use client";

import { useState } from "react";
import textos from "@/config/textos.json";
import Encabezado from "@/components/estudiante/Encabezado";
import { MINIMO } from "@/lib/mock/estudiante";

type Resultado = { encontrado: true; n: number; m: number } | { encontrado: false } | null;

export default function PaginaCodigo() {
  const [codigo, setCodigo] = useState("");
  const [resultado, setResultado] = useState<Resultado>(null);

  function ver(e: React.FormEvent) {
    e.preventDefault();
    // Demo: cualquier código de 6 letras o números "existe".
    setResultado(/^[A-Z0-9]{6}$/.test(codigo) ? { encontrado: true, n: 6, m: 5 } : { encontrado: false });
  }

  return (
    <>
      <Encabezado atras="/" />
      <main className="flex flex-1 flex-col gap-6 px-4 pb-8 pt-2">
        <div className="space-y-2">
          <h1 className="font-display text-2xl font-bold">{textos.codigo_titulo}</h1>
          <p className="text-e-muted">{textos.codigo_instruccion}</p>
        </div>

        <form onSubmit={ver} className="flex gap-2">
          <input
            value={codigo}
            onChange={(e) => {
              setCodigo(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6));
              setResultado(null);
            }}
            inputMode="text"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            placeholder="K7P2QX"
            aria-label="Código"
            className="min-w-0 flex-1 rounded-2xl bg-e-card px-4 py-3.5 font-mono text-2xl font-semibold tracking-[0.3em] outline-none placeholder:text-e-line focus:ring-2 focus:ring-e-acento"
          />
          <button
            type="submit"
            disabled={codigo.length !== 6}
            className="rounded-2xl bg-e-acento px-5 font-display font-bold text-e-acento-ink disabled:opacity-30"
          >
            {textos.codigo_ver}
          </button>
        </form>

        {resultado?.encontrado && (
          <div className="entra space-y-4 rounded-2xl bg-e-card p-5">
            <p className="font-display text-xl font-bold leading-snug">
              {textos.codigo_estado.replace("{n}", String(resultado.n))}
            </p>
            {/* Los nuevos solo se muestran si llegan al mínimo; si no, no se dice nada. */}
            {resultado.m >= MINIMO ? (
              <p className="text-e-muted">{textos.codigo_nuevos.replace("{m}", String(resultado.m))}</p>
            ) : null}
          </div>
        )}
        {resultado && !resultado.encontrado && (
          <p className="entra rounded-2xl bg-e-card p-4 text-e-muted">{textos.codigo_no_encontrado}</p>
        )}

        <p className="mt-auto text-xs text-e-muted">{textos.codigo_privacidad}</p>
      </main>
    </>
  );
}
