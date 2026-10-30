"use client";

import { useState } from "react";
import type { Guion, Instancia } from "@/lib/tipos";
import Ejercicio from "./Ejercicio";

interface Props {
  instancia: Instancia;
  guion: Guion;
  excluir: string[];
  onElegir: (id: string) => void;
}

export default function Directorio({ instancia, guion, excluir, onElegir }: Props) {
  const [abierto, setAbierto] = useState<string | null>(null);
  const lineas = instancia.directorio.filter((l) => !excluir.includes(l.id));
  const detalle = (t: string) =>
    t
      .replace("{orientador}", instancia.orientador.nombre)
      .replace("{lugar}", instancia.orientador.lugar)
      .replace("{horario}", instancia.orientador.horario);

  return (
    <div className="tarjeta directorio">
      {lineas.map((l) => (
        <div key={l.id} className="linea">
          <button
            className={`linea-boton ${abierto === l.id ? "activa" : ""}`}
            onClick={() => {
              setAbierto(abierto === l.id ? null : l.id);
              onElegir(l.id);
            }}
          >
            {l.label}
          </button>
          {abierto === l.id && (
            <div className="linea-detalle">
              {l.id === "respiracion" ? (
                <Ejercicio id="respiracion" guion={guion} />
              ) : (
                <>
                  <p>{detalle(l.detalle)}</p>
                  {l.numero && (
                    <a className="llamar" href={`tel:${l.numero}`}>
                      Llamar
                    </a>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
