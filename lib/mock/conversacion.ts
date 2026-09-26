// Motor de repreguntas del mockup. En el sistema real esto lo hace el modelo
// (lib/ia/repreguntar.ts) siguiendo las mismas reglas: docs/repreguntas.md.
// Aquí es por palabras clave, para que el demo se comporte con sentido. Tiene
// huecos que un modelo no tendría; la batería de lib/mock/revision/ sirve para
// medir al modelo real.
// No importa nada del proyecto para poder probarlo con `node --test`.

export type Celda = "adentro" | "entrada" | "parada" | "colonia" | "en_linea" | "otro";
export type Campo = "lugar" | "cuando" | "medio" | "oferta";
export type Clase = "serio" | "rojo" | "autolesion" | "broma";

export type Ficha = {
  lugar: Celda | null;
  exterior: boolean; // lugar físico sin celda clara ("afuera", "atrás del cona")
  enLinea: boolean; // también llamadas y mensajes: no hay lugar ni franja
  medio: string | null;
  cuando: boolean;
  oferta: "vaga" | "concreta" | null;
  maestro: boolean;
};

export type Pregunta = { campo: Campo; texto: string; opciones: string[] };

export type Cierre = { tipo: "parecidos" | "primero" | "no_suma" | "autolesion"; n: number; rojo: boolean };

export type Estado = {
  ficha: Ficha;
  clase: Clase;
  hechas: Campo[];
  pregunta: Pregunta | null;
  cierre: Cierre | null;
};

export const MAX_PREGUNTAS = 2;

const rx = (partes: string[]) => new RegExp(`\\b(${partes.join("|")})\\b`);

// --- Normalización ------------------------------------------------------------

// Escritura de celular más común. Se aplica por palabra.
const SMS: Record<string, string> = {
  q: "que", k: "que", ke: "que", xq: "porque", pq: "porque", xk: "porque", porq: "porque",
  x: "por", dnd: "donde", dnde: "donde", tmb: "tambien", tmbn: "tambien", bn: "bien",
  ban: "van", boy: "voy", c: "se", ns: "no se", nc: "no se", pa: "para", aki: "aqui",
  toy: "estoy", stoy: "estoy", stan: "estan", sta: "esta",
  m: "me", t: "te", n: "en", l: "el",
  porfa: "por favor", porfis: "por favor", porfavor: "por favor", xfa: "por favor", plis: "por favor", pls: "por favor",
  guey: "wey", we: "wey", buey: "wey",
};
const K_NORMAL = new Set(["kick", "kilo", "kilos", "kinder", "kit", "kiosko"]);

// Minúsculas, sin acentos ni emojis, con la escritura de celular resuelta.
// Las comas y puntos quedan como "," para poder limitar búsquedas a una frase.
export function normalizar(t: string) {
  const base = t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[.,;:!?]+/g, " , ")
    .replace(/[^a-z0-9$, ]+/g, " ")
    .replace(/([a-z])\1{2,}/g, "$1")
    .replace(/([aeiou])\1+\b/g, "$1");
  const tokens = base
    .split(/\s+/)
    .filter(Boolean)
    .map((tok) => {
      if (tok in SMS) return SMS[tok];
      if (/^k[ie]/.test(tok) && !K_NORMAL.has(tok)) return "qu" + tok.slice(1);
      return tok;
    })
    .join(" ")
    .split(" ")
    .filter(Boolean);
  const limpios: string[] = [];
  for (const tok of tokens) {
    if (tok === "," && (limpios.length === 0 || limpios[limpios.length - 1] === ",")) continue;
    limpios.push(tok);
  }
  if (limpios[limpios.length - 1] === ",") limpios.pop();
  return limpios.join(" ");
}

// Versión fonética para el riesgo: las faltas más comunes (b/v, s/z/c, ll/y, h)
// no deben esconder una amenaza. Se aplica igual al texto y a los patrones.
const fonetico = (s: string) =>
  s
    .replace(/v/g, "b")
    .replace(/z/g, "s")
    .replace(/c([ei])/g, "s$1")
    .replace(/ll/g, "y")
    .replace(/(^|[^c\\])h/g, "$1");
const rxFon = (partes: string[]) => new RegExp(fonetico(`\\b(${partes.join("|")})\\b`));

// Quita o reescribe lo que confunde a la detección.
const QUITAR: [RegExp, string][] = [
  [/^(profe|profa|maestr[oa]|miss|teacher)\s*,/, " "],
  [/\b(buenas|buenos) (tardes|noches|dias)\b/g, " "],
  [/\b(que onda|oye|hola|gracias|ey|mira|buenas|disculpe|disculpa) (maestr[oa]|profe|profa|profesor|profesora|miss)\b/g, " "],
  [/\bde (mi|su|tu|nuestro|nuestra) (salon|clase|grupo)\b/g, " "],
  [/\bde clases?\b/g, " "],
  [/\b(estaba|esta|estoy|estan|estaban|estar|quedo|quedaron|se queda|se quedan) parad[oa]s?\b/g, " "],
  [/\badentro (con|de) (la mana|ellos|eso|el cartel|la banda|esa gente)\b/g, " "],
  [/\b(el|un|del|al|mi|su|nuestro) trabajo (en equipo|de (la |el )?(clase|materia|mate|matematicas|quimica|fisica|historia|ingles|biologia|taller|laboratorio)|final|escolar)\b/g, " "],
  [/\b(la|una|mi|de) tarea\b/g, " "],
  [/\b(me di|se dio|nos dimos|darse|darme|dar) cuenta\b/g, " "],
  [/\b(cargar|cargo|carga) el payaso\b/g, " "],
  [/\b(levantaron|levantar|levanto|levantan) (un|una|el|la) (reporte|acta|queja|falta|sancion|citatorio)\b/g, " "],
  [/\ba base de\b/g, " "],
  [/\btaller (mecanico|de motos|de bicis|de carros|de hojalateria)\b/g, " tienda "],
  [/\b(patio|puerta|porton|estacionamiento|entrada|bano|banos|cancha|azotea|cocina|cuarto) de (mi|su|la|el|una|un) (casa|plaza|unidad|edificio|depa|departamento|vecino|vecina|abuela|abuelo|tia|tio|mercado|tianguis)\b/g, " $2 $3 "],
];

function preparar(texto: string) {
  let p = normalizar(texto);
  for (const [re, por] of QUITAR) p = p.replace(re, por);
  return p.replace(/\s+/g, " ").trim();
}

// --- Riesgo -------------------------------------------------------------------

// Riesgo inmediato: amenaza directa, cita concreta, traslado o retención,
// alguien que no aparece, extorsión, violencia sexual o un pedido de ayuda.
// Se busca la combinación de persona y daño, no palabras sueltas.
const PRON = "(me|nos|te|lo|la|los|las|le|les)";
const ENCLITICO = "(me|te|lo|la|los|las|nos|le|les)";
const MODAL = "(va|van|voy|vamos|iba|iban|ibamos|quiere|quieren|queria|querian|quiso|quisieron|intento|intentaron|piensa|piensan|pensaban|puede|pueden)";
const DANO =
  "(matar|levantar|madrear|madriar|golpear|pegar|partir|quebrar|balear|balacear|secuestrar|desaparecer|quemar|picar|filerear|reventar|apunalar|violar|chingar|cargar|hacer(me|te|le|les|nos|lo|la)? (dano|algo)|dar (una )?(madriza|golpiza|paliza|calentada|chinga)|dar piso|dar un levanton|romper la (madre|cara|jeta)|partir (la|tu|su) madre)";
const DANO_FUERTE = "(matar|balear|balacear|secuestrar|apunalar|violar|madrear|madriar)";
// Personal de la escuela o familia como sujeto: "la orientadora me anda buscando".
const AUTORIDAD =
  "(orientador\\w*|prefect\\w*|profe\\w*|profa|maestr\\w*|miss|director\\w*|subdirector\\w*|coordinador\\w*|mama|papa|jefa|jefe|tutor\\w*)";
const NO_REDES = "(?!\\s+(en|de|por) (insta|instagram|tiktok|tik tok|face|facebook|redes|twitter|youtube|twitch|whats))";
const NO_GERUNDIO = "(?!\\s+\\w+(ando|iendo|endo)\\b)";
const NO_ESCUELA = "(?![^,]{0,30}\\b(a|al) (la )?(direccion|prefectura|orientacion|enfermeria|coordinacion|oficina)\\b)";

const RIESGO = rxFon([
  `${PRON} ${MODAL} (a )?(estar )?${DANO}`,
  `${MODAL} (a )?${DANO}${ENCLITICO}`,
  `${MODAL} (a )?${DANO} a (mi|mis|tu|su|sus|un|una|el|la|los|las|alguien|todos|uno)`,
  `${MODAL} (a )?${DANO_FUERTE}`,
  `(me|nos|te|lo|la|los|las) (matan|levantan|madrean|balean|queman|revientan|parten|chingan|desaparecen|secuestran)`,
  "(me|nos|te|lo|la|los|las) caen(?! (mal|bien|gord\\w*|pesad\\w*|de))",
  "(me|nos|te|le|les) (va|iba|puede) a (ir mal|pasar algo)",
  "(me|nos|te|le|les) (puede|podria) pasar algo",
  "(ya se|ya sabes|ya sabe|ya saben|ya sabemos) como (me|te|le|nos|les) va",
  "(sabe|saben|sabemos|sabes) (donde|en que (escuela|salon|grupo|calle|colonia|casa)|a que hora) (vivo|vive|vives|vivimos|estudio|estudia|estudias|estudiamos|salgo|sale|sales|salimos|voy|va|vas)",
  "(sabe|saben|sabemos) quien (soy|eres|es)",
  "(vienen|van a (venir|ir)|iban a (venir|ir)) por (mi|ti|nosotros|el|ella)",
  "sigo yo", "el que sigue soy yo", "soy el siguiente", "soy la siguiente",
  `${PRON} (esta|estan|anda|andan|va a estar|van a estar) esperando`,
  `${PRON} (esperan|va a esperar|van a esperar|iba a esperar|iban a esperar|vienen esperando)`,
  "esperandome", "esperandonos", "te espero (en|a)",
  `(me|nos|lo|la|te) (sigue|siguen|siguio|siguieron|persigue|persiguen|persiguio|persiguieron)${NO_REDES}${NO_GERUNDIO}`,
  `(me|nos|lo|la|te) (esta|estan|anda|andan|viene|vienen|venia|venian|fue|fueron|iba|iban) (siguiendo|sigiendo|persiguiendo)${NO_REDES}`,
  "(vigilando|vigilan|rondando|rondan) (mi|su|la) casa",
  `(?<!${AUTORIDAD}[^,]{0,25})(me|nos|lo|la) (anda|andan|esta|estan) buscando`,
  `(me|nos|te|lo|la|los|las) levantaron`, "levantaron (a|al)",
  `(?<!${AUTORIDAD}[^,]{0,25})se (lo|la|los|las|me)? ?(llevo|llevaron)${NO_ESCUELA}`,
  `(?<!${AUTORIDAD}[^,]{0,25})se (llevo|llevaron|llevan) (a|al)${NO_ESCUELA}`,
  "(subir|subirme|meter|meterme|subieron|metieron|jalaron|quisieron subir)\\b[^,]{0,25}\\b(a|en) (una|un|su) (camioneta|carro|coche|taxi|moto|auto|troca|van|vocho)",
  "subiera a (una|un|su) (camioneta|carro|coche|taxi|moto|auto|troca)",
  "a la fuerza", "(me|nos|lo|la|le) apunt\\w+ con",
  "secuestr\\w*", "desaparecid\\w*",
  "encerrad\\w*", "(me|nos|lo|la) encerraron", "no me dejan (irme|salir de)", "no se donde estoy",
  "(me|nos|lo|la) (tienen|tenian) en (una|un) (casa|cuarto|bodega|carro|camioneta)",
  "amenaz\\w*", "extorsion\\w*",
  "(cobran|cobrando|cobrar|cobra|pagar|pagamos|paga|pagan) (el |la )?(piso|cuota|renta)", "derecho de piso",
  "(subir|publicar|pasar|mandar|ensenar) (mis|tus|sus) (fotos|videos) si no",
  `(me|la|lo|nos|le|te) (viola|violan|violo|violaron|violaba|abuso|abusaron|obligo a|obligaron a)`,
  "abus\\w+ (sexualmente )?de",
  // Trata y explotación sexual: afectan sobre todo a chavas.
  "(llevar|llevarme|llevarla|llevarlas|llevarlo|llevarse|mandar|mandarla|mandarme)\\w* a (trabajar (a|en) )?(otro estado|otra ciudad|otro pais|estados unidos|el norte|la frontera)",
  "(chava|amiga|prima|hermana|compa|morra|hija|novia|nina|vecina)\\w* [^,]{0,20}\\b(la|las) (vendieron|quieren vender|van a vender)",
  "trata de personas", "tratantes?",
  "(la|las|me|nos) (obligan|obligaron|obliga|quieren obligar) a (prostituirse|prostituirme|acostarse|acostarme|trabajar|vender)",
  "prostitu\\w*", "explotacion sexual",
  "(pistola|arma|cuerno|fusca|cuchillo|navaja) para (matar|disparar|balear|picar)",
  "va a haber (una )?(balacera|tiroteo|disparos)", "(va|van) a (disparar|balear|balacear|atacar) (la|el|en la|en el) (escuela|cona|conalep|plantel|salon)",
  "necesito ayuda", "ocupo ayuda", "pido ayuda", "urge ayuda", "ayuda por favor", "por favor ayuda",
  "(que )?alguien (me )?(ayude|ayuda|puede ayudar|podria ayudar)",
  "(me|nos) (puede|pueden|puedes|podria|podrian|podrias) ayudar",
  "ayud(ame|enme)(?! (con|a|en) (\\w+ ){0,2}(tarea|trabajo|examen|proyecto|ejercicio|mate|exposicion))",
  "auxilio", "estoy en peligro",
]);
// Cita concreta: verbo de cita más un momento dicho ("mañana", "a las 7").
const CITA = rxFon([
  "(me|lo|la|te|nos) vea(mos)? (en|a)", "nos vemos (en|a|con)", "(verme|vernos) (en|a|con)",
  "te espero", "(que|para que) (vaya|vayamos|llegue|llegara|este|estemos)", "(me|nos) cito",
]);
const MOMENTO =
  /\b(manana|hoy|ahorita|al rato|esta (noche|tarde)|en la (noche|tarde)|a las (\d+|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce)|lunes|martes|miercoles|jueves|viernes|sabado|domingo|a la salida|saliendo)\b/;
// Alguien que no aparece: se necesita a una persona en el mensaje ("mi primo
// no llegó a dormir") y que no sea un profe el que "no ha regresado".
const PERSONAL_ESCUELA = "(profe\\w*|profa|maestr\\w*|miss|prefect\\w*|orientador\\w*|director\\w*|subdirector\\w*|coordinador\\w*)";
const DESAPARECE = rxFon([
  `(?<!${PERSONAL_ESCUELA}[^,]{0,25})(no aparece|desaparecio|no llego a (dormir|su casa|la casa)|no ha (vuelto|regresado|llegado)|no contesta)`,
]);
const PERSONA =
  /\b(compa\w*|amig[oa]s?|herman\w*|prim[oa]s?|chav[oa]s?|morr[oa]s?|companer\w*|novi[oa]s?|hij[oa]s?|vecin\w*|sobrin\w*|tio|tia|alguien)\b/;
const RIESGO_PEGADO = /(me|te|nos|lo|la)(van|va|quieren|quiere|iban)a?(matar|levantar|madrear|secuestrar|balear)/;
const PALABRAS_AYUDA = new Set(["ayuda", "ayudame", "ayudenme", "auxilio", "socorro", "help", "sos", "urgente", "por", "favor"]);

// Autolesión: lleva su propio bloque fijo, distinto al de peligro. No cuenta
// cuando otro es el sujeto ("un wey me cortó con una navaja").
const SUJETO = "(wey|senor|senora|alguien|chavo|chava|vato|morro|morra|tipo|tipa|compa|ella|el|uno|unos|una)";
const AUTOLESION = rxFon([
  `(?<!\\b${SUJETO}\\b[^,]{0,14})me (corto|corte|cortare|voy a cortar|estoy cortando|lastimo|lastime|estoy lastimando|mato)(?! (el|mi|los|las) (pelo|cabello|fleco|unas|dedo|paso))`,
  "me quiero (matar|morir|suicidar|colgar|aventar|tirar|dormir y no despertar|desaparecer)(?! de (la )?(pena|risa|verguensa|hambre|sueno|flojera|aburrimiento))",
  "me voy a (matar|morir|suicidar|colgar|aventar|tirar)",
  "quiero (morirme|matarme|morir)(?! de)", "pienso en (matarme|morirme|suicid\\w*|quitarme la vida)",
  "(ya )?no quiero (vivir|seguir viviendo|seguir aqui|estar aqui|existir)",
  "no le encuentro (sentido|caso) a (la vida|vivir)", "no vale la pena vivir", "cansad[oa] de vivir",
  "cortarme", "me hago dano", "(quiero|voy a) hacerme dano", "suicid\\w*", "quitarme la vida",
  "me tome (muchas|unas|todas las|un monton de) pastillas", "sobredosis",
]);

// --- Pruebas y bromas ---------------------------------------------------------

// Es broma o prueba solo si TODO el mensaje es relleno, o si dice que está
// probando la app sin contar nada. Corto con contenido siempre es serio.
const RELLENO = new Set(
  (
    "hola holi ola hey ey buenas buenos dias tardes noches que onda tal prueba pruebas probando probar test testing " +
    "xd lol ok okey va nada aja eh oye a ver haber esto eso es una un la el lo del de funciona sirve real hello hi " +
    "si no nel simon como quien eres bot alguien ahi hay estoy viendo app aplicacion sistema pagina pues bueno " +
    "ya sale gracias o y ah wey saludos"
  ).split(" "),
);
const esRelleno = (t: string) =>
  RELLENO.has(t) ||
  /^\d+$/.test(t) ||
  /^(j[aeiou]){2,}j?$/.test(t) ||
  /^(js){2,}j?$/.test(t) ||
  /^(ha){2,}h?$/.test(t) ||
  /^x+d+$/.test(t) ||
  /^[^aeiou\d$]{3,}$/.test(t);

const PRUEBA_APP =
  /(^|\b)((?<!no )es (una )?prueba|estoy probando|nomas probando|solo probando|probando (la app|esto|el chat|si funciona|si sirve)|prueba del (sistema|chat|app)|probaramos esto|probemos esto|probar (esto|la app|el chat)|(viendo|ver) como funciona|^test\b|^prueba\b)/;
const HECHO =
  /\b(droga\w*|mota|cristal|perico|piedra|fenta\w*|coca|vapes?|arma\w*|pistola|cuerno|fusca|navaja|cuchillo|reclut\w*|jale|chamba|lana|dinero|varo|feria|vend\w*|venta|miedo|bronca\w*|pelea\w*|punto|halcon\w*|cobr\w*|narco\w*|cartel|mana|mafia|sicari\w*|fotos|nudes|packs?|viol\w*|abus\w*|bullying|molest\w*|acos\w*|insult\w*|rob\w*|asalt\w*|peg\w*|golpe\w*|toca\w*|manose\w*|llevar|paquete\w*|tiendita|levant\w*|amenaz\w*|sigue\w*|pastilla\w*|novio|modelo|trata|prostitu\w*)\b/;

export function clasificar(texto: string): Clase {
  const p = preparar(texto);
  const f = fonetico(p);
  if (AUTOLESION.test(f)) return "autolesion";
  if (RIESGO.test(f) || (DESAPARECE.test(f) && PERSONA.test(p)) || RIESGO_PEGADO.test(p.replace(/ /g, "")) || (CITA.test(f) && MOMENTO.test(p) && !/\bcuando (nos|me|lo|la|te) (vemos|veo|ve)\b/.test(p)))
    return "rojo";
  const tokens = p.split(" ").filter((t) => t && t !== ",");
  if (tokens.some((t) => ["ayuda", "ayudame", "ayudenme", "auxilio", "socorro"].includes(t)) && tokens.every((t) => PALABRAS_AYUDA.has(t) || esRelleno(t)))
    return "rojo";
  if (tokens.every(esRelleno)) return "broma";
  if (PRUEBA_APP.test(p) && !HECHO.test(p)) return "broma";
  return "serio";
}

// --- Lugar, medio, cuándo, oferta -----------------------------------------------

const APPS: [string, string][] = [
  ["TikTok", "tiktok|tik tok|tiktoc|tictok|tic tok"],
  ["Instagram", "insta|instagram|ig"],
  ["WhatsApp", "whats|whatsapp|whatsap|whasap|wasap|watsap|wats|wsp|guasap|wasa|whats app"],
  ["Telegram", "telegram"],
  ["Juego en línea", "free fire|fre fire|freefire|frifai|ff|fortnite|fornite|fornait|fortnait|roblox|minecraft|maincra|mainkra|call of duty|cod|gta|clash|brawl|juego en linea|jugando en linea"],
  ["Llamada o SMS", "por telefono|al telefono|llamada|sms|mensaje de texto|numero desconocido|numero privado|(me|nos|le) (hablaron|marcaron|llamaron|hablo|marco|llamo) (por|al|de|desde) (telefono|cel|celular|un numero|otro numero)"],
  ["Otra app", "discord|server|servidor|face|facebook|feis|feisbuk|fb|messenger|snap|snapchat|twitter|youtube|twitch|kick|classroom|correos?|mail|gmail|teams|zoom|meet"],
];
const MEDIOS: [string, RegExp][] = APPS.map(([nombre, re]) => [nombre, new RegExp(`\\b(${re})\\b`)]);

const EN_LINEA = rx([
  "en linea", "online", "internet", "redes", "red social", "inbox", "mensaje directo", "dm", "md", "por privado",
  "(transmit\\w*|hace|hizo|haciendo) (un )?(en vivo|live)", "chat", "stories", "reels?", "post", "publicacion", "publicaron",
  "link", "enlace", "perfil", "pagina de", "una pagina", "una cuenta", "cuenta de (tiktok|insta|instagram|face|whats)",
  "(en|por) (una|la) (app|aplicacion)",
  "(mand\\w+|envi\\w+|pas\\w+|lleg\\w+|lleg\\w+) (un |una |unos |unas )?(mensajes?|fotos?|videos?|audios?|stickers?|links?)",
  "(me|le|nos|les|te) escrib\\w+ (por|en|al) (privado|inbox|mensaje|chat|el chat|el grupo|dm|md)", "por mensaje",
  "grupo de (whats|face|telegram|wasap)", "sub\\w+ (un |unos |una |unas )?(fotos?|videos?)",
  "historias? de (insta|face|whats)", "en su historia",
]);

// Celdas gruesas. El orden importa: la primera que coincide gana.
const LUGARES: [Celda, RegExp][] = [
  ["parada", rx(["parada", "paradas", "paradero", "camion", "camiones", "micro", "microbus", "combi", "combis", "pesero", "peseros", "metro", "metrobus", "mexibus", "trolebus", "cablebus", "tren ligero", "tren", "estacion", "base de (combis|micros|taxis|mototaxis|camiones|peseros)", "transporte", "ruta", "mototaxi", "mototaxis", "autobus", "bus"])],
  ["entrada", rx(["entrada", "puerta", "porton", "reja", "caseta"])],
  ["adentro", rx(["adentro", "dentro de la escuela", "dentro del (plantel|conalep|cona)", "en la escuela", "en el plantel", "en el conalep", "en el cona", "salon", "salones", "aulas?", "(en|a) (la )?clases?", "patio", "canchas?", "banos?", "taller(es)?", "laboratorios?", "biblioteca", "cooperativa", "cafeteria", "prefectura", "pasillos?", "explanada", "receso", "recreo", "descanso", "estacionamiento"])],
  ["colonia", rx(["colonia", "calle", "esquina", "cuadra", "tienda", "oxxo", "tianguis", "mercado", "parque", "deportivo", "mi casa", "su casa", "barrio", "unidad habitacional", "la unidad", "vecin\\w*", "puesto de", "un puesto", "el puesto", "tortilleria", "farmacia", "plaza", "puente( peatonal)?"])],
];
const EXTERIOR = rx([
  "afuera", "fuera de la escuela", "fuera del plantel", "enfrente de la escuela", "enfrente del (conalep|cona|plantel)",
  "frente (a la escuela|al conalep|al cona|al plantel)", "cerca (de la escuela|del conalep|del cona|del plantel|de aqui)",
  "(atras|detras) (de la escuela|del conalep|del cona|del plantel)",
  "a un lado de la escuela", "por la escuela", "alrededor de la escuela", "a la vuelta",
]);

const CUANDO = rx([
  "ayer", "antier", "anteayer", "hoy", "anoche", "hace rato", "hace un ratito", "ratito", "hace poco", "el otro dia", "la otra vez",
  "hace (como )?(un|una|dos|tres|unos|unas|varios|varias|\\d+) (dia|dias|semana|semanas|mes|meses|rato|hora|horas|minutos)",
  "horita", "ahorita", "ahora", "orita", "manana", "temprano", "madrugada", "mediodia",
  "(en|por) (la|las) (manana|mananas|tarde|tardes|noche|noches)", "de (la )?(manana|tarde|noche)",
  "esta (manana|tarde|noche)", "todas las (mananas|tardes|noches)", "todos los (dias|lunes|martes|miercoles|jueves|viernes|sabados|domingos)",
  "a la salida", "(a la|en la) hora de (la )?(salida|entrada|receso|recreo|comida)", "en la salida",
  "saliendo (de la escuela|de clases?|del cona|del conalep|del plantel|de la escuela)", "al salir", "a la entrada", "entrando", "al entrar",
  "receso", "recreo", "descanso", "hora libre",
  "lunes", "martes", "miercoles", "jueves", "viernes", "sabados?", "domingos?", "fin de semana", "fines de semana", "finde",
  "semana pasada", "esta semana", "este mes", "mes pasado", "diario", "diariamente", "siempre",
  "cada (dia|semana|tarde|manana|noche|rato|vez)", "a veces", "seguido", "a cada rato",
  "\\d{1,2} ?(am|pm|hrs|horas)", "a las (\\d+|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce)",
  "turno (matutino|vespertino|de la manana|de la tarde)", "matutino", "vespertino",
  "(estoy|estamos) (sol[oa]s? )?(aqui|ahi|afuera)", "(estoy|estamos) (sol[oa]s? )?en (la|el) (parada|entrada|esquina|salida|camion|combi|metro|calle|escuela|plantel|bano|patio)",
  "cuando (salimos|salgo|salen|entramos|entro|entran|voy|vamos|regreso|regresamos|sali|iba|ibamos|venia|veniamos|salia|saliamos|regresaba)",
  "de regreso", "de ida",
]);

// Oferta vaga = verbo de ofrecer seguido, en la misma frase, de algo sin
// detalle ("un jale", "chamba", "lana"). Si dice qué hay que hacer o cuánto
// pagan, es concreta y no se pregunta.
const OFRECER =
  "(ofrec\\w*|propus\\w*|propone\\w*|invit\\w*|si quier\\w*|si queria\\w*|si le entr\\w*|le entras|le entraba|quieres|quieren meter|quiere meter|me pregunt\\w* si|nos pregunt\\w* si|le pregunt\\w* si|buscan|buscando|reclut\\w*|pagan|paga|pagaban|pagaria)";
const VAGO =
  "(jale|jalecito|chamba|chambita|chambear|trabajo|trabajito|trabajar|negocio|bisne|propuesta|oportunidad|jalar|jalo|entrarle|unirse|unirte|meterse|meterme|lana|dinero|varo|feria|billete|dinerito|algo)";
const TAREA =
  "(llevar|llevara|lleve|paquetes?|mochila|cuidar|vigilar|vigila|avisar|avise|avisara|halcon\\w*|puntear|vender|vende|venden|vendia|vendian|venta|vendiendo|distribuir|repartir|entregar|cobrar|guardar|guarda|esconder|grabar|graba|fotos|regal\\w*|tenis|cel|celular|recargas?|skins|pavos|diamantes|robux|mota|droga|cristal|vapes?|sicari\\w*|matar|packs?|nudes|novia|novio|pareja|fiestas?|salir con \\w+|andar con \\w+)";
const MONTO =
  /(\$ ?\d|\b\d+ ?(mil|pesos|varos|baros|k)\b|\bmil pesos\b|\b(un|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|quince|veinte|cincuenta|cien) mil\b|\b\d+ (al|a la|por) (mes|semana|dia|viaje|encargo|video)\b)/;
const GANANCIA =
  /\b(lana facil|dinero facil|varo facil|feria facil|ganar (una |un |buena )?(lana|dinero|varo|feria|billete|dinerito|lanita)|ganarse (una )?(lana|feria)|ganar bien)\b/;
const OFERTA_VAGA = new RegExp(`\\b${OFRECER}\\b[^,]{0,30}?\\b${VAGO}\\b|\\b(si le entr\\w*|le entras|le entraba)\\s*(,|$)`);
const OFERTA_CONCRETA = new RegExp(
  `\\b${OFRECER}\\b[^,]{0,50}?\\b${TAREA}\\b|\\bpor (llevar|cuidar|vigilar|avisar|vender|halconear|guardar|grabar|entregar|repartir|mandarle fotos)\\b|\\b(chamba|trabajo|jale) de (halcon\\w*|sicari\\w*)`,
);

const MAESTRO =
  /\b(profe|profes|profesor\w*|profa|maestr[oa]s?|miss|teacher|inge|ingeniero|ingeniera|lic|licenciad[oa]|docente\w*|prefect\w*|orientador\w*|director\w*|subdirector\w*|coordinador\w*|conserje|intendente)\b/;

export function detectar(texto: string): Ficha {
  const p = preparar(texto);
  const medio = MEDIOS.find(([, re]) => re.test(p))?.[0] ?? null;
  const enLinea = EN_LINEA.test(p) || !!medio;
  let lugar: Celda | null = LUGARES.find(([, re]) => re.test(p))?.[0] ?? null;
  const exterior = !lugar && EXTERIOR.test(p);
  const maestro = MAESTRO.test(p);
  // Un maestro sin nada digital ni exterior: pasa adentro del plantel.
  if (!lugar && !exterior && !enLinea && maestro) lugar = "adentro";
  const concreta = MONTO.test(p) || OFERTA_CONCRETA.test(p);
  const vaga = GANANCIA.test(p) || OFERTA_VAGA.test(p);
  return {
    lugar,
    exterior,
    enLinea,
    medio,
    cuando: CUANDO.test(p),
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
export const OPCIONES_OFERTA = [
  "Dinero",
  "Llevar o guardar algo",
  "Avisar o vigilar",
  "Vender algo",
  "Regalos o salidas",
  "Mandar fotos",
  "Ser su novia o pareja",
  "No dijeron qué",
];

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
  if (clase === "autolesion") return { tipo: "autolesion", n: 0, rojo: false };
  if (clase === "rojo") return { tipo: "parecidos", n: 3, rojo: true };
  if (f.maestro) return { tipo: "primero", n: 0, rojo: false };
  return { tipo: "parecidos", n: 6, rojo: false };
}

// --- Respuestas a una repregunta --------------------------------------------------

const NO_SABE = /\b(no se|ni idea|no me acuerdo|no recuerdo|no estoy segur\w*|quien sabe|no lo se|no sabria)\b/;
const NO_QUIERE_CORTO = /^(ya|nel|paso|ya estuvo|sale|ok|okey|nada|no|mejor no|nel paso)$/;
const NO_QUIERE =
  /\b(no quiero|prefiero no|no te voy a decir|no digo|es todo|nada mas|no gracias|olvidalo|dejalo|no importa|ya no|que te importa|a ti que|mejor no|nel)\b/;

function noQuiere(n: string) {
  if (NO_SABE.test(n)) return false;
  return NO_QUIERE_CORTO.test(n) || (n.split(" ").length <= 6 && NO_QUIERE.test(n));
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
  const n = normalizar(texto).replace(/ ,/g, "");

  const clase = clasificar(texto);
  if (clase === "rojo" || clase === "autolesion") {
    const ficha = combinar(e.ficha, detectar(texto));
    return { ficha, clase, hechas, pregunta: null, cierre: cerrarCon(ficha, clase) };
  }
  if (noQuiere(n)) {
    return { ...e, hechas, pregunta: null, cierre: cerrarCon(e.ficha, e.clase) };
  }

  let ficha = combinar(e.ficha, detectar(texto));
  const opcionLugar = OPCIONES_LUGAR.find(([o]) => o === texto.trim());
  if (campo === "lugar" && opcionLugar) {
    const linea = opcionLugar[1] === "en_linea";
    // Si elige "En línea", eso manda sobre un "afuera" del primer mensaje.
    ficha = { ...ficha, lugar: opcionLugar[1], enLinea: ficha.enLinea || linea, exterior: linea ? false : ficha.exterior };
  }
  if (campo === "cuando" && OPCIONES_CUANDO.includes(texto.trim())) ficha = { ...ficha, cuando: true };
  if (campo === "medio" && OPCIONES_MEDIO.includes(texto.trim())) ficha = { ...ficha, medio: texto.trim(), enLinea: true };
  if (campo === "oferta" && !NO_SABE.test(n)) ficha = { ...ficha, oferta: "concreta" };

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
// Cada patrón corta en la siguiente "y", "que", "pero" o signo, sin pasarse de
// unas cuantas palabras, para no llevarse el hecho.
const FIN = String.raw`(?=\s+(?:y|e|que|pero|porque|entonces|pues|cuando)\s|[,.;:!?]|$)`;
const NO_NOMBRE = String.raw`(?!(?:por|a|al|para|de|del|desde|y|e|en|el|la|los|las|un|una|mi|su|le|lo|que|pero|ayer|hoy|anoche|antier|ahorita|luego|otra|otro|nuevo|nueva|testigo|chismos[oa]|alumn[oa]|estudiante|muy|bien|mujer|hombre|menor|amig[oa]|compa|herman[oa]|prim[oa]|victima|yo|uno|nadie|asi|tambien)\b)`;
const YA_DIJO = String.raw`(?<!(?:dijo|dice|decia|dijeron|dicen|presento como|se llama)\s)`;
const IDENTIFICA: RegExp[] = [
  new RegExp(String.raw`\b(?:yo )?soy (?:el|la) (?:de|que|del|chav[oa]|morr[oa]|alumn[oa])\b.{0,40}?` + FIN, "giu"),
  new RegExp(String.raw`\b(?:yo )?soy (?:el|la) \p{L}+ (?:del?|de la) \S+`, "giu"),
  new RegExp(String.raw`\b(?:yo )?soy del? (?:(?:su|mi|el|la) )?(?:mism[oa] )?(?:grupo|sal[oó]n|semestre|turno|carrera)\b.{0,20}?` + FIN, "giu"),
  new RegExp(String.raw`\b(?:yo )?soy del? (?:primero|segundo|tercero|cuarto|quinto|sexto|\d+)\w*(?: (?:semestre|grado|turno \w+|[a-z])\b)?`, "giu"),
  new RegExp(YA_DIJO + String.raw`\b[Ss]oy ${NO_NOMBRE}\p{L}+(?: [A-ZÁÉÍÓÚÑ]\p{L}+)?(?=\s*(?:,|\by\b|\be\b|\bdel?\b|$))(?: del? \S+)?`, "gu"),
  new RegExp(String.raw`(?:^|(?<=[,.]\s*)|(?<=\by\s))(?:hola,?\s*)?me llamo ${NO_NOMBRE}\p{L}+(?: ${NO_NOMBRE}\p{L}+)?`, "giu"),
  new RegExp(String.raw`\bmi nombre\s*(?:es|:)\s*\p{L}+(?: ${NO_NOMBRE}\p{L}+)?`, "giu"),
  new RegExp(String.raw`\bme (?:dicen|apodan) (?:el|la) ${NO_NOMBRE}\p{L}+`, "giu"),
  new RegExp(String.raw`\bmi apodo es \S+`, "giu"),
  new RegExp(String.raw`\bmi (?:matr[ií]cula|n[uú]mero de (?:control|lista|cuenta))\s*(?:es)?\s*:?\s*\S+`, "giu"),
  new RegExp(String.raw`\bmi (?:cel|celular|n[uú]mero|tel[eé]fono|whats|whatsapp|insta|instagram|tiktok|face|correo|mail|usuario|cuenta)\s*(?:es|:)\s*\S+`, "giu"),
  new RegExp(String.raw`\b(?:voy|estoy|ando) en (?:el )?(?:grupo|sal[oó]n) \d+\w*`, "giu"),
  new RegExp(String.raw`\b(?:voy|estoy|ando) en (?:el )?(?:\d{3}\b|\d+(?:o|to|vo|ro|do|er|°)?\s?[A-Za-z]\b)`, "gu"),
  new RegExp(String.raw`\b(?:voy|estoy|ando) en (?:primer|segundo|tercer|cuarto|quinto|sexto)\w*(?: semestre)?`, "giu"),
  new RegExp(String.raw`\b(?:voy|estoy|ando) en (?:el )?\d+\w* (?:semestre|grado)`, "giu"),
  new RegExp(String.raw`\b(?:att|atte|atentamente)\b.*$`, "giu"),
  new RegExp(String.raw`\b(?:saludos|bye|firma)\s*,?\s*[A-ZÁÉÍÓÚÑ]\p{L}+.*$`, "gu"),
];

export function limpiar(texto: string) {
  let limpio = texto;
  for (const re of IDENTIFICA) limpio = limpio.replace(re, "");
  // Si no quitó nada que identifique, el mensaje se queda tal cual.
  if (limpio === texto) return { limpio: texto.trim(), cambio: false };
  limpio = limpio
    .replace(/\s{2,}/g, " ")
    .replace(/^\s*(hola|buenas|que onda|qu[eé] onda|oye|pd|p\.d\.|posdata)\b/i, "")
    .replace(/^[\s,.;:]+/, "")
    .replace(/^(y|e|que)\s+/i, "")
    .replace(/[\s,;:]+$/, "")
    .trim();
  return { limpio, cambio: limpio !== texto.trim() };
}
