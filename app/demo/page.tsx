"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, FlaskConical, Smartphone } from "lucide-react";

type Paso = {
  titulo: string;
  texto: string;
  telefono?: string;
  tablero?: string;
};

const GUION: Paso[] = [
  {
    titulo: "Alguien manda el link al chat del salón",
    texto: "Se abre sin cuenta, sin teléfono y sin instalar nada. Lo primero que ve es el radar: cuántas personas contaron algo esta semana.",
    telefono: "/",
  },
  {
    titulo: "Cuenta algo como quiera",
    texto: "El chat pregunta solo lo que falta, máximo dos cosas. Aquí \"afuera\" no alcanza para ubicar la celda: pregunta dónde y cuándo, y cierra con \"6 personas más contaron algo parecido\".",
    telefono: "/contar?e=normal",
  },
  {
    titulo: "Si pasa en línea",
    texto: "No pregunta dónde ni a qué hora: en línea no hay lugar ni franja. Pregunta en qué app o juego, si no lo dijo.",
    telefono: "/contar?e=linea",
  },
  {
    titulo: "Cuando el enganche llega por una relación",
    texto: "A chavas el reclutamiento suele llegar distinto: alguien mayor que las recoge, regalos, fotos, \"trabajo de modelo\". El chat lo recibe igual y el tablero lo separa en \"a quién va dirigida\".",
    telefono: "/contar?e=chava",
  },
  {
    titulo: "Si hay riesgo inmediato",
    texto: "No pregunta nada más. Cierra con el bloque fijo: llama al 911 y, si puedes, métete a la escuela o a un lugar con gente. El aviso al plantel sale en ese momento.",
    telefono: "/contar?e=rojo",
  },
  {
    titulo: "Si es una prueba o una broma",
    texto: "No se castiga ni se le dice que se descartó. Se le muestra lo que otros han contado. El primer mensaje casi siempre es una prueba de confianza.",
    telefono: "/contar?e=broma",
  },
  {
    titulo: "Si se identifica sin querer",
    texto: "El sistema quita lo que dice quién es (\"soy de su mismo grupo\") antes de guardar y se lo avisa en una línea. Como fue por mensajes, pregunta la app.",
    telefono: "/contar?e=maestro",
  },
  {
    titulo: "Salida rápida",
    texto: "El botón Salir cambia la página por unos apuntes de física y borra la sesión. Atrás no regresa.",
    telefono: "/salir",
  },
  {
    titulo: "En el tablero aparece la zona",
    texto: "La embajada ve celdas gruesas con 5 o más reportes, nunca mensajes. La parada de la avenida concentra el mes.",
    tablero: "/tablero/mapa",
  },
  {
    titulo: "El modo de operar",
    texto: "El embudo por zona muestra el escalamiento: en la parada, el peso pasa de contacto y oferta a tarea y amenaza.",
    tablero: "/tablero/modo",
  },
  {
    titulo: "La ficha de patrón",
    texto: "Se genera sola cuando se cumple una regla. Es lo único que sale del sistema: sin texto libre ni nombres.",
    tablero: "/tablero/alertas",
  },
];

export default function Demo() {
  const [src, setSrc] = useState("/");
  const [vuelta, setVuelta] = useState(0);

  const abrir = (ruta: string) => {
    setSrc(ruta);
    setVuelta((v) => v + 1);
  };

  return (
    <div className="tablero min-h-dvh flex-1 bg-t-page text-t-ink">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-t-border px-4 py-3 sm:px-8">
        <p className="flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-s1" />
          <span className="font-semibold">eco</span>
          <span className="text-t-muted">· guion del demo</span>
        </p>
        <span className="inline-flex items-center gap-2 rounded-full bg-warning/15 px-3 py-1 text-sm font-medium">
          <FlaskConical className="size-4" aria-hidden />
          Mockup sin funciones · datos sintéticos
        </span>
      </header>

      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-8 sm:px-8 lg:grid-cols-[400px_1fr]">
        <div className="hidden lg:block">
          <div className="sticky top-8">
            <div className="rounded-[44px] border border-t-border bg-[#0d0d0f] p-3 shadow-xl">
              <iframe
                key={vuelta}
                src={src}
                title="Vista del estudiante"
                className="h-[740px] w-full rounded-[34px] bg-[#0d0d0f]"
              />
            </div>
            <p className="mt-3 text-center text-xs text-t-muted">Vista del estudiante · {src}</p>
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Guion de 10 minutos</h1>
          <p className="mt-1 max-w-xl text-sm text-t-ink-2">
            Cada paso abre la pantalla en el teléfono de la izquierda o el tablero en otra pestaña. En celular, los enlaces abren la
            pantalla completa.
          </p>

          <ol className="mt-6 space-y-3">
            {GUION.map((p, i) => (
              <li key={p.titulo} className="flex gap-4 rounded-xl border border-t-border bg-t-surface p-4">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-t-hover text-sm font-semibold tabular">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold">{p.titulo}</h2>
                  <p className="mt-1 text-sm text-t-ink-2">{p.texto}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-sm">
                    {p.telefono && (
                      <>
                        <button
                          onClick={() => abrir(p.telefono!)}
                          className="hidden items-center gap-1.5 rounded-lg bg-t-ink px-3 py-1.5 font-medium text-t-page lg:inline-flex"
                        >
                          <Smartphone className="size-4" /> Ver en el teléfono
                        </button>
                        <Link
                          href={p.telefono}
                          target="_blank"
                          className="inline-flex items-center gap-1 rounded-lg border border-t-border px-3 py-1.5 font-medium hover:bg-t-hover"
                        >
                          Abrir <ArrowUpRight className="size-4" />
                        </Link>
                      </>
                    )}
                    {p.tablero && (
                      <Link
                        href={p.tablero}
                        target="_blank"
                        className="inline-flex items-center gap-1 rounded-lg bg-t-ink px-3 py-1.5 font-medium text-t-page"
                      >
                        Abrir tablero <ArrowUpRight className="size-4" />
                      </Link>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ol>

          <section className="mt-10 rounded-xl border border-t-border bg-t-surface p-5">
            <h2 className="font-semibold">Aviso rojo al plantel · ejemplo sintético</h2>
            <p className="mt-1 text-sm text-t-ink-2">
              Lo que recibe el cargo designado en CONALEP. La embajada no ve este contenido.
            </p>
            <div className="mt-4 rounded-lg bg-t-hover p-4 font-mono text-xs leading-relaxed text-t-ink-2">
              <p>Un estudiante dice que le pidieron llevar un paquete y que lo esperan a la salida el viernes.</p>
              <p>Menciona una amenaza si no va.</p>
              <p className="mt-2">Celda: Parada de la avenida · Franja: vespertino</p>
              <p className="mt-2">Ruta: Dirección → Subdirección → Ministerio Público · Procuraduría de Protección · 911</p>
            </div>
          </section>

          <section className="mt-6 grid gap-6 text-sm sm:grid-cols-2">
            <div>
              <h2 className="font-semibold">Qué está simulado</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-t-ink-2">
                <li>No hay IA: el chat sigue un guion según lo que escribas.</li>
                <li>No hay base de datos: nada de lo que escribas se guarda ni se envía.</li>
                <li>Todos los números del radar y del tablero son inventados.</li>
                <li>El mapa es un esquema; las celdas reales se dibujan con el plantel.</li>
              </ul>
            </div>
            <div>
              <h2 className="font-semibold">Pantallas</h2>
              <ul className="mt-2 space-y-1 text-t-ink-2">
                <li>
                  Estudiante:{" "}
                  <Link className="underline" href="/">
                    radar
                  </Link>
                  ,{" "}
                  <Link className="underline" href="/contar">
                    contar
                  </Link>
                  ,{" "}
                  <Link className="underline" href="/salir">
                    salida
                  </Link>
                </li>
                <li>
                  Tablero:{" "}
                  <Link className="underline" href="/tablero/entrar">
                    entrar
                  </Link>
                  ,{" "}
                  <Link className="underline" href="/tablero">
                    resumen
                  </Link>{" "}
                  y siete vistas más
                </li>
              </ul>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
