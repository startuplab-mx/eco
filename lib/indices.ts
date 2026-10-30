// Índices, nivel de riesgo y resumen de sesión.
// El resumen es lo único que sale del navegador: números y categorías, sin texto.

import type { Estado, Guion, Instancia, Nivel, Paso } from "./tipos";

/** Umbrales del protocolo amarillo (documento, sección 5). */
export const UMBRALES = {
  termometro: 9, // termómetro inicial 9–10
  desesperanza: 3, // "Seguido" o más
  malestar: 60, // malestar global > 60/100
  presion: 3, // presión de riesgo "Seguido" o más
};

function pasos(g: Guion): Paso[] {
  return Object.values(g.bloques).flatMap((b) => b.pasos);
}

/** Índice 0–100 por variable: promedio de ítems en escala E5 o A5. */
export function indices(g: Guion, estado: Estado): Record<string, number> {
  const acum: Record<string, number[]> = {};
  for (const p of pasos(g)) {
    if (!p.variable || (p.escala !== "E5" && p.escala !== "A5")) continue;
    const n = estado.respuestas[p.id]?.num;
    if (n === undefined) continue;
    (acum[p.variable] ??= []).push(p.invertido ? 4 - n : n);
  }
  const out: Record<string, number> = {};
  for (const [v, xs] of Object.entries(acum)) {
    out[v] = Math.round((xs.reduce((a, b) => a + b, 0) / xs.length / 4) * 100);
  }
  return out;
}

/** Malestar emocional global = promedio de los índices V2 a V5 disponibles. */
export function malestarGlobal(idx: Record<string, number>): number | null {
  const xs = ["V2", "V3", "V4", "V5"].map((v) => idx[v]).filter((x) => x !== undefined);
  if (!xs.length) return null;
  return Math.round(xs.reduce((a, b) => a + b, 0) / xs.length);
}

export function calcularNivel(g: Guion, estado: Estado): { nivel: Nivel; motivos: string[] } {
  if (estado.rojo) return { nivel: "rojo", motivos: ["alarma"] };
  const r = estado.respuestas;
  const motivos: string[] = [];
  if ((r["en_termometro"]?.num ?? 0) >= UMBRALES.termometro) motivos.push("termometro_alto");
  if ((r["v3_desesperanza"]?.num ?? 0) >= UMBRALES.desesperanza) motivos.push("desesperanza");
  const m = malestarGlobal(indices(g, estado));
  if (m !== null && m > UMBRALES.malestar) motivos.push("malestar_global");
  if ((r["v7_presion"]?.num ?? 0) >= UMBRALES.presion) motivos.push("presion");
  if (r["v9_adulto"]?.valor === "no") motivos.push("sin_adulto_confiable");
  return { nivel: motivos.length ? "amarillo" : "verde", motivos };
}

export interface ResumenSesion {
  codigo: string;
  semana: string;
  escuela: string;
  versionGuion: string;
  edad: string | null;
  genero: string | null;
  vive: string[];
  emociones: string[];
  /** El joven nombró su emoción con sus palabras (V20, reconocimiento emocional). */
  emocionEscrita: boolean;
  sensacion: string | null;
  termometroInicial: number | null;
  termometroFinal: number | null;
  cambioEmocional: number | null;
  zonaCuerpo: string[];
  tiempo: string | null;
  ambito: string | null;
  items: Record<string, string | string[] | number>;
  indices: Record<string, number>;
  malestarGlobal: number | null;
  nivel: Nivel;
  motivos: string[];
  modulos: string[];
  textosEscritos: number;
  recursos: string[];
  comoTermina: string | null;
  completa: boolean;
  /** Último bloque al que llegó: sirve para ver dónde abandonan. */
  ultimoBloque: string | null;
  /** Respuestas desviadas (sin sentido, groserías, fuera de tema) y preguntas saltadas. */
  /** Si aceptó participar. Sin consentimiento, el equipo no debe usar el resto del resumen. */
  consintio: boolean;
  /** Edad fuera de 12–18: la sesión no se suma a los indicadores de la escuela. */
  fueraDeEdad: boolean;
  desvios: number;
  omitidas: number;
  /** Sesión a revisar antes de incluirla en el análisis (3 o más desvíos). */
  revisarCalidad: boolean;
}

export function resumen(g: Guion, inst: Instancia, estado: Estado): ResumenSesion {
  const r = estado.respuestas;
  const str = (id: string) => (typeof r[id]?.valor === "string" ? (r[id].valor as string) : null);
  const arr = (id: string) => (Array.isArray(r[id]?.valor) ? (r[id].valor as string[]) : []);
  const num = (id: string) => r[id]?.num ?? null;

  const items: ResumenSesion["items"] = {};
  for (const p of pasos(g)) {
    if (!p.item || !r[p.id]) continue;
    // Las abiertas sólo registran si se escribió o no; el texto no sale de aquí.
    items[p.item] = r[p.id].num ?? r[p.id].valor;
  }
  const idx = indices(g, estado);
  const ini = num("en_termometro");
  const fin = num("ci_termometro");
  const { nivel, motivos } = calcularNivel(g, estado);

  return {
    codigo: estado.codigo,
    semana: estado.semana,
    escuela: inst.escuela,
    versionGuion: g.version,
    edad: str("da_edad"),
    genero: str("da_genero"),
    vive: arr("da_vive"),
    emociones: arr("en_emociones"),
    emocionEscrita: "en_emociones" in estado.textos,
    sensacion: str("en_sensacion"),
    termometroInicial: ini,
    termometroFinal: fin,
    cambioEmocional: ini !== null && fin !== null ? ini - fin : null,
    zonaCuerpo: arr("en_cuerpo"),
    tiempo: str("en_tiempo"),
    ambito: str("en_ambito"),
    items,
    indices: idx,
    malestarGlobal: malestarGlobal(idx),
    nivel,
    motivos,
    modulos: estado.modulosHechos,
    textosEscritos: Object.keys(estado.textos).length,
    recursos: estado.recursos,
    comoTermina: str("ci_ahora"),
    completa: estado.completa,
    ultimoBloque: estado.bloque ?? estado.bloquesHechos[estado.bloquesHechos.length - 1] ?? null,
    consintio:
      estado.respuestas["bi_consentimiento"]?.valor === "si" || estado.respuestas["bi_consentimiento2"]?.valor === "si",
    fueraDeEdad: ["menor_12", "mayor_18"].includes(String(estado.respuestas["da_edad"]?.valor)),
    desvios: estado.desviosTotal,
    omitidas: estado.omitidas.length,
    revisarCalidad: estado.desviosTotal >= 3,
  };
}
