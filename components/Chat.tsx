"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import guionJson from "@/data/guion.json";
import instanciaJson from "@/config/instancia.json";
import type { Estado, Guion, Instancia, Salida } from "@/lib/tipos";
import { arrancar, crearEstado, registrarRecurso, type Entrada } from "@/lib/motor";
import { turno, iaPorHTTP, fallasIA, type Mensaje } from "@/lib/turno";
import type { ServicioIA } from "@/lib/ia-tipos";
import { resumen } from "@/lib/indices";
import Ejercicio from "./Ejercicio";
import Directorio from "./Directorio";

const guion = guionJson as unknown as Guion;
const instancia = instanciaJson as Instancia;

interface Item {
  key: number;
  s: Salida;
}

function aleatorio(): number {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return a[0] / 2 ** 32;
}

function nuevaSesion() {
  return arrancar(guion, instancia, crearEstado(aleatorio, new Date(), guion.preguntasCierre.length));
}

export default function Chat() {
  const [estado, setEstado] = useState<Estado | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [cola, setCola] = useState<Salida[]>([]);
  const [seleccion, setSeleccion] = useState<string[]>([]);
  const [texto, setTexto] = useState("");
  const [debug, setDebug] = useState(false);
  const [verResumen, setVerResumen] = useState(false);
  const [pensando, setPensando] = useState(false);
  const [ia, setIa] = useState<ServicioIA | null>(null);
  const [uso, setUso] = useState({ llamadas: 0, respaldos: 0, puentes: 0 });
  const llave = useRef(0);

  const iniciar = useCallback(() => {
    const r = nuevaSesion();
    setItems([]);
    setSeleccion([]);
    setTexto("");
    setEstado(r.estado);
    setCola(r.salida);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setDebug(params.has("debug"));
    // ?ia=0 apaga la IA para comparar con el guion fijo.
    if (params.get("ia") !== "0") {
      fetch("/api/estado")
        .then((r) => r.json())
        .then((d: { ia?: boolean }) => { if (d.ia) setIa(iaPorHTTP()); })
        .catch(() => {});
    }
    iniciar();
  }, [iniciar]);

  // Muestra las burbujas de Eco una por una, con un respiro entre ellas.
  useEffect(() => {
    if (!cola.length) return;
    const s = cola[0];
    const ms = "texto" in s ? Math.min(1500, 350 + s.texto.length * 11) : 450;
    const t = setTimeout(() => {
      setItems((xs) => [...xs, { key: llave.current++, s }]);
      setCola((c) => c.slice(1));
    }, ms);
    return () => clearTimeout(t);
  }, [cola]);

  // Baja hasta el final para que la última burbuja quede arriba de los botones.
  useEffect(() => {
    const id = requestAnimationFrame(() =>
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" }),
    );
    return () => cancelAnimationFrame(id);
  }, [items, cola.length, estado?.esperando]);

  const escribiendo = cola.length > 0 || pensando;

  async function enviar(entrada: Entrada, etiqueta: string) {
    if (!estado || pensando) return;
    setItems((xs) => [...xs, { key: llave.current++, s: { tipo: "usuario", texto: etiqueta } }]);
    setSeleccion([]);
    setTexto("");
    setPensando(true);
    const historial: Mensaje[] = [...items.map((i) => i.s), { tipo: "usuario" as const, texto: etiqueta }]
      .filter((s): s is { tipo: "eco" | "usuario"; texto: string } => s.tipo === "eco" || s.tipo === "usuario")
      .slice(-6)
      .map((s) => ({ quien: s.tipo === "eco" ? "eco" : "joven", texto: s.texto }));
    try {
      const r = await turno(guion, instancia, estado, entrada, ia, historial);
      setEstado(r.estado);
      setCola((c) => [...c, ...r.salida]);
      setUso((u) => ({
        llamadas: u.llamadas + r.uso.llamadas,
        respaldos: u.respaldos + r.uso.respaldos,
        puentes: u.puentes + r.uso.puentes,
      }));
    } finally {
      setPensando(false);
    }
  }

  const esp = estado?.esperando;
  const terminada = estado?.terminada;
  /** Envía lo escrito y/o las etiquetas marcadas. */
  function enviarActual() {
    if (!esp) return;
    const t = texto.trim();
    const marcadas = esp.opciones.filter((o) => seleccion.includes(o.id)).map((o) => o.label);
    if (!t && !marcadas.length) return;
    if (esp.multiple) enviar({ texto: t || undefined, opciones: seleccion }, [t, ...marcadas].filter(Boolean).join(" · "));
    else enviar({ texto: t }, t);
  }

  return (
    <main className="app">
      <header className="cabecera">
        <div>
          <div className="marca">Eco</div>
          <div className="lema">Un espacio para platicar cómo te sientes</div>
        </div>
        {!terminada && (
          <div className="cabecera-botones">
            <button onClick={() => enviar({ texto: "pausa" }, "pausa")} disabled={escribiendo || !esp}>Pausa</button>
            <button onClick={() => enviar({ texto: "salir" }, "salir")} disabled={escribiendo || !esp}>Salir</button>
          </div>
        )}
      </header>

      <section className="conversacion" aria-live="polite">
        {items.map(({ key, s }) => {
          switch (s.tipo) {
            case "eco":
              return <div key={key} className="burbuja eco">{s.texto}</div>;
            case "eco-crisis":
              return <div key={key} className="burbuja eco crisis">{s.texto}</div>;
            case "usuario":
              return <div key={key} className="burbuja usuario">{s.texto}</div>;
            case "ejercicio":
              return <Ejercicio key={key} id={s.ejercicio} guion={guion} />;
            case "directorio":
              return (
                <Directorio
                  key={key}
                  instancia={instancia}
                  guion={guion}
                  excluir={s.excluir}
                  onElegir={(id) => setEstado((e) => (e ? registrarRecurso(e, id) : e))}
                />
              );
          }
        })}
        {escribiendo && (
          <div className="burbuja eco escribiendo" aria-label="Eco está escribiendo">
            <span /><span /><span />
          </div>
        )}
      </section>

      <footer className="controles">
        {!escribiendo && esp && (
          <>
            {esp.textoLibre && (
              <form className="escribir" onSubmit={(e) => { e.preventDefault(); enviarActual(); }}>
                <textarea
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviarActual(); }
                  }}
                  placeholder={esp.paso.placeholder ?? (esp.paso.tipo === "abierta" ? "Escribe aquí…" : "Escribe tu respuesta…")}
                  rows={esp.paso.tipo === "abierta" ? 2 : 1}
                  inputMode={esp.paso.tipo === "numero" ? "numeric" : "text"}
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  maxLength={600}
                  aria-label="Tu respuesta"
                />
                <button type="submit" disabled={!texto.trim() && !seleccion.length}>Enviar</button>
              </form>
            )}
            {esp.opciones.length > 0 && (
              <div className="etiquetas-bloque">
                {esp.textoLibre && (
                  <div className="etiquetas-titulo">{esp.multiple ? "O elige una o varias:" : "O elige:"}</div>
                )}
                <div className="etiquetas">
                  {esp.opciones.map((o) => {
                    const marcada = seleccion.includes(o.id);
                    return (
                      <button
                        key={o.id}
                        className={`etiqueta ${marcada ? "marcada" : ""}`}
                        aria-pressed={esp.multiple ? marcada : undefined}
                        onClick={() =>
                          esp.multiple
                            ? setSeleccion((s) => (marcada ? s.filter((x) => x !== o.id) : [...s, o.id]))
                            : enviar({ opcion: o.id }, o.label)
                        }
                      >
                        {o.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {esp.multiple && !esp.textoLibre && (
              <button className="listo" disabled={!seleccion.length} onClick={enviarActual}>Enviar</button>
            )}
          </>
        )}
        {!escribiendo && terminada && (
          <button className="borrar" onClick={iniciar}>
            Cerrar y borrar esta plática
          </button>
        )}
      </footer>

      {debug && estado && (
        <>
          <button className="debug-boton" onClick={() => setVerResumen((v) => !v)}>
            {verResumen ? "Cerrar resumen" : "Resumen"}
          </button>
          {verResumen && (
            <div className="debug">
              <div className="debug-titulo">Resumen que se guardaría (sólo en modo prueba)</div>
              <div className="debug-ia">
                IA: {ia ? "activa" : "apagada"} · llamadas {uso.llamadas} · frases escritas por IA {uso.puentes} · respaldos al guion {uso.respaldos}
                {fallasIA.length > 0 && <div>Últimas fallas: {fallasIA.join(" · ")}</div>}
              </div>
              <pre>{JSON.stringify(resumen(guion, instancia, estado), null, 2)}</pre>
            </div>
          )}
        </>
      )}
    </main>
  );
}
