"use client";

import { useEffect, useState } from "react";
import type { EjercicioId, Guion } from "@/lib/tipos";

const FASES = [
  { texto: "Inhala…", segundos: 4, escala: 1 },
  { texto: "Sostén…", segundos: 4, escala: 1 },
  { texto: "Suelta…", segundos: 6, escala: 0.55 },
];

function Respiracion() {
  const [fase, setFase] = useState(-1);
  useEffect(() => {
    let i = -1;
    let t: ReturnType<typeof setTimeout>;
    const siguiente = () => {
      i = (i + 1) % FASES.length;
      setFase(i);
      t = setTimeout(siguiente, FASES[i].segundos * 1000);
    };
    t = setTimeout(siguiente, 400);
    return () => clearTimeout(t);
  }, []);
  const f = fase >= 0 ? FASES[fase] : null;
  return (
    <div className="respira">
      <div
        className="respira-circulo"
        style={{
          transform: `scale(${f ? f.escala : 0.55})`,
          transitionDuration: f ? `${f.segundos}s` : "0s",
        }}
      />
      <div className="respira-texto">{f ? f.texto : "Prepárate"}</div>
    </div>
  );
}

export default function Ejercicio({ id, guion }: { id: EjercicioId; guion: Guion }) {
  const e = guion.ejercicios[id];
  return (
    <div className="tarjeta ejercicio">
      <div className="tarjeta-titulo">{e.titulo}</div>
      {id === "respiracion" && <Respiracion />}
      <ol>
        {e.pasos.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ol>
    </div>
  );
}
