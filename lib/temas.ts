// Orden de la plática con IA: siete temas fijos. Se termina un tema antes de pasar al siguiente y cada
// tema abre con su introducción (una sola vez). Las preguntas se muestran tal cual están en el guion,
// para que todos los jóvenes contesten lo mismo y se pueda comparar.
import type { Estado, Guion, Paso } from "./tipos";
import { evaluar } from "./motor";
import { itemPorId } from "./catalogo";

export interface PasoTema {
  id: string;
  /** La pregunta, tal cual el guion. */
  texto: string;
  tema: string;
  /** Introducción del tema si es la primera pregunta que se hace de él; si no, null. */
  intro: string | null;
}

function paso(g: Guion, id: string): Paso | undefined {
  for (const b of Object.values(g.bloques)) {
    const p = b.pasos.find((x) => x.id === id);
    if (p) return p;
  }
  return undefined;
}

/**
 * Una pregunta con condición sólo se hace si la respuesta de la que depende ya está y la cumple
 * ("¿Me cuentas cómo te imaginas?" sólo después de un «Sí»).
 */
function aplica(g: Guion, estado: Estado, id: string): boolean {
  const c = paso(g, id)?.si;
  if (!c) return true;
  const depende = (c as { paso?: string }).paso;
  if (depende && (!estado.respuestas[depende] || estado.respuestas[depende].valor === "omitida")) return false;
  return evaluar(g, estado, c);
}

/** Las siguientes preguntas en orden (hasta n), con la introducción del tema donde toca. */
export function siguientesPasos(g: Guion, estado: Estado, n = 3): PasoTema[] {
  const temas = g.ia?.temas ?? [];
  const vistos = new Set(estado.ia?.temas ?? []);
  const hechas = new Set(estado.ia?.preguntados ?? []);
  const xs: PasoTema[] = [];
  for (const t of temas) {
    for (const id of t.items) {
      if (estado.respuestas[id] || hechas.has(id) || !aplica(g, estado, id)) continue;
      const it = itemPorId(g, id);
      if (!it) continue;
      xs.push({ id, texto: it.texto, tema: t.id, intro: vistos.has(t.id) ? null : t.intro });
      vistos.add(t.id);
      if (xs.length >= n) return xs;
    }
  }
  return xs;
}

export function siguientePaso(g: Guion, estado: Estado): PasoTema | null {
  return siguientesPasos(g, estado, 1)[0] ?? null;
}

export function temaDe(g: Guion, id: string): string | null {
  return g.ia?.temas?.find((t) => t.items.includes(id))?.id ?? null;
}
