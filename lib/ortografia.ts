// Lectura tolerante a faltas de ortografía: "Aveces", "Nunka", "Masomenos", "Kasi siempre", "Bastate".
// Sólo para respuestas cortas que se parecen a UNA de las opciones de la pregunta. Si dos se parecen igual, no adivina.
import type { Opcion } from "./tipos";
import { normalizar } from "./seguridad";

/** Clave sonora: sin acentos, sin espacios ni h, y con las confusiones típicas unificadas (v/b, s/z/c, k/qu/c, ll/y). */
export function clave(texto: string): string {
  return normalizar(texto)
    .replace(/[^a-z0-9ñ]/g, "")
    .replace(/h/g, "")
    .replace(/qu/g, "k")
    .replace(/c(?=[ei])/g, "s")
    .replace(/c/g, "k")
    .replace(/z/g, "s")
    .replace(/v/g, "b")
    .replace(/ll/g, "y")
    .replace(/(.)\1+/g, "$1");
}

export function distancia(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

/** Letras de diferencia que se aceptan según el largo: corto = sólo la clave exacta. */
const tolerancia = (n: number) => (n <= 4 ? 0 : n <= 7 ? 1 : 2);

/**
 * La opción a la que se parece una respuesta corta (hasta 4 palabras), comparando con su etiqueta y sus sinónimos.
 * Devuelve el id sólo si una opción queda claramente más cerca que las demás.
 * Con maxDistancia = 0 sólo acepta la misma respuesta salvo ortografía ("kasi nunca" = "casi nunca").
 */
export function opcionParecida(opciones: Opcion[], texto: string, maxDistancia?: number): string | undefined {
  const t = texto.trim().replace(/[.!¡¿?]+/g, "");
  if (!t || t.split(/\s+/).length > 4) return undefined;
  const k = clave(t);
  if (k.length < 3) return undefined;
  let mejor: { id: string; d: number } | null = null;
  let empate = false;
  for (const o of opciones) {
    const formas = [o.label, ...(o.sinonimos ?? []).map((s) => s.replace(/\*$/, ""))];
    const d = Math.min(...formas.map((f) => distancia(k, clave(f))));
    if (d > (maxDistancia ?? tolerancia(k.length))) continue;
    if (!mejor || d < mejor.d) { mejor = { id: o.id, d }; empate = false; }
    else if (d === mejor.d && o.id !== mejor.id) empate = true;
  }
  return mejor && !empate ? mejor.id : undefined;
}
