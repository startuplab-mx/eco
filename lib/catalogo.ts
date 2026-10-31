// Catálogo de lo que la IA puede preguntar en la fase de conversación, tomado del guion.
// La IA decide el orden y las palabras; las opciones y sus valores son siempre las del guion.
import type { Estado, Guion, Opcion, Paso } from "./tipos";
import { noAplica, opcionesDe } from "./motor";
import { normalizar } from "./seguridad";
import { opcionParecida } from "./ortografia";

export interface ItemCatalogo {
  id: string;
  bloque: string;
  /** Letra del módulo opcional (A–I) o null. */
  modulo: string | null;
  /** Cuenta para la cobertura (el 80%). */
  nucleo: boolean;
  tema: string;
  /** Redacción de referencia (la del guion). */
  texto: string;
  tipo: "opcion" | "multiple" | "abierta";
  opciones: { id: string; label: string }[];
}

/** Pasos que no son preguntas de contenido: ofertas de ejercicio, entradas a temas, ayudas. */
const EXCLUIR = new Set([
  "en_respirar", "en_regular", "en_validacion", "en_puente", "mc_entrar", "me_psicologo", "md_bien_ayuda",
]);
const BLOQUES = ["entrada", "V1", "V2", "V3", "V4", "V5", "V6", "V7", "V8", "V9", "A", "B", "C", "D", "E", "F", "G", "H", "I"];

let cache: { g: Guion; items: ItemCatalogo[] } | null = null;

export function catalogo(g: Guion): ItemCatalogo[] {
  if (cache?.g === g) return cache.items;
  const nucleo = new Set(g.nucleo ?? []);
  const items: ItemCatalogo[] = [];
  for (const bid of BLOQUES) {
    const b = g.bloques[bid];
    if (!b) continue;
    for (const p of b.pasos) {
      if (EXCLUIR.has(p.id) || !["opcion", "multiple", "abierta"].includes(p.tipo)) continue;
      const textos = (Array.isArray(p.texto) ? p.texto : [p.texto ?? ""]).map((t) =>
        t.replace("{emocion}", "lo que sientes").replace("{validacion}", "").trim(),
      );
      items.push({
        id: p.id,
        bloque: bid,
        modulo: b.clase === "modulo" ? bid : null,
        nucleo: nucleo.has(p.id),
        tema: b.nombre,
        texto: textos.filter(Boolean).join(" "),
        tipo: p.tipo as ItemCatalogo["tipo"],
        opciones: opcionesDe(g, p).map((o) => ({ id: o.id, label: o.label })),
      });
    }
  }
  cache = { g, items };
  return items;
}

export function itemPorId(g: Guion, id: string | null | undefined): ItemCatalogo | undefined {
  return id ? catalogo(g).find((x) => x.id === id) : undefined;
}

function pasoPorId(g: Guion, id: string): Paso | undefined {
  return Object.values(g.bloques).flatMap((b) => b.pasos).find((p) => p.id === id);
}

/**
 * Registra una respuesta de la fase con IA con el mismo formato que el motor (valor y número de la escala),
 * para que índices, resumen y Airtable no cambien. Devuelve false si el valor no es válido para ese ítem.
 */
export function registrar(g: Guion, estado: Estado, id: string, valor: string | string[], texto?: string): boolean {
  const it = itemPorId(g, id);
  const p = pasoPorId(g, id);
  if (!it || !p) return false;
  const ids = (Array.isArray(valor) ? valor : [valor]).map(String);
  if (it.tipo === "abierta") {
    if (ids[0] === "omitida") return omitir(estado, id);
    // Si eligió una frase sugerida, se guarda su id; si escribió, sólo que escribió.
    const frase = it.opciones.find((o) => o.id === ids[0]);
    estado.respuestas[id] = { valor: frase ? frase.id : "texto" };
    if (!frase && texto) estado.textos[id] = texto;
  } else {
    const ops: Opcion[] = opcionesDe(g, p);
    const validos = ids.filter((x) => ops.some((o) => o.id === x));
    if (!validos.length) return false;
    if (it.tipo === "opcion") {
      const o = ops.find((x) => x.id === validos[0])!;
      estado.respuestas[id] = { valor: o.id, num: o.valor };
    } else {
      estado.respuestas[id] = { valor: [...new Set(validos)] };
    }
  }
  if (it.modulo && !estado.modulosHechos.includes(it.modulo)) estado.modulosHechos.push(it.modulo);
  if (it.modulo && estado.ia && !estado.ia.opcionales.includes(it.modulo)) estado.ia.opcionales.push(it.modulo);
  return true;
}

export function omitir(estado: Estado, id: string): boolean {
  if (estado.respuestas[id]) return false;
  estado.respuestas[id] = { valor: "omitida" };
  if (!estado.omitidas.includes(id)) estado.omitidas.push(id);
  return true;
}

/**
 * Sin modelo: intenta leer el texto como una de las opciones del ítem (número de escala, etiqueta
 * o palabra clave). Es el respaldo cuando la IA no responde.
 */
export function leerLocal(g: Guion, id: string, texto: string): string[] {
  const it = itemPorId(g, id);
  if (!it || it.tipo === "abierta") return [];
  const t = normalizar(texto);
  const exactas = it.opciones.filter((o) => {
    const l = normalizar(o.label);
    return t === l || (l.length >= 4 && new RegExp(`(^|\\s)${l.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\s|$)`).test(t));
  });
  if (exactas.length || it.tipo !== "opcion") return exactas.map((o) => o.id);
  const parecida = opcionParecida(opcionesCompletas(g, id), texto);
  return parecida ? [parecida] : [];
}

/** Opciones del paso con sus sinónimos (el catálogo sólo guarda id y etiqueta). */
export function opcionesCompletas(g: Guion, id: string): Opcion[] {
  for (const b of Object.values(g.bloques)) {
    const p = b.pasos.find((x) => x.id === id);
    if (p) return opcionesDe(g, p);
  }
  return [];
}

/** Cobertura del núcleo: contestadas (no omitidas) sobre las que aplican a esta persona. */
export function cobertura(g: Guion, estado: Estado): { contestadas: number; total: number } {
  const n = (g.nucleo ?? []).filter((id) => !noAplica(g, estado, id));
  return { contestadas: n.filter((id) => estado.respuestas[id] && estado.respuestas[id].valor !== "omitida").length, total: n.length };
}
