"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUp, ImageIcon, LifeBuoy, Paperclip, ShieldAlert } from "lucide-react";
import textos from "@/config/textos.json";
import Radar from "@/components/estudiante/Radar";
import { iniciar, limpiar, responder, type Cierre, type Estado } from "@/lib/mock/conversacion";

type Item =
  | { tipo: "bot"; texto: string }
  | { tipo: "yo"; texto: string }
  | { tipo: "limpio"; texto: string }
  | { tipo: "adjunto" }
  | { tipo: "rojo" }
  | { tipo: "autolesion" }
  | { tipo: "radar" };

const ESPERA = 900;

export default function Chat({ inicial = "" }: { inicial?: string }) {
  const [items, setItems] = useState<Item[]>([{ tipo: "bot", texto: textos.bienvenida }]);
  const [estado, setEstado] = useState<Estado | null>(null);
  const [cerrado, setCerrado] = useState(false);
  const [texto, setTexto] = useState(inicial);
  const [opciones, setOpciones] = useState<string[]>([]);
  const [escribiendo, setEscribiendo] = useState(false);
  const fin = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fin.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [items, escribiendo]);

  const agregar = (...nuevos: Item[]) => setItems((xs) => [...xs, ...nuevos]);

  function responde(fn: () => void) {
    setEscribiendo(true);
    setTimeout(() => {
      setEscribiendo(false);
      fn();
    }, ESPERA);
  }

  function cerrar(c: Cierre) {
    setOpciones([]);
    setCerrado(true);
    if (c.tipo === "no_suma") {
      agregar({ tipo: "bot", texto: textos.cierre_no_suma }, { tipo: "radar" });
      return;
    }
    // Autolesión: solo el bloque fijo, sin conteo de parecidos.
    if (c.tipo === "autolesion") {
      agregar({ tipo: "autolesion" });
      return;
    }
    const cierre = c.tipo === "primero" ? textos.cierre_primero : textos.cierre_parecidos.replace("{n}", String(c.n));
    agregar({ tipo: "bot", texto: cierre }, ...(c.rojo ? [{ tipo: "rojo" } as Item] : []));
  }

  function enviar(valor: string) {
    const t = valor.trim();
    if (!t || escribiendo || cerrado) return;
    setTexto("");
    setOpciones([]);

    const { limpio, cambio } = limpiar(t);
    agregar({ tipo: "yo", texto: t });
    if (cambio) agregar({ tipo: "limpio", texto: limpio });

    // El motor decide si pregunta algo más o cierra (lib/mock/conversacion.ts).
    const e = estado ? responder(estado, t) : iniciar(t);
    setEstado(e);
    responde(() => {
      if (e.pregunta) {
        agregar({ tipo: "bot", texto: e.pregunta.texto });
        setOpciones(e.pregunta.opciones);
      } else if (e.cierre) {
        cerrar(e.cierre);
      }
    });
  }

  function adjuntar() {
    if (cerrado) return;
    agregar({ tipo: "adjunto" });
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1 space-y-3 px-4 pb-4 pt-2" aria-live="polite">
        {items.map((it, i) => (
          <Burbuja key={i} item={it} />
        ))}
        {escribiendo && (
          <div className="entra flex w-fit gap-1 rounded-2xl rounded-bl-md bg-e-card px-4 py-3.5" aria-label="Escribiendo">
            {[0, 1, 2].map((d) => (
              <span
                key={d}
                className="size-1.5 rounded-full bg-e-muted"
                style={{ animation: `pulso 1s ease-in-out ${d * 0.15}s infinite` }}
              />
            ))}
          </div>
        )}
        {cerrado && !escribiendo && (
          <div className="entra grid grid-cols-2 gap-2 pt-3">
            <Link href="/" className="rounded-2xl bg-e-card py-3 text-center text-sm font-semibold hover:bg-e-card-2">
              {textos.boton_ver_radar}
            </Link>
            <a href="/contar" className="rounded-2xl bg-e-card py-3 text-center text-sm font-semibold hover:bg-e-card-2">
              {textos.boton_contar_otra}
            </a>
          </div>
        )}
        <div ref={fin} />
      </div>

      {!cerrado && (
        <div className="sticky bottom-0 space-y-2 bg-e-bg/95 px-4 pb-4 pt-2 backdrop-blur">
          {opciones.length > 0 && !escribiendo && (
            <div className="entra flex flex-wrap gap-2 pb-1">
              {opciones.map((o) => (
                <button
                  key={o}
                  onClick={() => enviar(o)}
                  className="shrink-0 rounded-full border border-e-line bg-e-card px-3.5 py-2 text-sm hover:border-e-acento"
                >
                  {o}
                </button>
              ))}
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              enviar(texto);
            }}
            className="flex items-end gap-2 rounded-3xl bg-e-card p-1.5 pl-2"
          >
            <button
              type="button"
              onClick={adjuntar}
              aria-label="Adjuntar captura"
              className="grid size-10 shrink-0 place-items-center rounded-full text-e-muted hover:bg-e-card-2 hover:text-e-ink"
            >
              <Paperclip className="size-5" />
            </button>
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  enviar(texto);
                }
              }}
              rows={texto.length > 60 ? 3 : 1}
              placeholder={textos.input_placeholder}
              className="min-h-10 flex-1 resize-none bg-transparent py-2 text-[15px] leading-snug outline-none placeholder:text-e-muted"
            />
            <button
              type="submit"
              aria-label="Enviar"
              disabled={!texto.trim() || escribiendo}
              className="grid size-10 shrink-0 place-items-center rounded-full bg-e-acento text-e-acento-ink disabled:opacity-30"
            >
              <ArrowUp className="size-5" strokeWidth={2.5} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function Burbuja({ item }: { item: Item }) {
  switch (item.tipo) {
    case "bot":
      return (
        <p className="entra max-w-[85%] rounded-2xl rounded-bl-md bg-e-card px-4 py-3 text-[15px] leading-snug">
          {item.texto}
        </p>
      );
    case "yo":
      return (
        <p className="entra ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-e-acento px-4 py-3 text-[15px] leading-snug text-e-acento-ink">
          {item.texto}
        </p>
      );
    case "limpio":
      return (
        <div className="entra ml-auto max-w-[85%] space-y-1.5 text-right">
          <p className="text-xs text-e-muted">{textos.limpieza_aviso}</p>
          <p className="rounded-2xl border border-dashed border-e-line px-4 py-3 text-left text-[15px] leading-snug text-e-muted">
            {item.texto}
          </p>
        </div>
      );
    case "adjunto":
      return (
        <div className="entra ml-auto w-fit space-y-1.5 text-right">
          <div className="grid h-28 w-40 place-items-center rounded-2xl bg-e-card-2 text-e-muted">
            <ImageIcon className="size-8" />
          </div>
          <p className="max-w-56 text-xs text-e-muted">{textos.captura_limpia}</p>
        </div>
      );
    case "rojo":
      return (
        <div className="entra flex gap-3 rounded-2xl border border-e-rojo/40 bg-e-rojo/10 p-4 text-[15px] leading-snug">
          <ShieldAlert className="mt-0.5 size-5 shrink-0 text-e-rojo" />
          <p>{textos.rojo_inmediato}</p>
        </div>
      );
    case "autolesion":
      return (
        <div className="entra flex gap-3 rounded-2xl border border-e-acento/40 bg-e-acento/10 p-4 text-[15px] leading-snug">
          <LifeBuoy className="mt-0.5 size-5 shrink-0 text-e-acento" />
          <p>{textos.rojo_autolesion}</p>
        </div>
      );
    case "radar":
      return (
        <div className="entra pt-2">
          <Radar compacto />
        </div>
      );
  }
}
