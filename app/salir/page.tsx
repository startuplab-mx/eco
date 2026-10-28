import type { Metadata, Viewport } from "next";

// Página neutra de salida rápida. No tiene nada que la ligue con eco.
export const metadata: Metadata = {
  title: "Apuntes · Física I",
};

export const viewport: Viewport = { themeColor: "#ffffff" };

export default function Salir() {
  return (
    <div className="min-h-dvh flex-1 bg-white text-neutral-800">
      <article className="mx-auto max-w-2xl px-5 py-10 font-serif leading-relaxed">
        <p className="font-sans text-xs uppercase tracking-widest text-neutral-400">Física I · Repaso para el parcial</p>
        <h1 className="mt-2 font-sans text-3xl font-semibold text-neutral-900">Leyes de Newton</h1>

        <h2 className="mt-8 font-sans text-lg font-semibold text-neutral-900">1. Ley de la inercia</h2>
        <p className="mt-2">
          Un cuerpo permanece en reposo o en movimiento rectilíneo uniforme mientras ninguna fuerza neta actúe sobre él.
          Ejemplo: cuando el camión frena de golpe, los pasajeros se van hacia adelante.
        </p>

        <h2 className="mt-8 font-sans text-lg font-semibold text-neutral-900">2. Ley de la fuerza</h2>
        <p className="mt-2">
          La aceleración de un cuerpo es proporcional a la fuerza neta que actúa sobre él e inversamente proporcional a su
          masa.
        </p>
        <p className="mt-3 rounded bg-neutral-100 px-4 py-3 text-center font-mono text-lg">F = m · a</p>
        <p className="mt-3">
          Unidades: la fuerza se mide en newtons (N). 1 N = 1 kg · m/s². Si empujas un carrito de 10 kg con 20 N, acelera a
          2 m/s².
        </p>

        <h2 className="mt-8 font-sans text-lg font-semibold text-neutral-900">3. Acción y reacción</h2>
        <p className="mt-2">
          A toda acción corresponde una reacción de igual magnitud y en sentido contrario. Al remar, el remo empuja el
          agua hacia atrás y el agua empuja la lancha hacia adelante.
        </p>

        <h2 className="mt-8 font-sans text-lg font-semibold text-neutral-900">Para practicar</h2>
        <ol className="mt-2 list-decimal space-y-2 pl-5">
          <li>Una caja de 5 kg acelera a 3 m/s². ¿Qué fuerza neta actúa sobre ella?</li>
          <li>Explica con la tercera ley por qué un cohete puede avanzar en el espacio.</li>
          <li>¿Por qué es más difícil empujar un coche que una bicicleta con la misma fuerza?</li>
        </ol>
      </article>
    </div>
  );
}
