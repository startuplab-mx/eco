// La IA conduce, el código vigila.
// 1. Vigilante (modelo rápido): riesgo, tipo de respuesta y qué preguntas quedaron contestadas.
// 2. Conductor (modelo de escritura): lo que Eco dice ahora y qué tema toca, con la lista de pendientes.
// El código valida todo lo que sale; si el conductor no da un mensaje válido, se usa la pregunta del guion.
import "server-only";
import guionJson from "@/data/guion.json";
import type { Guion } from "@/lib/tipos";
import { catalogo, itemPorId, type ItemCatalogo } from "@/lib/catalogo";
import { abrirPreguntas, acortar, motivoRechazo, quitarConectores, quitarMuletillas, TIPOS_RESPUESTA, type PedidoConversar, type RespuestaConversar, type TipoRespuesta } from "@/lib/ia-tipos";
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

function sistemaConducir(): string {
  const ej = Object.entries(g.ejercicios).map(([id, e]) => `- ${id}: "${e.titulo}". Para qué sirve: ${e.para ?? ""}`).join("\n");
  return `${REGLAS_ECO}

Ahora conduces la plática. Tu meta es doble: que el joven se sienta escuchado y que, de forma natural, la plática pase por los temas pendientes de la lista. Es una plática, no un cuestionario.

Cómo hablas:
- Español de México, sencillo, como le hablarías a alguien de 12 años: palabras de todos los días ("platicar", "ahorita", "seguido", "a salvo"). Nada rebuscado ni técnico ("inseguridad", "ámbito", "sensación", "intensidad", "afrontar", "regular emociones").
- Si usas una palabra que un chavo de secundaria podría no entender, cámbiala por una más simple.

Cómo escribes cada mensaje:
- Corto y directo: máximo 2 oraciones y unas 25 palabras en total. Se lee en un celular. Una sola pregunta por mensaje, al final, de máximo 15 palabras.
- Primero, si hace falta, una frase corta y cálida que retome lo que dijo con sus palabras (máximo 10 palabras). Luego la pregunta, sin rodeos.
- Ve directo a la pregunta: NADA de frases para cambiar de tema ("Cambiando un poquito", "Cambiemos de tema", "Ahora, pensando en…", "Hablando de eso", "Ya platicamos de varias cosas", "Hay un tema que me quedó pendiente", "Para entender mejor") ni explicaciones de por qué preguntas.
- Cálido como alguien buena onda que escucha, no como terapeuta ni como maestro: nada de "valido", "entiendo perfectamente", "eso debe ser muy difícil para ti", "es normal sentirse así".
- Si la pregunta del guion es larga, dila más corta con palabras de todos los días, sin cambiar lo que pregunta.
- Suena como una persona, no como un formulario: varía cómo empiezas. NO empieces con "Gracias por decírmelo/contármelo" (úsalo, como mucho, una vez cada cinco mensajes). No repitas las mismas palabras de un mensaje a otro ("pesa", "cansa", "desgasta"). A veces basta con retomar sus palabras ("Un 7, eso es bastante.") o ir directo a la pregunta.
- Si contestó tocando un botón, casi siempre basta con ir directo a la siguiente pregunta, sin comentario.
- Elige el siguiente tema según lo que va contando: si habla de su colonia, sigue con lo de la colonia; si habla de dormir, pregunta por eso. Si no hay hilo, toma el siguiente pendiente obligatorio.
- Para las preguntas con opciones (escalas): usa tus palabras, pero pregunta de forma que se pueda contestar con esas opciones. Si las opciones son Nunca… Casi siempre, pregunta "¿qué tan seguido…?". Si son Nada… Mucho, pregunta "¿qué tanto…?" (o "¿qué tan importante…?"). Si son Muy poquito… Muy fuerte, pregunta "¿qué tan fuerte…?". Nunca uses números ni escalas ("del 1 al 5", "del 1 al 10") ni pidas calificar una frase ("¿qué tan de acuerdo estás…?"): pregunta directo, como en una plática. Nunca preguntes sí/no cuando las opciones son de frecuencia. Marca su id en "item": las opciones se le muestran como botones. Una pregunta medida por mensaje.
- Para preguntas abiertas, marca su id en "item" también.
- Si pregunta algo ("¿para qué es esto?", "¿qué es eso?", "no entendí"), contesta en una o dos frases con la información de abajo y vuelve a la pregunta.
- Si se desvía, bromea o insulta: no regañes ni sermonees; reconoce con humor ligero o calma y regresa al tema.
- Si no quiere contestar algo, está bien: dilo con naturalidad y pasa a otro tema.
- Si dice que se siente mal o algo le pesa, valida y no corras al siguiente tema en el mismo mensaje.
- Ejercicios: puedes ofrecer uno cuando la emoción es intensa, cuando lo pide o cuando algo le pesa mucho. NO escribas tú la oferta: pon el id en "ofrecer" y en "mensaje" sólo reconoce lo que dijo, sin preguntas (el sistema agrega qué es el ejercicio, para qué sirve y los botones Sí / Ahora no). "item" en null. Si te pregunta qué es o para qué sirve un ejercicio, explícalo con la información de abajo.
- "ejercicio": sólo si el joven escribió que sí quiere hacer el ejercicio que se le ofreció; pon su id y se muestra en pantalla.
- Temas opcionales: sólo si la plática va hacia ahí. No los busques.
- "terminar": true cuando ya no queden pendientes obligatorios, cuando el joven quiera terminar, o al llegar al límite de turnos. En ese caso el mensaje cierra el tema con calidez (sin despedirte del todo: después vienen dos preguntas de cierre) e "item" es null.

Nunca:
- Preguntas por qué, ni pides nombres, lugares, escuelas o detalles de lo que pasó.
- Das consejos, diagnósticos o teléfonos (el directorio de ayuda lo muestra el sistema).
- Hablas de denuncias, policía, delitos, cárteles o drogas por su nombre.
- Prometes que nadie va a saber nada, ni que todo va a estar bien.
- Repites una pregunta que ya está contestada.

Información que puedes usar si pregunta:
- Qué es Eco: ${g.ia?.proposito ?? ""}
- Privacidad: ${g.ia?.privacidad ?? ""}
- Ejercicios:
${ej}

Devuelve JSON: {"mensaje": "...", "item": id o null, "ofrecer": id de ejercicio o null, "ejercicio": id o null, "terminar": true/false}.`;
}

const ESQUEMA_CONDUCIR = {
  type: "object",
  additionalProperties: false,
  properties: {
    mensaje: { type: "string" },
    item: { type: ["string", "null"] },
    ofrecer: { type: ["string", "null"] },
    ejercicio: { type: ["string", "null"] },
    terminar: { type: "boolean" },
  },
  required: ["mensaje", "item", "ofrecer", "ejercicio", "terminar"],
};

function instrucciones(p: PedidoConversar, tipo: string, nucleo: ItemCatalogo[], respiracion: boolean): string[] {
  const xs: string[] = [];
  if (respiracion)
    xs.push(
      "El termómetro está en «Muy fuerte». En este mensaje reconoce que es muy intenso y que cuando una emoción está así de fuerte el cuerpo se acelera; sin preguntas. Pon ofrecer = \"respiracion\" e item null.",
    );
  if (tipo === "privacidad") xs.push("Preguntó por su privacidad: contesta con la información de privacidad, en dos frases, y vuelve al tema.");
  if (tipo === "pide_orientacion") xs.push("Pidió orientación sobre algo serio: reconoce que es importante y dile que abajo le aparecen lugares donde lo pueden orientar. No des consejos. Luego vuelve al tema con suavidad.");
  if (tipo === "se_quiere_ir") xs.push("Quiere terminar: respétalo, agradece y pon terminar en true.");
  const restantes = p.maxTurnos - p.turnos;
  if (restantes <= 0) xs.push("Se llegó al límite de la plática: cierra con calidez y pon terminar en true.");
  else if (restantes <= 8 && nucleo.length > restantes)
    xs.push(`Quedan ${restantes} turnos y ${nucleo.length} temas obligatorios: ve más directo, un tema por mensaje.`);
  if (!nucleo.length) xs.push("Ya no quedan temas obligatorios. Si la plática lo pide puedes tocar uno opcional; si no, cierra y pon terminar en true.");
  return xs;
}

async function conducir(p: PedidoConversar, tipo: string, extraidas: string[], respiracion: boolean) {
  // Las que ya se preguntaron no se le ofrecen otra vez a la IA, aunque no se hayan contestado.
  const yaHechas = new Set(p.preguntados ?? []);
  const libres = disponibles({ ...p, cubiertos: [...p.cubiertos, ...extraidas] });
  const nucleo = libres.nucleo.filter((x) => !yaHechas.has(x.id));
  const opcionales = libres.opcionales.filter((x) => !yaHechas.has(x.id));
  const contenido = [
    `PENDIENTES OBLIGATORIOS (${nucleo.length}):\n${nucleo.map(lineaItem).join("\n") || "(ninguno)"}`,
    `TEMAS OPCIONALES DISPONIBLES:\n${opcionales.map(lineaItem).join("\n") || "(ninguno)"}`,
    `Turno ${p.turnos} de ${p.maxTurnos}. Ejercicios ya hechos: ${p.ejercicios.join(", ") || "ninguno"}. Ejercicios ya ofrecidos: ${(p.ofrecidos ?? []).join(", ") || "ninguno"}${(p.ofrecidos ?? []).length >= 2 ? " (ya no ofrezcas más)" : ""}.`,
    extraidas.length ? `De su último mensaje ya quedó registrado: ${extraidas.join(", ")}. No lo vuelvas a preguntar.` : "",
    instrucciones(p, tipo, nucleo, respiracion).map((x) => `INDICACIÓN: ${x}`).join("\n"),
    `PLÁTICA HASTA AHORA:\n${p.historial.map((m) => `${m.quien === "eco" ? "Eco" : "Joven"}: ${m.texto}`).join("\n")}`,
  ].filter(Boolean).join("\n\n");

  const sistema = sistemaConducir();
  type Propuesta = { mensaje: string; item: string | null; ejercicio: string | null; ofrecer: string | null; terminar: boolean; pideOferta: boolean };
  const revisar = (x: Propuesta): string | null =>
    (x.pideOferta && !x.ofrecer ? "ya se ofrecieron suficientes ejercicios o ése ya se ofreció; no ofrezcas otro y sigue con la plática" : null) ??
    motivoRechazo(x.mensaje, x.terminar || !!x.ofrecer) ??
    (!x.ofrecer && !x.ejercicio && /ejercicio|respirar|respiraci[oó]n/i.test(x.mensaje) && x.mensaje.includes("?") && !/qu[eé] es|para qu[eé]/i.test(p.texto ?? "")
      ? "ofrece un ejercicio en el mensaje; para ofrecerlo usa el campo ofrecer y no escribas la oferta"
      : null) ??
    (x.item && !x.ofrecer && !x.terminar && !x.mensaje.includes("?") ? "marca un item pero no hace la pregunta; el mensaje debe terminar con esa pregunta, con signos ¿?" : null) ??
    (x.item && !itemPorId(g, x.item) ? `el item ${x.item} no existe` : null) ??
    (x.item && (p.cubiertos.includes(x.item) || extraidas.includes(x.item)) ? `el item ${x.item} ya está contestado` : null) ??
    (x.item && yaHechas.has(x.item) ? `ya hiciste la pregunta ${x.item}; no la repitas, aunque no te haya contestado: sigue con otra` : null);
  const salida = (x: Propuesta) => ({ mensaje: x.mensaje, item: x.ofrecer ? null : x.item, ejercicio: x.ejercicio, ofrecer: x.ofrecer, terminar: !x.ofrecer && x.terminar });

  const propuestas: Propuesta[] = [];
  let nota = "";
  for (let intento = 0; intento < 2; intento++) {
    const r = await pedirJSON(MODELO_ESCRITURA, sistema, contenido + nota, ESQUEMA_CONDUCIR, 700, 14000);
    if (!r) break;
    const ejercicio = typeof r.ejercicio === "string" && r.ejercicio in g.ejercicios ? r.ejercicio : null;
    const ofrecidos = p.ofrecidos ?? [];
    const pideOferta = typeof r.ofrecer === "string" && r.ofrecer in g.ejercicios && !ejercicio;
    const x: Propuesta = {
      mensaje: abrirPreguntas(String(r.mensaje ?? "").trim()),
      item: typeof r.item === "string" && r.item ? r.item : null,
      ejercicio,
      ofrecer: pideOferta && !p.ejercicios.includes(r.ofrecer as string) && !ofrecidos.includes(r.ofrecer as string) && (ofrecidos.length < 2 || respiracion) ? (r.ofrecer as string) : null,
      terminar: r.terminar === true,
      pideOferta,
    };
    const motivo = revisar(x);
    if (!motivo) return salida(x);
    propuestas.push(x);
    registrarFalla("conducir", new Error(`rechazado: ${motivo}`));
    nota = `\n\nTu respuesta anterior no se pudo usar porque ${motivo}. Escríbela de nuevo cumpliendo las reglas.`;
  }
  // Dos rechazos: antes de caer al guion, se repara la propuesta (la última primero) y se vuelve a revisar.
  for (const x of propuestas.reverse()) {
    const arreglada = repararPropuesta(x);
    if (arreglada && !revisar(arreglada)) {
      registrarFalla("conducir", new Error("reparado"));
      return salida(arreglada);
    }
  }
  return null;
}

/**
 * Arreglos seguros a un mensaje rechazado: quita las oraciones con muletillas y, si marcó una pregunta
 * pero no la escribió, le agrega la del guion al final.
 */
function repararPropuesta<T extends { mensaje: string; item: string | null; ofrecer: string | null; terminar: boolean }>(x: T): T | null {
  let mensaje = acortar(quitarConectores(quitarMuletillas(x.mensaje)));
  if (x.item && !x.ofrecer && !x.terminar && !mensaje.includes("?")) {
    const it = itemPorId(g, x.item);
    const pregunta = it ? preguntaDelItem(it.texto) : null;
    if (!pregunta) return null;
    mensaje = `${mensaje} ${pregunta}`.trim();
  }
  return mensaje && mensaje !== x.mensaje ? { ...x, mensaje } : null;
}

/** La última oración con pregunta del texto del guion ("Lo que sentimos… ¿En qué parte lo sientes?" → "¿En qué parte lo sientes?"). */
function preguntaDelItem(texto: string): string | null {
  const oraciones = texto.split(/(?<=[.?!])\s+(?=[¿A-ZÁÉÍÓÚÑ"])/).filter((o) => o.includes("?"));
  const q = oraciones[oraciones.length - 1]?.trim();
  return q || null;
}

/** Mensaje de respaldo: la siguiente pregunta obligatoria tal como está en el guion. */
function respaldo(p: PedidoConversar, extraidas: string[]): { mensaje: string; item: string | null; terminar: boolean } {
  const { nucleo } = disponibles({ ...p, cubiertos: [...p.cubiertos, ...extraidas] });
  const sig = nucleo[0];
  if (!sig) return { mensaje: "Gracias por todo lo que me has contado.", item: null, terminar: true };
  return { mensaje: sig.texto, item: sig.id, terminar: false };
}

export async function conversar(p: PedidoConversar): Promise<RespuestaConversar> {
  const { nucleo, opcionales } = disponibles(p);
  let tipo: TipoRespuesta | "pregunta" = "responde";
  let respuestas: { id: string; valor: string[] }[] = [];
  if (p.texto) {
    const v = await vigilar(p, [...nucleo, ...opcionales]);
    if (!v) throw new Error("vigilante sin respuesta");
    if (v.riesgo) return { riesgo: true, tipo: v.tipo === "pregunta" ? "responde" : v.tipo, respuestas: [], mensaje: null, item: null, ejercicio: null, terminar: false };
    tipo = v.tipo;
    respuestas = v.respuestas;
  }
  const extraidas = respuestas.map((r) => r.id);
  // Termómetro en «Muy fuerte» (4) recién contestado o pendiente: el código pide ofrecer la respiración.
  const termometro = respuestas.find((r) => r.id === "en_termometro")?.valor[0];
  const respiracion = p.respiracion === "pendiente" || (p.respiracion === "no" && termometro === "t5");

  let c = null;
  try { c = await conducir(p, tipo, extraidas, respiracion); } catch (e) { registrarFalla("conducir", e); }
  // Termómetro en «Muy fuerte» (4): la respiración se ofrece sí o sí. Si el modelo no la ofreció, se quita su pregunta.
  if (c && respiracion && !c.ofrecer && !p.ejercicios.includes("respiracion") && !(p.ofrecidos ?? []).includes("respiracion")) {
    const sinPregunta = c.mensaje.split(/(?<=[.!?])\s+/).filter((o) => !o.includes("?")).join(" ").trim();
    c = { ...c, mensaje: sinPregunta || "Eso es muy intenso.", item: null, ofrecer: "respiracion", terminar: false };
  }
  const final = c ?? respaldo(p, extraidas);
  return {
    riesgo: false,
    tipo: tipo === "pregunta" ? "responde" : tipo,
    respuestas,
    mensaje: final.mensaje,
    item: final.item,
    ejercicio: c?.ejercicio ?? null,
    ofrecer: c?.ofrecer ?? (respiracion && !c ? "respiracion" : null),
    terminar: final.terminar,
    respaldo: !c,
    ...(respiracion ? { respiracion: "ofrecida" } : {}),
  } as RespuestaConversar;
}
