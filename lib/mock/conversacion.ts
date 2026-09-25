// Motor de repreguntas del mockup. En el sistema real esto lo hace el modelo
// (lib/ia/repreguntar.ts) siguiendo las mismas reglas: docs/repreguntas.md.
// Aquí es por palabras clave, para que el demo se comporte con sentido.
// No importa nada del proyecto para poder probarlo con `node --test`.

export type Celda = "adentro" | "entrada" | "parada" | "colonia" | "en_linea" | "otro";
export type Campo = "lugar" | "cuando" | "medio" | "oferta";
export type Clase = "serio" | "rojo" | "broma";

export type Ficha = {
  lugar: Celda | null;
  exterior: boolean; // lugar físico sin celda clara ("afuera", "por la escuela")
  enLinea: boolean;
  medio: string | null;
  cuando: boolean;
  oferta: "vaga" | "concreta" | null;
  maestro: boolean;
};

export type Pregunta = { campo: Campo; texto: string; opciones: string[] };

export type Cierre = { tipo: "parecidos" | "primero" | "no_suma"; n: number; rojo: boolean };

export type Estado = {
  ficha: Ficha;
  clase: Clase;
  hechas: Campo[];
  pregunta: Pregunta | null;
  cierre: Cierre | null;
};

export const MAX_PREGUNTAS = 2;

// --- Normalización ------------------------------------------------------------

export function normalizar(t: string) {
  return t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9$ ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// --- Vocabulario ----------------------------------------------------------------

// Riesgo inmediato: cita concreta, amenaza directa, traslado o retención.
// Ante duda, hacia arriba.
const RIESGO = new RegExp(
  "\\b(" +
    [
      "me esperan", "nos esperan", "lo esperan", "la esperan", "me van a esperar",
      "saben donde vivo", "saben donde vive", "saben donde vivimos",
      "me van a (matar|levantar|madrear|golpear|hacer algo|buscar|subir|llevar|quebrar)",
      "nos van a (matar|levantar|madrear|golpear|hacer algo|buscar|subir|llevar)",
      "(me|nos|lo|la|los|las|le|les) amenaz\\w*", "amenazaron", "amenaza de muerte",
      "si no voy", "si no vamos", "si no lo hago", "si no le entro", "si no le entramos", "si no pago",
      "me subieron", "lo subieron", "la subieron", "los subieron",
      "se lo llevaron", "se la llevaron", "se los llevaron", "se llevan a", "me llevaron",
      "levantaron a", "levantan a", "me quieren levantar",
      "me tienen encerrad\\w*", "no me dejan (ir|salir)",
      "me estan siguiendo", "me vienen siguiendo", "me siguieron hasta",
      "me citaron", "nos citaron",
      "desaparecio", "no ha regresado", "no aparece",
      "necesito ayuda", "ayudenme", "auxilio", "estoy en peligro",
    ].join("|") +
    ")\\b",
);
const SOLO_AYUDA = /^(ayuda|auxilio|help)$/;

// Palabras que, por sí solas, hacen serio un mensaje corto.
const SERIO =
  /\b(peg\w*|golpe\w*|acos\w*|toca\w*|manose\w*|droga\w*|mota|cristal|perico|piedra|vape\w*|arma\w*|pistola|navaja|cuchillo|reclut\w*|jale|chamba|lana|dinero|varo|feria|vend\w*|venta|amenaz\w*|miedo|profe\w*|maestr\w*|bronca\w*|pelea\w*|punto|halcon\w*|cobr\w*|extors\w*|secuestr\w*|narco\w*|cartel|mafia|sicari\w*|fotos|nudes|pack|violaron|abus\w*|bullying|molest\w*|insult\w*|robo|robaron|asalt\w*|halcone\w*)\b/;

// Saludos, risas y pruebas que no cuentan como contenido.
const RELLENO =
  /\b(hola|holi|ola|hey|buenas|buenos dias|buenas tardes|buenas noches|que onda|q onda|k onda|que tal|prueba|probando|test|testing|j[aeio]+(j[aeio]+)*|xd+|lol|asd\w*|qwe\w*|ok|okey|va|nada|aja|mm+|eh|oye|a ver|haber|esto|funciona|sirve|que es|es real|real|hello|hi|si|no|nel|simon|que|como|quien|eres|bot|alguien|ahi)\b/g;

const EN_LINEA = new RegExp(
  "\\b(" +
    [
      "en linea", "online", "internet", "redes", "red social",
      "tiktok", "tik tok", "insta", "instagram", "ig", "whats", "whatsapp", "wasap", "wats", "wsp",
      "telegram", "discord", "face", "facebook", "fb", "messenger", "snap", "snapchat", "twitter",
      "youtube", "twitch", "kick", "free ?fire", "ff", "fortnite", "roblox", "minecraft",
      "call of duty", "cod", "gta", "juego en linea", "jugando en linea", "en el juego", "en un juego", "partida",
      "en vivo", "live", "dm", "md", "inbox", "mensaje directo", "mensajes?", "me escribi\\w+", "le escrib\\w+",
      "nos escribi\\w+", "me mand\\w+ mensaje", "le mand\\w+ mensaje", "chat", "grupo de (whats|face|telegram|wasap)",
      "publicacion", "publicaron", "sub\\w+ (un |unos )?videos?", "historias? de", "en su historia",
      "perfil", "pagina de", "una pagina", "cuenta de (tiktok|insta|instagram|face)", "una cuenta",
      "link", "enlace", "app", "aplicacion", "stories", "reels?", "post",
    ].join("|") +
    ")\\b",
);

const MEDIOS: [string, RegExp][] = [
  ["TikTok", /\b(tiktok|tik tok)\b/],
  ["Instagram", /\b(insta|instagram|ig)\b/],
  ["WhatsApp", /\b(whats|whatsapp|wasap|wats|wsp)\b/],
  ["Telegram", /\btelegram\b/],
  ["Juego en línea", /\b(free ?fire|ff|fortnite|roblox|minecraft|call of duty|cod|gta|juego en linea|jugando en linea|en el juego|en un juego|partida)\b/],
  ["Otra app", /\b(discord|face|facebook|fb|messenger|snap|snapchat|twitter|youtube|twitch|kick)\b/],
];

// Celdas gruesas. El orden importa: la primera que coincide gana.
const LUGARES: [Celda, RegExp][] = [
  ["parada", /\b(parada|paradero|camion|micro|combi|pesero|metro|metrobus|mexibus|trolebus|estacion|base de|transporte)\b/],
  ["entrada", /\b(entrada|puerta|porton|reja|caseta|acceso)\b/],
  [
    "adentro",
    /\b(adentro|dentro de la escuela|dentro del plantel|en la escuela|en el plantel|en el conalep|en el cona|salon|aula|(en|a|de) (la )?clase|patio|cancha|bano|banos|taller|laboratorio|biblioteca|cooperativa|cafeteria|prefectura|pasillo|explanada|receso|descanso)\b/,
  ],
  ["colonia", /\b(colonia|calle|esquina|cuadra|tienda|oxxo|tianguis|mercado|parque|deportivo|mi casa|su casa|barrio|unidad|vecin\w*|puesto|tortilleria|farmacia|plaza)\b/],
];
const EXTERIOR = /\b(afuera|fuera de la escuela|fuera del plantel|enfrente|a un lado de la escuela|por la escuela|cerca de la escuela|alrededor|por aqui|por ahi)\b/;

const CUANDO = new RegExp(
  "\\b(" +
    [
      "ayer", "antier", "anteayer", "hoy", "anoche", "hace rato", "hace (un|una|dos|tres|unos|unas|\\d+) \\w+",
      "horita", "ahorita", "ahora", "orita",
      "(en|por) (la|las) (manana|mananas|tarde|tardes|noche|noches)", "de (manana|tarde|noche)", "noches", "tardes",
      "temprano", "madrugada", "mediodia", "manana",
      "a la salida", "saliendo", "al salir", "a la entrada", "entrando", "al entrar", "receso", "descanso",
      "lunes", "martes", "miercoles", "jueves", "viernes", "sabados?", "domingos?",
      "fin de semana", "fines de semana", "finde", "semana pasada", "esta semana", "este mes", "mes pasado",
      "diario", "todos los dias", "diariamente", "siempre", "cada (dia|semana|tarde|manana|noche|rato|vez)", "a veces",
      "seguido", "a cada rato", "\\d{1,2} ?(am|pm|hrs|horas)", "a las \\d", "turno (matutino|vespertino)",
      "matutino", "vespertino", "(estoy|estamos|esta|estan) (en|afuera|aqui|ahi)",
    ].join("|") +
    ")\\b",
);

// Una oferta vaga ("lana fácil", "un jale") se repregunta; una concreta no.
const GANANCIA_FACIL =
  /\b(lana facil|dinero facil|varo facil|feria facil|ganar (una |un )?(lana|dinero|varo|feria|billete|dinerito|lanita)|ganarse (una )?(lana|feria)|ganar bien)\b/;
const OFERTA_VAGA = /\b(jale|jalecito|chamba|chambita|trabajo|trabajito|negocio|bisne|propuesta|oportunidad|jalar con|entrarle|unirse|unirte|meterse con)\b/;
const OFRECER =
  /\b(ofrec\w*|propus\w*|propone\w*|invit\w*|si quer\w*|quieres|queria\w*|me quieren meter|nos quieren meter|buscan (chavos|morros|gente|chamacos|jovenes|chavas|morras)|buscando (chavos|morros|gente|chamacos|jovenes|chavas|morras)|reclut\w*|pagan|paga|pagaban|pagaria)\b/;
const OFERTA_CONCRETA =
  /(\$ ?\d|\b\d+ ?(mil|pesos|varos|baros)\b|\bmil pesos\b|\b\d{3,}\b|\b(llevar|llevara|lleve|paquetes?|mochila|cuidar|vigilar|vigila|avisar|avise|avisara|halcon\w*|punto|puntear|vender|vende|venden|vendia|vendian|venta|vendiendo|distribuir|repartir|entregar|cobrar|cobro|guardar|guarda|esconder|grabar|graba|fotos|regal\w*|tenis|recargas?|skins|pavos|diamantes|robux)\b)/;

const MAESTRO = /\b(profe\w*|maestr\w*|docente|prefect\w*|orientador\w*|director\w*|subdirector\w*|coordinador\w*|tutor\w*|conserje|intendente)\b/;

// Respuestas a una repregunta.
const NO_QUIERE = /^(no quiero( decir)?|prefiero no( decir)?|no te voy a decir|no digo|eso es todo|es todo|nada mas|ya|ya no|nel|no gracias|olvidalo|dejalo|paso|no importa)$/;
const NO_SABE = /^(no se|nose|ni idea|no me acuerdo|no recuerdo|no estoy segur\w|quien sabe|ns|no|nop|no lo se|no sabria)$/;

// --- Detección ----------------------------------------------------------------

export function clasificar(texto: string): Clase {
  const n = normalizar(texto);
  if (RIESGO.test(n) || SOLO_AYUDA.test(n)) return "rojo";
  if (SERIO.test(n)) return "serio";
  const resto = n.replace(RELLENO, " ").replace(/\s+/g, " ").trim();
  const palabras = resto ? resto.split(" ").filter((p) => p.length > 1) : [];
  return palabras.length < 3 ? "broma" : "serio";
}

export function detectar(texto: string): Ficha {
  const n = normalizar(texto);
  const enLinea = EN_LINEA.test(n);
  const medio = MEDIOS.find(([, re]) => re.test(n))?.[0] ?? null;
  let lugar: Celda | null = LUGARES.find(([, re]) => re.test(n))?.[0] ?? null;
  const exterior = !lugar && EXTERIOR.test(n);
  const maestro = MAESTRO.test(n);
  // Un maestro sin nada digital ni exterior: pasa adentro del plantel.
  if (!lugar && !exterior && !enLinea && maestro) lugar = "adentro";
  const concreta = OFERTA_CONCRETA.test(n);
  const vaga = GANANCIA_FACIL.test(n) || (OFERTA_VAGA.test(n) && OFRECER.test(n));
  return {
    lugar,
    exterior,
    enLinea: enLinea || !!medio,
    medio,
    cuando: CUANDO.test(n),
    oferta: concreta ? "concreta" : vaga ? "vaga" : null,
    maestro,
  };
}

function combinar(a: Ficha, b: Ficha): Ficha {
  return {
    lugar: a.lugar ?? b.lugar,
    exterior: a.exterior || b.exterior,
    enLinea: a.enLinea || b.enLinea,
    medio: a.medio ?? b.medio,
    cuando: a.cuando || b.cuando,
    oferta: a.oferta === "concreta" || b.oferta === "concreta" ? "concreta" : a.oferta ?? b.oferta,
    maestro: a.maestro || b.maestro,
  };
}

export function esFisico(f: Ficha) {
  return (f.lugar !== null && f.lugar !== "en_linea") || f.exterior;
}

// --- Reglas -------------------------------------------------------------------

// Qué falta, en orden de prioridad: dónde, cuándo, por qué medio, qué ofrecieron.
// "Cuándo" solo aplica a lo que pasa en un lugar físico: en línea no hay franja.
// "Dónde" no se pregunta si ya se sabe que fue en línea. "Afuera" no basta:
// el mapa necesita una celda, así que se pregunta.
export function pendientes(f: Ficha): Campo[] {
  const p: Campo[] = [];
  if (!f.lugar && !f.enLinea) p.push("lugar");
  if (esFisico(f) && !f.cuando) p.push("cuando");
  if (f.enLinea && !f.medio) p.push("medio");
  if (f.oferta === "vaga") p.push("oferta");
  return p;
}

export const OPCIONES_LUGAR: [string, Celda][] = [
  ["Adentro del plantel", "adentro"],
  ["En la entrada", "entrada"],
  ["En la parada", "parada"],
  ["En la colonia", "colonia"],
  ["En línea", "en_linea"],
  ["Otro lugar", "otro"],
];
export const OPCIONES_CUANDO = ["En la mañana", "En la tarde", "En la noche", "Fin de semana", "Pasa seguido"];
export const OPCIONES_MEDIO = ["TikTok", "Instagram", "WhatsApp", "Telegram", "Juego en línea", "Otra app"];
export const OPCIONES_OFERTA = ["Dinero", "Llevar o guardar algo", "Avisar o vigilar", "Vender algo", "Regalos", "No dijeron qué"];

const PREGUNTAS: Record<Campo, Pregunta> = {
  lugar: {
    campo: "lugar",
    texto: "¿Dónde pasó o dónde lo viste? ¿En la entrada, en la parada o por otro lado?",
    opciones: OPCIONES_LUGAR.map(([o]) => o),
  },
  cuando: { campo: "cuando", texto: "¿Más o menos cuándo fue?", opciones: OPCIONES_CUANDO },
  medio: { campo: "medio", texto: "¿En qué app o juego?", opciones: OPCIONES_MEDIO },
  oferta: { campo: "oferta", texto: "¿Qué ofrecían o qué pedían a cambio?", opciones: OPCIONES_OFERTA },
};

export function siguientePregunta(f: Ficha, hechas: Campo[]): Pregunta | null {
  if (hechas.length >= MAX_PREGUNTAS) return null;
  const campo = pendientes(f).find((c) => !hechas.includes(c));
  return campo ? PREGUNTAS[campo] : null;
}

// Cuántos "parecidos" devuelve el demo. En el sistema real sale de embeddings.
function cerrarCon(f: Ficha, clase: Clase): Cierre {
  if (clase === "broma") return { tipo: "no_suma", n: 0, rojo: false };
  if (clase === "rojo") return { tipo: "parecidos", n: 3, rojo: true };
  if (f.maestro) return { tipo: "primero", n: 0, rojo: false };
  return { tipo: "parecidos", n: 6, rojo: false };
}

// --- Conversación -------------------------------------------------------------

export function iniciar(texto: string): Estado {
  const ficha = detectar(texto);
  const clase = clasificar(texto);
  if (clase !== "serio") return { ficha, clase, hechas: [], pregunta: null, cierre: cerrarCon(ficha, clase) };
  const pregunta = siguientePregunta(ficha, []);
  return { ficha, clase, hechas: [], pregunta, cierre: pregunta ? null : cerrarCon(ficha, clase) };
}

// Aplica una respuesta (opción o texto libre) a la pregunta abierta.
export function responder(e: Estado, texto: string): Estado {
  if (!e.pregunta) return e;
  const campo = e.pregunta.campo;
  const hechas = [...e.hechas, campo];
  const n = normalizar(texto);

  if (clasificar(texto) === "rojo") {
    const ficha = combinar(e.ficha, detectar(texto));
    return { ficha, clase: "rojo", hechas, pregunta: null, cierre: cerrarCon(ficha, "rojo") };
  }
  if (NO_QUIERE.test(n)) {
    return { ...e, hechas, pregunta: null, cierre: cerrarCon(e.ficha, e.clase) };
  }

  let ficha = e.ficha;
  if (!NO_SABE.test(n)) {
    ficha = combinar(ficha, detectar(texto));
    const opcionLugar = OPCIONES_LUGAR.find(([o]) => o === texto.trim());
    if (campo === "lugar" && opcionLugar) {
      const linea = opcionLugar[1] === "en_linea";
      // Si elige "En línea", eso manda sobre un "afuera" del primer mensaje.
      ficha = { ...ficha, lugar: opcionLugar[1], enLinea: ficha.enLinea || linea, exterior: linea ? false : ficha.exterior };
    }
    if (campo === "cuando" && OPCIONES_CUANDO.includes(texto.trim())) ficha = { ...ficha, cuando: true };
    if (campo === "medio" && OPCIONES_MEDIO.includes(texto.trim())) ficha = { ...ficha, medio: texto.trim(), enLinea: true };
    if (campo === "oferta") ficha = { ...ficha, oferta: "concreta" };
  }

  const pregunta = siguientePregunta(ficha, hechas);
  return { ficha, clase: e.clase, hechas, pregunta, cierre: pregunta ? null : cerrarCon(ficha, e.clase) };
}

// Corre una conversación completa: el primer texto y las respuestas en orden.
export function conversar(turnos: string[]) {
  let e = iniciar(turnos[0]);
  const fichasAlPreguntar: Ficha[] = e.pregunta ? [e.ficha] : [];
  for (const t of turnos.slice(1)) {
    if (!e.pregunta) break;
    e = responder(e, t);
    if (e.pregunta) fichasAlPreguntar.push(e.ficha);
  }
  return { ...e, fichasAlPreguntar };
}

// --- Limpieza (capa 1 simulada) -----------------------------------------------

// Quita lo que identifica a quien escribe. Lo que describe a otros se queda.
const IDENTIFICA: RegExp[] = [
  /,?\s*\b(yo )?soy (el|la) (de|que|del|chavo|chava|morro|morra|alumn[oa])\b[^,.;]*/gi,
  /,?\s*\b(yo )?soy del? (su|mi|el|la) (mism[oa] )?(grupo|sal[oó]n|semestre|turno|carrera)\b[^,.;]*/gi,
  /,?\s*\b(yo )?soy del? (primero|segundo|tercero|cuarto|quinto|sexto|\d+)\w*\b[^,.;]*/gi,
  /,?\s*\b[Mm]e llamo \S+( [A-ZÁÉÍÓÚÑ]\S*)?/g,
  /,?\s*\bmi nombre es \S+( [A-ZÁÉÍÓÚÑ]\S*)?/gi,
  /,?\s*\bmi (matr[ií]cula|n[uú]mero de control|n[uú]mero de lista) (es )?\S+/gi,
  /,?\s*\b(voy|estoy|ando) en (el )?(grupo|sal[oó]n) \S+/gi,
  /,?\s*\b(voy|estoy|ando) en (\d+|primer|segundo|tercer|cuarto|quinto|sexto)\w*( semestre)?/gi,
];

export function limpiar(texto: string) {
  let limpio = texto;
  for (const re of IDENTIFICA) limpio = limpio.replace(re, "");
  limpio = limpio
    .replace(/^[\s,.;]+/, "")
    .replace(/^(y|e)\s+/i, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  return { limpio, cambio: limpio !== texto.trim() };
}
