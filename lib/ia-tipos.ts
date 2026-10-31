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

/** Un turno de la fase en que la IA conduce. El servidor arma el catálogo; aquí sólo van ids. */
export interface PedidoConversar {
  codigo: string;
  /** Últimos mensajes de la plática con IA, ya filtrados. */
  historial: { quien: "eco" | "joven"; texto: string }[];
  /** Lo que escribió el joven, ya filtrado (null si sólo tocó una etiqueta). */
  texto: string | null;
  /** Pregunta medida que estaba contestando, si la había. */
  item: string | null;
  /** Ítems ya contestados u omitidos. */
  cubiertos: string[];
  /** Preguntas que Eco ya hizo (contestadas o no): no se vuelven a hacer. */
  preguntados?: string[];
  /** Módulos opcionales ya tocados. */
  opcionales: string[];
  turnos: number;
  maxTurnos: number;
  /** Termómetro alto: ofrecer respiración en este turno. */
  respiracion: "no" | "pendiente" | "ofrecida";
  ejercicios: string[];
  /** Ejercicios ya ofrecidos (aceptados o no). */
  ofrecidos?: string[];
  /** Las siguientes preguntas del guion, en orden, con la introducción del tema donde toca. Las pone el sistema tal cual. */
  siguientes?: { id: string; texto: string; intro: string | null }[];
  /** Puede quedarse escuchando en este turno (máximo 2 turnos seguidos). */
  puedeEscuchar?: boolean;
  /** La pregunta en curso todavía admite una aclaración ("¿Cuál de estas se parece más?"). */
  puedeAclarar?: boolean;
}

/**
 * Qué hace Eco en este turno:
 * - seguir: frase puente (puede ir vacía) y luego el sistema pone la intro del tema y la siguiente pregunta, tal cual;
 * - escuchar: sólo escucha e invita a seguir contando; no hay pregunta medida;
 * - responder: contesta una duda o redirige; la pregunta en curso sigue en pantalla con sus botones;
 * - aclarar: no se entendió la respuesta a una pregunta de botones; se pide una sola vez que elija.
 */
export type ModoTurno = "seguir" | "escuchar" | "responder" | "aclarar";

export interface RespuestaConversar {
  riesgo: boolean;
  tipo: TipoRespuesta;
  /** Respuestas que se desprenden de lo que escribió. */
  respuestas: { id: string; valor: string[] }[];
  /** Lo que dice Eco antes de lo que pone el sistema (null en crisis; "" si no hace falta decir nada). */
  mensaje: string | null;
  modo: ModoTurno;
  ejercicio: string | null;
  /** Ejercicio que se ofrece: el sistema agrega qué es, para qué sirve y los botones Sí / Ahora no. */
  ofrecer?: string | null;
  /** El mensaje lo escribió el guion porque la IA no dio uno válido. */
  respaldo?: boolean;
  /** En este mensaje se ofreció la respiración por termómetro alto. */
  respiracion?: "ofrecida";
}

/** Lo que el turno necesita de la IA. Si devuelve null, se usa el guion. */
export interface ServicioIA {
  interpretar(p: PedidoInterpretar): Promise<RespuestaInterpretar | null>;
  redactar(p: PedidoRedactar): Promise<RespuestaRedactar | null>;
  conversar?(p: PedidoConversar): Promise<RespuestaConversar | null>;
}

// ---------- validación de lo que escribe el modelo ----------

const PROHIBIDO =
  /por ?qu[eé]|denunci|089|polic|c[aá]rtel|narco|delito|crimen|droga|deber[ií]as|tienes que|te recomiendo|te aconsejo|diagn[oó]stic|depresi[oó]n|trastorno|ansiedad generalizada|\/a\b|\/o\b|\[|\]|https?:|@/i;

/** Adjetivos con género dirigidos al joven ("estás tranquila", "te sientes solo"). */
const CON_GENERO =
  /\b(est[aá]s|est[eé]s|te sientes|te sientas|eres|seas|andas|te quedas|sigues|te ves)\s+(muy\s+|tan\s+|un poco\s+|medio\s+|bien\s+)?(tranquil|content|cansad|sol|preocupad|enojad|enfadad|asustad|aburrid|nervios|agobiad|confundid|avergonzad|emocionad|segur|insegur|perdid|list|agotad|estresad|desesperad|frustrad|desanimad|deprimid|aislad|valios|fuert|bienvenid)[oa]s?\b/i;

/** Adjetivos con género en cualquier posición ("te noto cansado", "ansioso"). */
const GENERO_SUELTO =
  /\b(ansios|cansad|preocupad|enojad|enfadad|asustad|aburrid|nervios|agobiad|confundid|avergonzad|emocionad|deprimid|desanimad|frustrad|estresad|agotad|aislad|tranquil|content|insegur|perdid|solit|abandonad|lastimad|herid|amenazad|obligad|encabronad|agüitad|aguitad|bajonead|apenad|apachurrad|harta|harto|sola|solas|solos)[oa]?s?\b/i;

/** Consejos, órdenes o datos que el modelo no debe dar en un puente. */
const CONSEJO =
  /\b(lo mejor es|lo mejor seria|deberias|tendrias|te sugiero|te recomiendo|intenta|trata de|procura|habla con|hablale|llama|llamale|marca|busca a|buscala|buscalo|denuncia|no dejes)\b|\d{3,}/i;

/** Preguntas que piden detalles o juzgan: nunca se las hace Eco. */
const PREGUNTA_PROHIBIDA =
  /(qui[eé]n|c[oó]mo se llama|d[oó]nde|qu[eé] pas[oó]|cu[eé]ntame|a qu[eé] se debe|por qu[eé]|de qu[eé] escuela|en qu[eé] colonia)/i;

function sinAcentos(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/** Puente válido: 1–2 frases, sin preguntas, sin palabras prohibidas. */
export function validarPuente(texto: unknown): string | null {
  if (typeof texto !== "string") return null;
  const t = texto.trim().replace(/^["“«]|["”»]$/g, "").trim();
  if (!t || t.length > 240) return null;
  if (/[?¿]/.test(t)) return null;
  if (PROHIBIDO.test(t) || CON_GENERO.test(t) || GENERO_SUELTO.test(t) || CONSEJO.test(sinAcentos(t))) return null;
  const frases = t.split(/[.!¡]+/).filter((f) => f.trim().length > 0);
  if (frases.length > 2) return null;
  if (frases.some((f) => f.trim().split(/\s+/).length > 22)) return null;
  if (t.split(/\s+/).length > 32) return null;
  return t;
}

/**
 * Repregunta válida: corta, en pregunta, y sólo para ayudar a elegir: debe mencionar al menos dos de las
 * opciones con su texto. Nunca pide detalles (quién, dónde, qué pasó) ni pregunta "por qué".
 */
export function validarRepregunta(texto: unknown, opciones: { label: string }[] = []): string | null {
  if (typeof texto !== "string") return null;
  const t = texto.trim();
  if (!t || t.length > 170 || !t.includes("?")) return null;
  if (PROHIBIDO.test(t) || CON_GENERO.test(t) || GENERO_SUELTO.test(t) || PREGUNTA_PROHIBIDA.test(t) || CONSEJO.test(sinAcentos(t))) return null;
  const n = sinAcentos(t);
  const mencionadas = opciones.filter((o) => {
    const l = sinAcentos(o.label).replace(/^\d+\s*/, "").trim();
    return l.length > 1 && n.includes(l);
  }).length;
  if (mencionadas < Math.min(2, opciones.length)) return null;
  return t;
}

/** Frase breve para "otro": máximo 6 palabras, sin preguntas ni palabras prohibidas. */
export function validarFrase(texto: unknown): string | null {
  if (typeof texto !== "string") return null;
  const t = texto.trim().replace(/[.。]+$/, "").replace(/^["“«]|["”»]$/g, "").trim();
  if (!t || t.length > 50 || t.split(/\s+/).length > 6) return null;
  if (/[?¿]/.test(t) || PROHIBIDO.test(t) || CON_GENERO.test(t) || GENERO_SUELTO.test(t) || /\d{3,}/.test(t)) return null;
  return t.charAt(0).toLowerCase() + t.slice(1);
}

// ---------- validación del mensaje cuando la IA conduce ----------

/** Preguntas que Eco nunca hace: detalles que identifican, qué pasó, por qué. */
// "porque" (causal, sin espacio) sí se permite; "¿por qué…?" no. "¿A quién admiras?" sí; "¿Quién te hizo…?" no.
const TEMAS_FUERA = /denunci|\b089\b|polic[ií]a|c[aá]rtel|narco|delito|crimen|diagn[oó]stic|depresi[oó]n|trastorno|https?:|@|\[|\]|\/a\b|\/o\b/i;
const FIN = "(?![a-záéíóúñü])";
const PREGUNTA_DETALLE = new RegExp(
  "¿[^?]*(" +
    [
      `por\\s+qu[eé]${FIN}`,
      `quién(es)?\\s+(te|le|les|fue|fueron|es|son|era|eran|lo|la|los|las)${FIN}`,
      `c[oó]mo se llama`,
      `d[oó]nde (vives|est[aá]s|queda|fue|pas[oó])${FIN}`,
      `qu[eé] te pas[oó]${FIN}`,
      `en qu[eé] (escuela|colonia|calle)`,
      `cu[aá]l es tu (nombre|escuela)`,
    ].join("|") +
    ")[^?]*\\?",
  "i",
);

/** Frases de muletilla o de terapeuta que hacen sonar a Eco como robot. */
const MULETILLAS = /eso debe (ser|estar) (muy |bien )?(dif[ií]cil|duro)|es (muy |totalmente )?normal sentir|te valido|valido (lo que|tu)|aqu[ií] (tambi[eé]n )?cabe|cabe (aqu[ií]|todo)|todo cabe|es (totalmente |completamente )?v[aá]lid[oa]|v[aá]lido (sentir|que)|dice (mucho|bastante|algo)|es (muy )?v[aá]lido|qu[eé] valioso|se nota( que| en|\.|,|$)|eso habla de ti|gracias por tu honestidad|estoy aqu[ií] para ti|entiendo perfectamente/i;

/** Agrega el signo de apertura a las preguntas que no lo traen ("Qué tan seguido…?" → "¿Qué tan seguido…?"). */
export function abrirPreguntas(texto: string): string {
  return texto
    .split(/(?<=[.!?])\s+/)
    .map((o) => (o.endsWith("?") && !o.includes("¿") ? "¿" + o.charAt(0).toUpperCase() + o.slice(1) : o))
    .join(" ");
}

/** Devuelve el motivo si el mensaje no se puede mostrar, o null si está bien. */
/** Frases para cambiar de tema que alargan sin decir nada ("Cambiando un poquito:", "Ahora, pensando en el futuro:"). */
const FRASES_CONECTOR =
  "(y\\s+)?(cambiando (un poqu?ito|un poco|de tema)|cambiemos (un poco )?de tema|cambio de tema|ahorita le cambiamos( un poco)?( el tema)?|pasando a otra cosa|pasemos a otra cosa|hablando de eso|ahora,? pensando (en|más)[^:,¿]*|para entender mejor[^:,¿]*)\\s*[:,.]?\\s*";
// Oraciones completas de relleno: se quitan enteras.
const ORACIONES_RELLENO = /(^|(?<=[.!?]\s))(ya platicamos de (varias|muchas) cosas|hay (un|otro) tema [^.!?¿]*pendiente|ahorita (cerramos|terminamos) [^.!?¿]*)[^.!?¿]*[.!]\s*/gi;
const CONECTORES = new RegExp(`(^|(?<=[.!?]\\s))${FRASES_CONECTOR}`, "gi");
const HAY_CONECTOR = new RegExp(`(^|[.!?]\\s)${FRASES_CONECTOR}|(^|[.!?]\\s)(ya platicamos de (varias|muchas) cosas|hay (un|otro) tema [^.!?¿]*pendiente)`, "i");

/** Quita las frases para cambiar de tema y deja la oración con mayúscula. */
export function quitarConectores(texto: string): string {
  return texto
    .replace(ORACIONES_RELLENO, "")
    .replace(CONECTORES, "")
    .replace(/(^|[.!?]\s+)(¿?)([a-záéíóúñ])/g, (_m, a: string, q: string, c: string) => a + q + c.toUpperCase())
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Deja como máximo una oración antes de la pregunta (la última con "?"). */
export function acortar(texto: string): string {
  const oraciones = texto.split(/(?<=[.!?])\s+/).filter(Boolean);
  const iq = oraciones.map((o) => o.includes("?")).lastIndexOf(true);
  if (iq < 0) return oraciones.slice(0, 2).join(" ");
  const antes = oraciones.slice(0, iq).filter((o) => o.split(/\s+/).length <= 14);
  return [...antes.slice(0, 1), oraciones[iq]].join(" ");
}

/** Quita las oraciones que tienen una muletilla ("Eso también cabe aquí.") y deja el resto. */
export function quitarMuletillas(texto: string): string {
  return texto
    .split(/(?<=[.!?])\s+/)
    .filter((o) => !MULETILLAS.test(o))
    .join(" ")
    .trim();
}

/** Lugares, personas o hechos: el puente sólo habla de cómo se siente. */
const HECHOS =
  /\b(colonia|escuela|secu|secundaria|prepa|sal[oó]n|casa|calle|barrio|cuadra|mam[aá]s?|pap[aá]s?|jefa|jefe|herman[oa]s?|t[ií][oa]s?|abuel[oa]s?|primos?|primas?|amig[oa]s?|compas?|novi[oa]|profes?|maestr[oa]s?|balazos?|balacera|balas?|disparos?|tiros|pelea|golpes?|muert[oa]s?|mataron|levantaron|robo|asalto|vecin[oa]s?)\b/i;

function contar(t: string) {
  return { palabras: t.split(/\s+/).filter(Boolean).length, oraciones: t.split(/(?<=[.!?])\s+/).filter((o) => o.trim()).length, preguntas: (t.match(/\?/g) ?? []).length };
}

/** Motivo para no usar el mensaje según el modo del turno, o null si está bien. */
export function motivoModo(texto: string, modo: "seguir" | "escuchar" | "responder", tipo = "responde"): string | null {
  const t = texto.trim();
  if (modo === "seguir" && !t) return null; // sin puente: va directo a la pregunta
  const comun = motivoRechazo(t);
  if (comun) return comun;
  const n = contar(t);
  if (modo === "seguir") {
    if (n.preguntas) return "el puente no lleva preguntas: la siguiente pregunta la pone el sistema";
    const maxPalabras = ["pregunta", "privacidad", "pide_orientacion"].includes(tipo) ? 30 : 14;
    if (n.palabras > maxPalabras || n.oraciones > 2) return `el puente es muy largo: máximo ${maxPalabras} palabras`;
    if (tipo === "responde" && HECHOS.test(t)) return "el puente menciona lugares, personas o hechos; habla sólo de cómo se siente";
  }
  if (modo === "escuchar") {
    if (n.preguntas > 1) return "más de una pregunta";
    if (n.palabras > 32 || n.oraciones > 3) return "muy largo: máximo 2 oraciones y unas 25 palabras";
    if (/qu[eé] tan (seguido|fuerte)|qu[eé] tanto/i.test(t)) return "al escuchar no hagas preguntas del cuestionario; invita a seguir contando";
  }
  if (modo === "responder") {
    if (n.preguntas) return "no hagas otra pregunta: la que le hiciste sigue en pantalla";
    if (n.palabras > 40 || n.oraciones > 3) return "muy largo: máximo 2 oraciones";
  }
  return null;
}

export function motivoRechazo(texto: string, terminar = false): string | null {
  const t = texto.trim();
  if (terminar && t.includes("?")) return "cierra la plática pero deja una pregunta abierta";
  if (MULETILLAS.test(t)) return "usa una frase de muletilla (aquí cabe, es válido, se nota que…)";
  if (!t) return "vacío";
  if (t.length > 240 || t.split(/\s+/).length > 38) return "muy largo: máximo 2 oraciones y unas 25 palabras";
  if (HAY_CONECTOR.test(t)) return "usa una frase para cambiar de tema; ve directo a la pregunta";
  if ((t.match(/\?/g) ?? []).length > 2) return "más de una pregunta";
  if (PREGUNTA_DETALLE.test(t) || /¿\s*qu[eé] (le |les )?pas[oó](?![a-záéíóúñü])/i.test(t)) return "pide detalles que identifican o pregunta por qué";
  if (TEMAS_FUERA.test(t)) return "menciona temas o palabras que Eco no usa";
  if (/\d{3,}/.test(t)) return "incluye números o teléfonos";
  if (/\bdel? \d+ al \d+|qu[eé] tan de acuerdo|en una escala/i.test(t)) return "usa una escala de números o de acuerdo; pregunta directo";
  if (CON_GENERO.test(t)) return "usa adjetivos con género para el joven";
  return null;
}
