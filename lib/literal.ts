// Lo que el joven dice tal cual manda: si escribe una opción de la escala con todas sus letras
// ("casi siempre", "a veces"), se registra esa, sin que el modelo la cambie. Y si no dice una
// frecuencia o una cantidad, una escala no se registra: no se adivina.
import type { Guion } from "./tipos";
import { opcionesCompletas, pasoPorId } from "./catalogo";
import { normalizar } from "./seguridad";

const limpio = (s: string) => normalizar(s).replace(/[^a-z0-9ñ ]/g, " ").replace(/\s+/g, " ").trim();

/** Palabras que dicen una frecuencia (E5), una cantidad (A5) o una intensidad (T5). */
const CUANTIFICA: Record<string, RegExp> = {
  E5: /\b(nunca|jamas|casi|a ?veces|aveces|seguido|siempre|diario|diaria|todos los dias|todo el tiempo|cada (rato|vez|dia|noche|semana)|de vez en cuando|rara vez|poco|poquito|mucho|bastante|frecuente|frecuencia|ningun|ninguna|nada|ya no|ultimamente|seguidito|casi no|no me pasa|nel|para nada)\b/,
  A5: /\b(nada|cero|poco|poquito|tantito|mas o menos|masomenos|maso|bastante|mucho|muchisimo|demasiado|muy|un chingo|totalmente|algo|regular|si|no|para nada|nel|simon|claro)\b/,
  T5: /\b(poquito|poco|tantito|mas o menos|masomenos|maso|fuerte|fuertisimo|mucho|demasiado|muy|nada|intenso|leve|bien|horrible|un chingo|\d+)\b/,
};

export function escalaDe(g: Guion, id: string): string | undefined {
  return pasoPorId(g, id)?.escala;
}

/** ¿El texto dice una frecuencia, cantidad o intensidad? (Sólo aplica a escalas; lo demás, sí.) */
export function cuantifica(g: Guion, id: string, texto: string): boolean {
  const e = escalaDe(g, id);
  const re = e ? CUANTIFICA[e] : undefined;
  if (!re) return true;
  const t = ` ${limpio(texto)} `;
  return re.test(t) || opcionesCompletas(g, id).some((o) => limpio(o.label).length > 1 && t.includes(` ${limpio(o.label)} `));
}

/**
 * La opción de la escala que escribió con todas sus letras, si es una sola ("pues casi siempre, sobre
 * todo de noche" → Casi siempre). Gana la más larga ("casi nunca" sobre "nunca"). En "qué tanto" y el
 * termómetro, sólo en respuestas cortas: "me da mucho miedo" no contesta "¿qué tanto vale la pena…?".
 */
export function opcionLiteral(g: Guion, id: string, texto: string): string | null {
  const e = escalaDe(g, id);
  if (!e) return null;
  const t = ` ${limpio(texto)} `;
  if (e !== "E5" && t.trim().split(" ").length > 6) return null;
  const ops = opcionesCompletas(g, id).map((o) => ({ id: o.id, l: limpio(o.label) })).filter((o) => o.l.length > 1);
  const hay = ops.filter((o) => t.includes(` ${o.l} `));
  const largas = hay.filter((o) => !hay.some((x) => x !== o && x.l !== o.l && ` ${x.l} `.includes(` ${o.l} `)));
  // "No es seguido" o "no siempre, a veces": con negación justo antes, no se toma literal.
  if (largas.length !== 1) return null;
  if (new RegExp(` (no|ni)( es| tan| muy| tanto)? ${largas[0].l} `).test(t)) return null;
  return largas[0].id;
}
