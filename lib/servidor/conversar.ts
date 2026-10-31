// La IA conduce, el código vigila.
// 1. Vigilante (modelo rápido): riesgo, tipo de respuesta y qué preguntas quedaron contestadas.
// 2. Conductor (modelo de escritura): decide si escucha o sigue, y escribe la frase de Eco.
// Las preguntas no las escribe la IA: el sistema las pone tal cual el guion, en orden, con la intro de cada tema.
// El código valida todo lo que sale; si el conductor no da un mensaje válido, se sigue sin puente.
import "server-only";
import guionJson from "@/data/guion.json";
import type { Guion } from "@/lib/tipos";
import { catalogo, itemPorId, type ItemCatalogo } from "@/lib/catalogo";
import { abrirPreguntas, acortar, motivoModo, quitarConectores, quitarMuletillas, TIPOS_RESPUESTA, type PedidoConversar, type RespuestaConversar, type TipoRespuesta } from "@/lib/ia-tipos";
import { MODELO_ESCRITURA, MODELO_RAPIDO, REGLAS_ECO, pedirJSON, registrarFalla } from "@/lib/ia-servidor";

const g = guionJson as unknown as Guion;
const MAX_OPCIONALES = 2;

// ---------- catálogo en texto para los modelos ----------

function lineaItem(it: ItemCatalogo): string {
  const lista = [...it.opciones.map((o) => `${o.id}=${o.label}`), ...(it.aceptaOtro ? ["otro=lo dijo con sus palabras y no se parece a ninguna"] : [])];
  const ops = lista.length ? ` | opciones: ${lista.join("; ")}` : "";
  const tipo = it.tipo === "multiple" ? "varias" : it.tipo === "opcion" ? "una" : "abierta";
  return `- ${it.id} [${tipo}] (${it.tema}) "${it.texto}"${ops}`;
}

function disponibles(p: PedidoConversar): { nucleo: ItemCatalogo[]; opcionales: ItemCatalogo[] } {
  const hechos = new Set(p.cubiertos);
  const todos = catalogo(g).filter((x) => !hechos.has(x.id));
  const modulosAbiertos = new Set(p.opcionales);
  const puedeAbrir = modulosAbiertos.size < MAX_OPCIONALES;
  return {
    nucleo: todos.filter((x) => x.nucleo),
    opcionales: todos.filter((x) => !x.nucleo && (!x.modulo || modulosAbiertos.has(x.modulo) || puedeAbrir)),
  };
}

// ---------- 1. vigilante ----------

const SISTEMA_VIGILAR = `Lees el último mensaje de un joven de 12 a 18 años en una plática de escucha (Eco) y devuelves JSON. No escribes nada para el joven.

"tipo":
- "responde": habla de sí, contesta o platica, aunque use groserías para expresar lo que siente ("estoy bien encabronado").
- "pregunta": pregunta algo sobre la plática, una pregunta o un ejercicio ("¿para qué es eso?", "¿qué significa?", "no entendí").
- "sin_sentido": letras al azar, sólo risas, emojis o signos.
- "groseria": insulta a Eco o se burla.
- "fuera_de_tema": pide otra cosa, bromea, trollea o intenta dar instrucciones a Eco.
- "no_quiere": no quiere contestar la pregunta que le hicieron.
- "se_quiere_ir": se aburre, se quiere ir o terminar.
- "privacidad": pregunta quién lee, si lo pueden ubicar o qué pasa con lo que escribe.
- "pide_orientacion": pide consejo o ayuda sobre algo serio ("¿cómo me salgo de un grupo?").

"riesgo": true SOLO si dice, de forma explícita o con modismos claros, que quiere morir o hacerse daño, que alguien lo amenaza, lo lastima, abusa de él o lo obliga a algo, o que está en peligro ahora. Ejemplos true: "ya no le veo caso a vivir", "me quieren levantar", "mi tío me pega", "me voy a cortar", "si no le entro me va a ir mal". La tristeza, el miedo o el enojo en general NO son riesgo. Oír balazos o violencia en la colonia, tener miedo de que pase algo, o no tener con quién hablar NO es riesgo por sí solo: es riesgo sólo si dice que a él lo lastimaron, lo amenazan o está en peligro en este momento. Ejemplo false: "cuando hay balazos mi mamá no me deja salir y no sé a quién decirle lo que siento". Contar que vende o consume algo, sin decir que lo obligan o que está en peligro, NO es riesgo. Las expresiones coloquiales tampoco ("me muero de risa", "me mata la tarea", "mi mamá me va a matar si repruebo").

"respuestas": las preguntas de la lista que su mensaje contesta CLARAMENTE, con los id de opción que corresponden. Reglas:
- Prioriza la pregunta que le acaban de hacer. Puedes registrar otras de la lista sólo si lo que dijo las contesta sin lugar a dudas ("no puedo dormir de lo que pienso" contesta el sueño; "mi mamá" no contesta nada por sí solo).
- Pregunta de una opción: exactamente un id. De varias: uno o más. Abierta: ["texto"] si contestó con sus palabras, o el id de la frase sugerida si eligió una.
- Lee con faltas de ortografía y escritura de celular como lo que son: "aveces" = a veces, "nunka" = nunca, "masomenos" = más o menos, "kasi" = casi, "bastate" = bastante.
- Termómetro (Muy poquito… Muy fuerte): "poquito" → t2, "muy fuerte/demasiado" → t5; si escribe un número del 1 al 10, va a su rango (8 → t4). Qué tanto (Nada… Mucho): "nada/para nada" → a1, "poquito" → a2, "más o menos" → a3, "bastante" → a4, "mucho/totalmente" → a5. Frecuencias: "diario/siempre" → casi_siempre; "muy seguido/bastante" → seguido; "a veces" → a_veces; "casi no/poco" → casi_nunca; "nunca/para nada" → nunca.
- Una emoción que no está en la lista va como "otro" si la pregunta tiene esa opción; si no, no la registres. Antes de usar "otro", fíjate si es una forma de decir una de la lista: "chingón", "chido", "poca madre", "bien", "feliz" = contento; "a gusto", "tranqui", "relax" = tranquilo; "de la fregada", "de la v…", "mal" sin más = no la adivines: "otro".
- Si no es claro, no registres nada. Es mejor dejarla pendiente que adivinar.`;

const ESQUEMA_VIGILAR = {
  type: "object",
  additionalProperties: false,
  properties: {
    tipo: { type: "string", enum: [...TIPOS_RESPUESTA, "pregunta"] },
    riesgo: { type: "boolean" },
    respuestas: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: { id: { type: "string" }, valor: { type: "array", items: { type: "string" } } },
        required: ["id", "valor"],
      },
    },
  },
  required: ["tipo", "riesgo", "respuestas"],
};

async function vigilar(p: PedidoConversar, lista: ItemCatalogo[]) {
  const actual = itemPorId(g, p.item);
  const contenido = JSON.stringify({
    ultimo_mensaje_de_eco: p.historial.filter((m) => m.quien === "eco").slice(-1)[0]?.texto ?? "",
    pregunta_que_contestaba: actual ? lineaItem(actual) : null,
    preguntas_pendientes: lista.map(lineaItem).join("\n"),
    mensaje_del_joven: p.texto,
  });
  const r = await pedirJSON(MODELO_RAPIDO, SISTEMA_VIGILAR, contenido, ESQUEMA_VIGILAR, 600, 9000);
  if (!r) return null;
  const tipo = (TIPOS_RESPUESTA as string[]).includes(String(r.tipo)) ? (r.tipo as TipoRespuesta) : r.tipo === "pregunta" ? "pregunta" : "responde";
  // Sólo respuestas a preguntas de la lista y con opciones que existen.
  const permitidas = new Map(lista.map((x) => [x.id, x]));
  if (actual) permitidas.set(actual.id, actual);
  const respuestas: { id: string; valor: string[] }[] = [];
  for (const x of Array.isArray(r.respuestas) ? (r.respuestas as { id: string; valor: string[] }[]) : []) {
    const it = permitidas.get(x?.id);
    if (!it || !Array.isArray(x.valor) || !x.valor.length) continue;
    let valor = x.valor.map(String);
    if (it.tipo === "abierta") valor = [it.opciones.some((o) => o.id === valor[0]) ? valor[0] : "texto"];
    else {
      valor = valor.filter((v) => it.opciones.some((o) => o.id === v) || (it.aceptaOtro && v === "otro"));
      if (!valor.length) continue;
      if (it.tipo === "opcion") valor = valor.slice(0, 1);
    }
    respuestas.push({ id: it.id, valor });
  }
  return { tipo: tipo as TipoRespuesta | "pregunta", riesgo: r.riesgo === true, respuestas };
}

// ---------- 2. conductor ----------

const MODOS_DESVIO = ["pregunta", "privacidad", "pide_orientacion", "sin_sentido", "groseria", "fuera_de_tema"];

function sistemaConducir(): string {
  const ej = Object.entries(g.ejercicios).map(([id, e]) => `- ${id}: "${e.titulo}". Para qué sirve: ${e.para ?? ""}`).join("\n");
  return `${REGLAS_ECO}

Acompañas una plática de escucha. La meta: que el joven se sienta escuchado y pueda sacar lo que trae dentro. Es una plática, no un examen.

Las preguntas las pone el sistema, tal cual están escritas, con sus botones y con una introducción cuando cambia el tema. Tú NO escribes preguntas del cuestionario, no las adelantas y no las repites. En cada turno eliges un modo:

"escuchar": cuando se abrió, contó algo que le pesa o escribió más que una respuesta corta sobre cómo se siente. Retoma lo que dijo con sus palabras, con calidez, y si cabe invítalo a seguir contando cómo se siente con eso (una pregunta abierta y corta, como "¿Cómo te sientes con eso?" o "¿Quieres contarme un poco más de cómo te sientes?"). No preguntes qué pasó, quién, dónde ni por qué. Máximo 2 oraciones y unas 25 palabras.

"seguir": en los demás casos. Escribe una frase puente corta y cálida (máximo 12 palabras, sin preguntas) que reconozca cómo se siente. Después el sistema pone la introducción del tema (si toca) y la siguiente pregunta. En el puente no menciones lugares, personas ni hechos (colonia, escuela, casa, mamá, balazos…): sólo cómo se siente. Si contestó tocando un botón o con una o dos palabras, el puente puede ir vacío ("") o ser muy corto ("Va.", "Gracias por contarme."). Si toca una introducción de tema, el puente va vacío o muy corto, para no amontonar.

Cómo hablas:
- Español de México, sencillo, como le hablarías a alguien de 12 años. Nada rebuscado ni técnico.
- Cálido como alguien buena onda que escucha, no como terapeuta ni como maestro: nada de "valido", "entiendo perfectamente", "eso debe ser muy difícil para ti", "es normal sentirse así", "se nota que".
- Suena como una persona: varía cómo empiezas; no empieces siempre con "Gracias"; no repitas las mismas palabras de un mensaje a otro.
- Nada de frases para cambiar de tema ("Cambiando un poquito", "Ahora, pensando en…"): eso lo pone el sistema.
- Si se desvía, bromea o insulta: no regañes ni sermonees; calma y humor ligero.
- Ejercicios: puedes ofrecer uno cuando la emoción es intensa, cuando lo pide o cuando algo le pesa mucho. NO escribas tú la oferta: pon el id en "ofrecer" y en "mensaje" sólo reconoce lo que dijo, sin preguntas (el sistema agrega qué es, para qué sirve y los botones Sí / Ahora no). Si pregunta qué es o para qué sirve un ejercicio, explícalo con la información de abajo.
- "ejercicio": si el joven escribió que sí quiere hacer el ejercicio que se le ofreció, o si pide uno ("ayúdame a respirar", "¿hacemos lo de los sentidos?"), aunque ya lo haya hecho: pon su id y se muestra en pantalla. En "mensaje" sólo una frase corta, sin preguntas.

Nunca:
- Preguntas por qué, ni pides nombres, lugares, escuelas o detalles de lo que pasó.
- Das consejos, diagnósticos o teléfonos (el directorio de ayuda lo muestra el sistema).
- Hablas de denuncias, policía, delitos, cárteles o drogas por su nombre.
- Prometes que nadie va a saber nada, ni que todo va a estar bien.

Información que puedes usar si pregunta:
- Qué es Eco: ${g.ia?.proposito ?? ""}
- Privacidad: ${g.ia?.privacidad ?? ""}
- Ejercicios:
${ej}

Devuelve JSON: {"modo": "seguir" o "escuchar", "mensaje": "...", "ofrecer": id de ejercicio o null, "ejercicio": id o null}.`;
}

const ESQUEMA_CONDUCIR = {
  type: "object",
  additionalProperties: false,
  properties: {
    modo: { type: "string", enum: ["seguir", "escuchar"] },
    mensaje: { type: "string" },
    ofrecer: { type: ["string", "null"] },
    ejercicio: { type: ["string", "null"] },
  },
  required: ["modo", "mensaje", "ofrecer", "ejercicio"],
};

type Forzado = "seguir" | "responder" | null;

function instrucciones(p: PedidoConversar, tipo: string, forzado: Forzado, respiracion: boolean, sig: PedidoConversar["siguientes"]): string[] {
  const xs: string[] = [];
  if (respiracion)
    xs.push("El termómetro está en «Muy fuerte». Modo seguir: reconoce que es muy intenso y que cuando una emoción está así de fuerte el cuerpo se acelera; sin preguntas. Pon ofrecer = \"respiracion\".");
  if (forzado === "responder") {
    xs.push("Modo responder (pon modo \"seguir\" en el JSON): la pregunta que le hiciste sigue en pantalla con sus botones. En máximo 2 oraciones y sin preguntas, contesta su duda o, si se desvió, regresa con calma y dile que puede contestar la de arriba cuando quiera. No la repitas.");
    if (tipo === "privacidad") xs.push("Preguntó por su privacidad: contesta con la información de privacidad.");
    if (tipo === "pide_orientacion") xs.push("Pidió orientación sobre algo serio: reconoce que es importante y dile que abajo le aparecen lugares donde lo pueden orientar. No des consejos.");
  } else if (forzado === "seguir") {
    xs.push("En este turno el modo es \"seguir\".");
    if (tipo === "no_quiere") xs.push("No quiso contestar la pregunta: está bien. El puente lo dice con naturalidad (\"Va, no pasa nada.\") y seguimos.");
    if (tipo === "privacidad") xs.push("Preguntó por su privacidad: el puente contesta con la información de privacidad (máximo 30 palabras, sin preguntas).");
    if (tipo === "pregunta") xs.push("Hizo una pregunta: el puente la contesta en una o dos frases (máximo 30 palabras, sin preguntas).");
    if (tipo === "pide_orientacion") xs.push("Pidió orientación: el puente reconoce que es importante y dice que abajo le aparecen lugares donde lo pueden orientar.");
  } else if (p.puedeEscuchar === false) xs.push("Ya escuchaste dos turnos seguidos: en este turno el modo es \"seguir\".");
  if (!sig?.length) xs.push("Ya no quedan preguntas de esta parte: el puente cierra con calidez, sin despedirte (después vienen unas preguntas más).");
  return xs;
}

/** El siguiente paso que el sistema va a mostrar, para que el puente lleve hacia él. */
function textoSiguiente(sig: PedidoConversar["siguientes"]): string {
  const s = sig?.[0];
  if (!s) return "LO QUE SIGUE: (nada; se cierra esta parte)";
  return `LO QUE SIGUE (lo pone el sistema tal cual, después de tu mensaje; no lo repitas):${s.intro ? `\nIntroducción del tema: "${s.intro}"` : ""}\nPregunta: "${s.texto}"`;
}

type Propuesta = { modo: "seguir" | "escuchar"; mensaje: string; ejercicio: string | null; ofrecer: string | null; pideOferta: boolean };

async function conducir(p: PedidoConversar, tipo: string, extraidas: string[], forzado: Forzado, respiracion: boolean, sig: PedidoConversar["siguientes"]) {
  const contenido = [
    `PREGUNTA QUE SE LE ACABA DE HACER: ${p.item ? `"${itemPorId(g, p.item)?.texto ?? p.item}"` : "(ninguna)"}`,
    textoSiguiente(sig),
    `Ejercicios ya hechos: ${p.ejercicios.join(", ") || "ninguno"}. Ejercicios ya ofrecidos: ${(p.ofrecidos ?? []).join(", ") || "ninguno"}${(p.ofrecidos ?? []).length >= 2 ? " (ya no ofrezcas más)" : ""}.`,
    extraidas.length ? `De su último mensaje quedó registrado: ${extraidas.join(", ")}.` : "",
    instrucciones(p, tipo, forzado, respiracion, sig).map((x) => `INDICACIÓN: ${x}`).join("\n"),
    `PLÁTICA HASTA AHORA:\n${p.historial.map((m) => `${m.quien === "eco" ? "Eco" : "Joven"}: ${m.texto}`).join("\n")}`,
  ].filter(Boolean).join("\n\n");

  const modoFinal = (x: Propuesta): "seguir" | "escuchar" | "responder" =>
    forzado === "responder" ? "responder" : forzado === "seguir" || respiracion || p.puedeEscuchar === false ? "seguir" : x.modo;
  const revisar = (x: Propuesta): string | null =>
    (x.pideOferta && !x.ofrecer ? "ya se ofrecieron suficientes ejercicios o ése ya se ofreció; no ofrezcas otro" : null) ??
    (x.ofrecer && x.mensaje.includes("?") ? "al ofrecer un ejercicio el mensaje no lleva preguntas" : null) ??
    (!x.ofrecer && !x.ejercicio && /ejercicio|respirar|respiraci[oó]n/i.test(x.mensaje) && x.mensaje.includes("?") && !/qu[eé] es|para qu[eé]/i.test(p.texto ?? "")
      ? "ofrece un ejercicio en el mensaje; para ofrecerlo usa el campo ofrecer y no escribas la oferta"
      : null) ??
    motivoModo(x.mensaje, x.ofrecer ? "seguir" : modoFinal(x), tipo);
  const salida = (x: Propuesta) => ({ mensaje: x.mensaje, modo: modoFinal(x), ejercicio: x.ejercicio, ofrecer: x.ofrecer });

  const sistema = sistemaConducir();
  const propuestas: Propuesta[] = [];
  let nota = "";
  for (let intento = 0; intento < 2; intento++) {
    const r = await pedirJSON(MODELO_ESCRITURA, sistema, contenido + nota, ESQUEMA_CONDUCIR, 500, 14000);
    if (!r) break;
    const ejercicio = typeof r.ejercicio === "string" && r.ejercicio in g.ejercicios ? r.ejercicio : null;
    const ofrecidos = p.ofrecidos ?? [];
    const pideOferta = typeof r.ofrecer === "string" && r.ofrecer in g.ejercicios && !ejercicio;
    const x: Propuesta = {
      modo: r.modo === "escuchar" ? "escuchar" : "seguir",
      mensaje: abrirPreguntas(String(r.mensaje ?? "").trim().replace(/^["“«]|["”»]$/g, "")),
      ejercicio,
      ofrecer: pideOferta && !ejercicio && !p.ejercicios.includes(r.ofrecer as string) && !ofrecidos.includes(r.ofrecer as string) && (ofrecidos.length < 2 || respiracion) ? (r.ofrecer as string) : null,
      pideOferta,
    };
    const motivo = revisar(x);
    if (!motivo) return salida(x);
    propuestas.push(x);
    registrarFalla("conducir", new Error(`rechazado (${modoFinal(x)}): ${motivo}`));
    nota = `\n\nTu respuesta anterior no se pudo usar porque ${motivo}. Escríbela de nuevo cumpliendo las reglas.`;
  }
  // Dos rechazos: se repara la propuesta (la última primero): sin muletillas ni frases de cambio de tema y,
  // si va a seguir, sin preguntas. Si nada sirve, se sigue sin puente.
  for (const x of propuestas.reverse()) {
    const arreglada = repararPropuesta(x, modoFinal(x));
    if (arreglada && !revisar(arreglada)) {
      registrarFalla("conducir", new Error("reparado"));
      return salida(arreglada);
    }
  }
  return null;
}

function repararPropuesta(x: Propuesta, modo: "seguir" | "escuchar" | "responder"): Propuesta | null {
  let mensaje = quitarConectores(quitarMuletillas(x.mensaje));
  if (modo !== "escuchar" || x.ofrecer) mensaje = mensaje.split(/(?<=[.!?])\s+/).filter((o) => !o.includes("?")).join(" ").trim();
  else mensaje = acortar(mensaje);
  return mensaje !== x.mensaje ? { ...x, mensaje } : null;
}

/** Cuando la IA no dio un mensaje válido para responder una duda o un desvío: los textos aprobados. */
function respuestaFija(tipo: string): string {
  if (tipo === "privacidad") return g.desvios.privacidad.slice(0, 2).join(" ");
  if (tipo === "pide_orientacion") return "Eso es importante. Abajo te aparecen lugares donde te pueden orientar.";
  if (tipo === "pregunta") return "Es para saber cómo estás tú. Contesta como quieras: con un botón o con tus palabras.";
  return "Va, sin bronca. Cuando quieras, contesta la de arriba.";
}

const ACLARAR = "No te entendí bien. ¿Cuál de estas se parece más?";

export async function conversar(p: PedidoConversar): Promise<RespuestaConversar> {
  const { nucleo, opcionales } = disponibles(p);
  let tipo: TipoRespuesta | "pregunta" = "responde";
  let respuestas: { id: string; valor: string[] }[] = [];
  if (p.texto) {
    const v = await vigilar(p, [...nucleo, ...opcionales]);
    if (!v) throw new Error("vigilante sin respuesta");
    if (v.riesgo) return { riesgo: true, tipo: v.tipo === "pregunta" ? "responde" : v.tipo, respuestas: [], mensaje: null, modo: "seguir", ejercicio: null };
    tipo = v.tipo;
    respuestas = v.respuestas;
  }
  const extraidas = respuestas.map((r) => r.id);
  const tipoCliente = (tipo === "pregunta" ? "responde" : tipo) as TipoRespuesta;
  const sinContestar = !!p.item && !p.cubiertos.includes(p.item) && !extraidas.includes(p.item);
  // Termómetro en «Muy fuerte» (4) recién contestado o pendiente: el código pide ofrecer la respiración.
  const termometro = respuestas.find((r) => r.id === "en_termometro")?.valor[0];
  const respiracion = p.respiracion === "pendiente" || (p.respiracion === "no" && termometro === "t5");

  // Respuesta corta que no se entendió a una pregunta de botones: una sola aclaración, sin llamar al conductor.
  if (!respiracion && tipo === "responde" && sinContestar && p.puedeAclarar && p.texto && p.texto.split(/\s+/).length <= 8)
    return { riesgo: false, tipo: tipoCliente, respuestas, mensaje: ACLARAR, modo: "aclarar", ejercicio: null };

  // La pregunta del guion que sigue: la primera que no quedó contestada con lo que acaba de decir.
  const sig = (p.siguientes ?? []).filter((s) => !extraidas.includes(s.id));
  const forzado: Forzado = respiracion ? "seguir" : MODOS_DESVIO.includes(tipo) && sinContestar ? "responder" : MODOS_DESVIO.includes(tipo) || tipo === "no_quiere" ? "seguir" : null;

  let c = null;
  try { c = await conducir(p, tipo, extraidas, forzado, respiracion, sig); } catch (e) { registrarFalla("conducir", e); }
  // Termómetro en «Muy fuerte» (4): la respiración se ofrece sí o sí.
  if (respiracion && !p.ejercicios.includes("respiracion") && !(p.ofrecidos ?? []).includes("respiracion") && !c?.ofrecer) {
    const sinPregunta = (c?.mensaje ?? "").split(/(?<=[.!?])\s+/).filter((o) => !o.includes("?")).join(" ").trim();
    c = { mensaje: sinPregunta || "Eso es muy intenso.", modo: "seguir" as const, ejercicio: null, ofrecer: "respiracion" };
  }
  const final = c ?? (forzado === "responder" ? { mensaje: respuestaFija(tipo), modo: "responder" as const, ejercicio: null, ofrecer: null } : { mensaje: "", modo: "seguir" as const, ejercicio: null, ofrecer: null });
  return {
    riesgo: false,
    tipo: tipoCliente,
    respuestas,
    mensaje: final.mensaje,
    modo: final.modo,
    ejercicio: final.ejercicio,
    ofrecer: final.ofrecer,
    respaldo: !c,
    ...(respiracion ? { respiracion: "ofrecida" } : {}),
  } as RespuestaConversar;
}
