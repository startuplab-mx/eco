// Orden de la plática con IA: siete temas fijos. Se termina un tema antes de pasar al siguiente y cada
// tema abre con su introducción (una sola vez). Las preguntas se muestran tal cual están en el guion,
// para que todos los jóvenes contesten lo mismo y se pueda comparar.
import type { Estado, Guion, Paso } from "./tipos";
import { emocionesElegidas, evaluar } from "./motor";
import { catalogo, itemPorId } from "./catalogo";

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
  const contestada = (x: string) => !!estado.respuestas[x] && estado.respuestas[x].valor !== "omitida";
  if (!pasosDe(c).every(contestada)) return false;
  return evaluar(g, estado, c);
}

/** Las preguntas de las que depende una condición (también dentro de "no", "todos", "alguno"). */
function pasosDe(c: unknown): string[] {
  if (!c || typeof c !== "object") return [];
  const o = c as Record<string, unknown>;
  const xs = typeof o.paso === "string" ? [o.paso] : [];
  for (const k of ["no", "todos", "alguno"]) {
    const v = o[k];
    if (Array.isArray(v)) v.forEach((x) => xs.push(...pasosDe(x)));
    else if (v) xs.push(...pasosDe(v));
  }
  return xs;
}

/** Los temas en orden: los siete del guion y, si dijo que sí, el módulo elegido. */
function temasEnOrden(g: Guion, estado: Estado): { id: string; intro: string | null; items: string[] }[] {
  const xs: { id: string; intro: string | null; items: string[] }[] = [...(g.ia?.temas ?? [])];
  const m = estado.ia?.modulo;
  if (m && estado.ia?.continuar) {
    const b = g.bloques[m];
    // La entrada de C ("un tema que puede ser difícil… ¿quieres hablar de eso?") ya se le hizo al preguntarle si sigue.
    const intro = m === "C" ? null : g.ia?.introModulos?.[m] ?? (b.pasos.find((p) => p.tipo === "mensaje" && typeof p.texto === "string")?.texto as string | undefined) ?? null;
    xs.push({ id: `mod_${m}`, intro, items: catalogo(g).filter((x) => x.bloque === m).map((x) => x.id) });
  }
  return xs;
}

/** Las siguientes preguntas en orden (hasta n), con la introducción del tema donde toca. */
export function siguientesPasos(g: Guion, estado: Estado, n = 3): PasoTema[] {
  const temas = temasEnOrden(g, estado);
  const vistos = new Set(estado.ia?.temas ?? []);
  const hechas = new Set(estado.ia?.preguntados ?? []);
  const xs: PasoTema[] = [];
  for (const t of temas) {
    for (const id of t.items) {
      if (estado.respuestas[id] || hechas.has(id) || !aplica(g, estado, id)) continue;
      const it = itemPorId(g, id);
      if (!it) continue;
      xs.push({ id, texto: it.texto, tema: t.id, intro: vistos.has(t.id) ? null : t.intro || null });
      vistos.add(t.id);
      if (xs.length >= n) return xs;
    }
  }
  return xs;
}

export function siguientePaso(g: Guion, estado: Estado): PasoTema | null {
  return siguientesPasos(g, estado, 1)[0] ?? null;
}

/** Después de los temas: el módulo que más tiene que ver con lo que contó, o null. */
export function elegirModulo(g: Guion, estado: Estado): string | null {
  if (estado.rojo) return null;
  const esModulo = (x: string) => g.bloques[x]?.clase === "modulo" && !estado.modulosHechos.includes(x);
  const ambito = estado.respuestas["en_ambito"]?.valor as string | undefined;
  const elegidas = g.ruta.prioridad.filter((e) => emocionesElegidas(estado).includes(e));
  const candidatos = [
    // Primero por lo que cree que le hace sentir así, luego por su emoción principal.
    ...(ambito ? g.ruta.porAmbito[ambito] ?? [] : []),
    ...elegidas.flatMap((e) => g.ruta.porEmocion[e] ?? []),
    // Sin pista: lo bueno de ti y lo que sueñas (pedir ayuda ya se platicó en «Con quién cuentas»).
    "D", "H",
  ];
  return candidatos.find(esModulo) ?? null;
}
