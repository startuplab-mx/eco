// El indicio de por qué se marcó roja una sesión: la categoría y una frase neutra del modelo.
// Nunca se guardan las palabras del joven; a la frase del modelo también se le quitan nombres y lugares.
import { CATEGORIAS_RIESGO, limpiarIndicio, type CategoriaRiesgo } from "./ia-tipos";
import { filtrarIdentificadores } from "./seguridad";

export function categoriaValida(x: unknown): CategoriaRiesgo | null {
  return typeof x === "string" && (CATEGORIAS_RIESGO as readonly string[]).includes(x) ? (x as CategoriaRiesgo) : null;
}

export function indicioSeguro(x: unknown): string | null {
  const t = limpiarIndicio(x);
  if (!t) return null;
  // Una frase neutra no lleva nombres propios: fuera toda palabra con mayúscula que no sea la primera.
  const sinNombres = filtrarIdentificadores(t).texto
    .replace(/\s*\[[^\]]*\]\s*/g, " ")
    .split(/\s+/)
    .filter((w, i) => i === 0 || !/^[A-ZÁÉÍÓÚÑ]/.test(w))
    .join(" ");
  const f = sinNombres
    .replace(/\b(tel|tel[eé]fono|cel|n[uú]m|calle|colonia|col)\.?\b/gi, "")
    .replace(/\s+([,.;:])/g, "$1")
    .replace(/(\b(en|de|la|el|los|las|del|al|y)\s*)+([,.;:]|$)/gi, "$3")
    .replace(/[,;:\s]+$/g, "")
    .replace(/,\s*,/g, ",")
    .replace(/\s+/g, " ")
    .trim();
  return f || null;
}
