"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import guionJson from "@/data/guion.json";
import instanciaJson from "@/config/instancia.json";
import type { Estado, Guion, Instancia, Salida } from "@/lib/tipos";
import { arrancar, crearEstado, registrarRecurso, responder, type Entrada } from "@/lib/motor";
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
    setDebug(new URLSearchParams(window.location.search).has("debug"));
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

  const escribiendo = cola.length > 0;

  function enviar(entrada: Entrada, etiqueta: string) {
    if (!estado) return;
    setItems((xs) => [...xs, { key: llave.current++, s: { tipo: "usuario", texto: etiqueta } }]);
    const r = responder(guion, instancia, estado, entrada);
    setEstado(r.estado);
    setCola((c) => [...c, ...r.salida]);
    setSeleccion([]);
    setTexto("");
  }

  function enviarTexto() {
    const t = texto.trim();
    if (!t) return;
    enviar({ texto: t }, t);
  }

  const esp = estado?.esperando;
  const terminada = estado?.terminada;
  const textoPrimero = !!esp && !estado?.pausa && (esp.paso.tipo === "abierta" || !!esp.paso.textoPrimero);

  /** Envía texto y/o etiquetas marcadas (abiertas, emociones y selección múltiple). */
  function enviarPrimero() {
    if (!esp) return;
    const t = texto.trim();
    const marcadas = esp.opciones.filter((o) => seleccion.includes(o.id)).map((o) => o.label);
    if (!t && !marcadas.length) return;
    const etiqueta = [t, ...marcadas].filter(Boolean).join(" · ");
    if (esp.multiple) enviar({ texto: t || undefined, opciones: seleccion }, etiqueta);
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
        {!escribiendo && esp && (textoPrimero ? (
          <>
            {esp.textoLibre && (
              <form className="escribir grande" onSubmit={(e) => { e.preventDefault(); enviarPrimero(); }}>
                <textarea
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviarPrimero(); }
                  }}
                  placeholder={esp.paso.placeholder ?? "Escribe aquí…"}
                  rows={2}
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
                <div className="etiquetas-titulo">{esp.textoLibre ? "O elige:" : "Elige una o varias:"}</div>
                <div className="opciones">
                  {esp.opciones.map((o) => {
                    const marcada = seleccion.includes(o.id);
                    return (
                      <button
                        key={o.id}
                        className={`etiqueta ${marcada ? "marcada" : ""}`}
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
              <button className="listo" disabled={!seleccion.length} onClick={enviarPrimero}>Listo</button>
            )}
          </>
        ) : (
          <>
            {esp.opciones.length > 0 && (
              <div className="opciones">
                {esp.opciones.map((o) => {
                  const marcada = seleccion.includes(o.id);
                  return (
                    <button
                      key={o.id}
                      className={`opcion ${marcada ? "marcada" : ""}`}
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
            )}
            {esp.multiple && (
              <button className="listo" disabled={!seleccion.length} onClick={enviarPrimero}>Listo</button>
            )}
            {esp.textoLibre && (
              <form className="escribir discreta" onSubmit={(e) => { e.preventDefault(); enviarTexto(); }}>
                <input
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  placeholder="O escribe tu respuesta…"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  maxLength={600}
                  aria-label="Tu respuesta"
                />
                <button type="submit" disabled={!texto.trim()}>Enviar</button>
              </form>
            )}
          </>
        ))}
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
              <pre>{JSON.stringify(resumen(guion, instancia, estado), null, 2)}</pre>
            </div>
          )}
        </>
      )}
    </main>
  );
}
