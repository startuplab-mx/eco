// Contratos entre el chat y la capa de IA. Se usan en el navegador y en el servidor.

export interface PedidoInterpretar {
  codigo: string;
  /** Pregunta tal como la vio el joven. */
  pregunta: string;
  tipo: "opcion" | "multiple" | "abierta" | "numero" | "ejercicio";
  opciones: { id: string; label: string }[];
  /** Texto del joven, ya sin nombres, teléfonos ni direcciones. */
  texto: string;
}

export type TipoRespuesta =
  | "responde" | "sin_sentido" | "groseria" | "fuera_de_tema"
  | "no_quiere" | "se_quiere_ir" | "privacidad" | "pide_orientacion";
export const TIPOS_RESPUESTA: TipoRespuesta[] = [
  "responde", "sin_sentido", "groseria", "fuera_de_tema", "no_quiere", "se_quiere_ir", "privacidad", "pide_orientacion",
];

export interface RespuestaInterpretar {
  /** Qué clase de respuesta es (para la escalera de desvíos). */
  tipo?: TipoRespuesta;
  /** Señal de riesgo que activa el protocolo rojo. */
  riesgo: boolean;
  /** Opciones que corresponden a lo escrito (vacío si no queda claro). */
  opciones: string[];
  /** Repregunta breve cuando no queda claro. */
  repregunta: string | null;
  /** Lo que respondió, en frase breve, cuando no corresponde a ninguna opción ("en la rodilla"). */
  otro?: string | null;
}

export interface PedidoRedactar {
  codigo: string;
  /** Últimos mensajes de la plática, ya filtrados. */
  historial: { quien: "eco" | "joven"; texto: string }[];
  /** Lo que el guion diría en este momento: el sentido que hay que conservar. */
  base: string[];
  /** Siguiente pregunta (va literal después del puente; no se repite). */
  siguiente: string | null;
}

export interface RespuestaRedactar {
  /** Frase de puente o null si hay que usar el texto del guion. */
  puente: string | null;
}

/** Lo que el turno necesita de la IA. Si devuelve null, se usa el guion. */
export interface ServicioIA {
  interpretar(p: PedidoInterpretar): Promise<RespuestaInterpretar | null>;
  redactar(p: PedidoRedactar): Promise<RespuestaRedactar | null>;
}

// ---------- validación de lo que escribe el modelo ----------

const PROHIBIDO =
  /por ?qu[eé]|denunci|089|polic|c[aá]rtel|narco|delito|crimen|droga|deber[ií]as|tienes que|te recomiendo|te aconsejo|diagn[oó]stic|depresi[oó]n|trastorno|ansiedad generalizada|\/a\b|\/o\b|\[|\]|https?:|@/i;

/** Adjetivos con género dirigidos al joven ("estás tranquila", "te sientes solo"). */
const CON_GENERO =
  /\b(est[aá]s|est[eé]s|te sientes|te sientas|eres|seas|andas|te quedas|sigues|te ves)\s+(muy\s+|tan\s+|un poco\s+|medio\s+|bien\s+)?(tranquil|content|cansad|sol|preocupad|enojad|enfadad|asustad|aburrid|nervios|agobiad|confundid|avergonzad|emocionad|segur|insegur|perdid|list|agotad|estresad|desesperad|frustrad|desanimad|deprimid|aislad|valios|fuert|bienvenid)[oa]s?\b/i;

/** Puente válido: 1–2 frases, sin preguntas, sin palabras prohibidas. */
export function validarPuente(texto: unknown): string | null {
  if (typeof texto !== "string") return null;
  const t = texto.trim().replace(/^["“«]|["”»]$/g, "").trim();
  if (!t || t.length > 240) return null;
  if (/[?¿]/.test(t)) return null;
  if (PROHIBIDO.test(t) || CON_GENERO.test(t)) return null;
  const frases = t.split(/[.!¡]+/).filter((f) => f.trim().length > 0);
  if (frases.length > 2) return null;
  if (frases.some((f) => f.trim().split(/\s+/).length > 22)) return null;
  if (t.split(/\s+/).length > 32) return null;
  return t;
}

/** Repregunta válida: corta, termina en pregunta, sin palabras prohibidas (salvo "por qué", también prohibido). */
export function validarRepregunta(texto: unknown): string | null {
  if (typeof texto !== "string") return null;
  const t = texto.trim();
  if (!t || t.length > 170 || !t.includes("?")) return null;
  if (PROHIBIDO.test(t) || CON_GENERO.test(t)) return null;
  return t;
}

/** Frase breve para "otro": máximo 6 palabras, sin preguntas ni palabras prohibidas. */
export function validarFrase(texto: unknown): string | null {
  if (typeof texto !== "string") return null;
  const t = texto.trim().replace(/[.。]+$/, "").replace(/^["“«]|["”»]$/g, "").trim();
  if (!t || t.length > 50 || t.split(/\s+/).length > 6) return null;
  if (/[?¿]/.test(t) || PROHIBIDO.test(t) || CON_GENERO.test(t)) return null;
  return t.charAt(0).toLowerCase() + t.slice(1);
}
