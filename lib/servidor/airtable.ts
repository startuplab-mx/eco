// Guarda el resumen anónimo de cada sesión en Airtable. Sólo corre en el servidor: la llave nunca llega al navegador.
// Reglas (decididas con el equipo):
// - Sin consentimiento no se guarda nada.
// - Sesión roja: sólo "hubo una en esta escuela esta semana" (tabla Sesiones rojas). Si ya se había guardado
//   algo de esa sesión, se borra.
// - Fecha: sólo el día, sin hora. Ningún texto escrito por el joven.
import "server-only";
import guionJson from "@/data/guion.json";
import type { Guion, Paso } from "@/lib/tipos";
import type { ResumenSesion } from "@/lib/indices";
import { semanaISO } from "@/lib/motor";

const g = guionJson as unknown as Guion;
// AIRTABLE_API_URL sólo se usa en pruebas locales con un Airtable simulado.
const API = process.env.AIRTABLE_API_URL ?? "https://api.airtable.com/v0";
const T_SESIONES = "Sesiones";
const T_ROJAS = "Sesiones rojas";

export function airtableDisponible(): boolean {
  return !!process.env.AIRTABLE_TOKEN && !!process.env.AIRTABLE_BASE;
}

// ——— De códigos del guion a las etiquetas que ve el equipo ———
function pasos(): Paso[] {
  return Object.values(g.bloques).flatMap((b) => b.pasos);
}
function etiquetas(idPaso: string): Record<string, string> {
  const p = pasos().find((x) => x.id === idPaso);
  const m: Record<string, string> = { otro: "Otro" };
  for (const o of p?.opciones ?? []) m[o.id] = o.label;
  return m;
}
const EDAD: Record<string, string> = {
  "12-14": "12 a 14", "15-16": "15 a 16", "17-18": "17 a 18", menor_12: "Menor de 12", adulto: "Adulto",
};
const MOTIVOS: Record<string, string> = {
  malestar_global: "Malestar global alto", desesperanza: "Desesperanza", presion: "Presión",
  termometro_alto: "Termómetro alto", sin_adulto_confiable: "Sin adulto confiable",
};
const MODULOS: Record<string, string> = {
  A: "A Escuela", B: "B Casa", C: "C Pérdidas", D: "D Autoestima", E: "E Estrés traumático",
  F: "F Consumo", G: "G Redes", H: "H Modelos", I: "I Confianza",
};
const INDICES: Record<string, string> = {
  V1: "V1 Exposición a violencia", V2: "V2 Miedo y ansiedad", V3: "V3 Tristeza y desesperanza", V4: "V4 Enojo",
  V5: "V5 Culpa y lealtad", V6: "V6 Normalización", V7: "V7 Presión", V8: "V8 Proyecto de vida",
  V11: "V11 Pertenencia escolar", V12: "V12 Clima familiar", V13: "V13 Autoestima", V14: "V14 Estrés traumático",
  V15: "V15 Consumo para afrontar", V16: "V16 Narcocultura en redes", V18: "V18 Resiliencia",
};

const uno = (mapa: Record<string, string>, v: unknown) => (typeof v === "string" && mapa[v]) || undefined;
const varios = (mapa: Record<string, string>, v: unknown) =>
  Array.isArray(v) ? [...new Set(v.map((x) => mapa[String(x)]).filter(Boolean))] : [];
const numero = (v: unknown, min: number, max: number) =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : undefined;

/** Día de hoy en México, sin hora (AAAA-MM-DD). */
export function diaMexico(fecha = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City", year: "numeric", month: "2-digit", day: "2-digit" }).format(fecha);
}

/** Semana ISO según el día en México (no en UTC), para que el domingo en la noche no caiga en la semana siguiente. */
export function semanaMexico(fecha = new Date()): string {
  return semanaISO(new Date(`${diaMexico(fecha)}T12:00:00Z`));
}

/**
 * Respuestas en códigos. Por si acaso, se descarta cualquier valor que parezca texto libre:
 * los valores válidos son números, ids cortos del guion o listas de ids.
 */
function respuestasSeguras(items: unknown): string {
  const limpio: Record<string, unknown> = {};
  if (items && typeof items === "object") {
    for (const [k, v] of Object.entries(items as Record<string, unknown>).slice(0, 120)) {
      if (!/^[A-Za-z0-9._]{1,40}$/.test(k)) continue;
      const corto = (x: unknown) => typeof x === "string" && /^[a-z0-9_\-]{1,30}$/.test(x);
      if (typeof v === "number" && Number.isFinite(v)) limpio[k] = v;
      else if (corto(v)) limpio[k] = v;
      else if (Array.isArray(v) && v.every(corto)) limpio[k] = v.slice(0, 15);
    }
  }
  return JSON.stringify(limpio);
}

/** Convierte el resumen en los campos de la tabla Sesiones. */
export function camposSesion(r: Partial<ResumenSesion>, escuela: string, hoy = new Date()): Record<string, unknown> {
  const campos: Record<string, unknown> = {
    "Código": r.codigo,
    Escuela: escuela,
    Fecha: diaMexico(hoy),
    Semana: semanaMexico(hoy),
    "Versión del guion": typeof r.versionGuion === "string" ? r.versionGuion.slice(0, 10) : undefined,
    Edad: uno(EDAD, r.edad),
    "Género": uno(etiquetas("da_genero"), r.genero),
    "Vive con": varios(etiquetas("da_vive"), r.vive),
    Emociones: varios(etiquetas("en_emociones"), r.emociones),
    "Nombró su emoción": r.emocionEscrita === true,
    "Sensación": uno(etiquetas("en_sensacion"), r.sensacion),
    "Termómetro inicial": numero(r.termometroInicial, 1, 5),
    "Termómetro final": numero(r.termometroFinal, 1, 5),
    "Cambio emocional": numero(r.cambioEmocional, -4, 4),
    "Zona del cuerpo": varios(etiquetas("en_cuerpo"), r.zonaCuerpo),
    "Desde cuándo": uno(etiquetas("en_tiempo"), r.tiempo),
    "Ámbito": uno(etiquetas("en_ambito"), r.ambito),
    Nivel: r.nivel === "amarillo" ? "Amarillo" : r.nivel === "verde" ? "Verde" : undefined,
    "Motivos del nivel": varios(MOTIVOS, r.motivos),
    "Malestar global": numero(r.malestarGlobal, 0, 100),
    "Temas abiertos": varios(MODULOS, r.modulos),
    "Respuestas escritas": numero(r.textosEscritos, 0, 500),
    "Cómo termina": uno(etiquetas("ci_ahora"), r.comoTermina),
    Completa: r.completa === true,
    "Último bloque": typeof r.ultimoBloque === "string" && /^[a-zA-Z0-9_]{1,20}$/.test(r.ultimoBloque) ? r.ultimoBloque : undefined,
    "Desvíos": numero(r.desvios, 0, 500),
    "Preguntas saltadas": numero(r.omitidas, 0, 500),
    "Revisar calidad": r.revisarCalidad === true,
    "Respuestas (datos)": respuestasSeguras(r.items),
  };
  for (const [k, nombre] of Object.entries(INDICES)) campos[nombre] = numero(r.indices?.[k], 0, 100);
  for (const k of Object.keys(campos)) if (campos[k] === undefined) delete campos[k];
  return campos;
}

// ——— Llamadas a Airtable ———
async function pedir(ruta: string, init: RequestInit): Promise<Response> {
  const url = `${API}/${process.env.AIRTABLE_BASE}/${ruta}`;
  const headers = { Authorization: `Bearer ${process.env.AIRTABLE_TOKEN}`, "Content-Type": "application/json" };
  // Airtable acepta 5 llamadas por segundo por base: si un salón termina a la vez, se reintenta con espera.
  for (let intento = 0; ; intento++) {
    const res = await fetch(url, { ...init, headers, signal: AbortSignal.timeout(8000) });
    if (res.status !== 429 || intento >= 3) return res;
    await new Promise((ok) => setTimeout(ok, 1200 * 2 ** intento + Math.random() * 500));
  }
}

/** Crea o actualiza la fila de la sesión (por su código). Devuelve el id de la fila. */
export async function guardarSesion(campos: Record<string, unknown>): Promise<string | null> {
  const res = await pedir(encodeURIComponent(T_SESIONES), {
    method: "PATCH",
    body: JSON.stringify({ performUpsert: { fieldsToMergeOn: ["Código"] }, typecast: false, records: [{ fields: campos }] }),
  });
  if (!res.ok) throw new Error(`Airtable ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const d = (await res.json()) as { records?: { id: string }[] };
  return d.records?.[0]?.id ?? null;
}

/** Registra una sesión roja: sólo escuela y semana. Si había una fila parcial de esa sesión, se borra. */
export async function registrarRoja(escuela: string, filaPrevia: string | null, hoy = new Date()): Promise<void> {
  const res = await pedir(encodeURIComponent(T_ROJAS), {
    method: "POST",
    body: JSON.stringify({ records: [{ fields: { Escuela: escuela, Semana: semanaMexico(hoy) } }] }),
  });
  if (!res.ok) throw new Error(`Airtable ${res.status}: ${(await res.text()).slice(0, 200)}`);
  if (filaPrevia && /^rec[A-Za-z0-9]{14}$/.test(filaPrevia)) {
    const b = await pedir(`${encodeURIComponent(T_SESIONES)}/${filaPrevia}`, { method: "DELETE" });
    if (!b.ok && b.status !== 404) throw new Error(`Airtable borrar ${b.status}`);
  }
}
