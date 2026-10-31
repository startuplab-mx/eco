// La IA conduce, el código vigila.
// 1. Vigilante (modelo rápido): riesgo, tipo de respuesta y qué preguntas quedaron contestadas.
// 2. Conductor (modelo de escritura): lo que Eco dice ahora y qué tema toca, con la lista de pendientes.
// El código valida todo lo que sale; si el conductor no da un mensaje válido, se usa la pregunta del guion.
import "server-only";
import guionJson from "@/data/guion.json";
import type { Guion } from "@/lib/tipos";
import { catalogo, itemPorId, type ItemCatalogo } from "@/lib/catalogo";
import { abrirPreguntas, motivoRechazo, TIPOS_RESPUESTA, type PedidoConversar, type RespuestaConversar, type TipoRespuesta } from "@/lib/ia-tipos";
import { MODELO_ESCRITURA, MODELO_RAPIDO, REGLAS_ECO, pedirJSON, registrarFalla } from "@/lib/ia-servidor";

const g = guionJson as unknown as Guion;
const MAX_OPCIONALES = 2;

// ---------- catálogo en texto para los modelos ----------

function lineaItem(it: ItemCatalogo): string {
  const ops = it.opciones.length ? ` | opciones: ${it.opciones.map((o) => `${o.id}=${o.label}`).join("; ")}` : "";
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

"riesgo": true SOLO si dice, de forma explícita o con modismos claros, que quiere morir o hacerse daño, que alguien lo amenaza, lo lastima, abusa de él o lo obliga a algo, o que está en peligro ahora. Ejemplos true: "ya no le veo caso a vivir", "me quieren levantar", "mi tío me pega", "me voy a cortar", "si no le entro me va a ir mal". La tristeza, el miedo o el enojo en general NO son riesgo. Contar que vende o consume algo, sin decir que lo obligan o que está en peligro, NO es riesgo. Las expresiones coloquiales tampoco ("me muero de risa", "me mata la tarea", "mi mamá me va a matar si repruebo").

"respuestas": las preguntas de la lista que su mensaje contesta CLARAMENTE, con los id de opción que corresponden. Reglas:
- Prioriza la pregunta que le acaban de hacer. Puedes registrar otras de la lista sólo si lo que dijo las contesta sin lugar a dudas ("no puedo dormir de lo que pienso" contesta el sueño; "mi mamá" no contesta nada por sí solo).
- Pregunta de una opción: exactamente un id. De varias: uno o más. Abierta: ["texto"] si contestó con sus palabras, o el id de la frase sugerida si eligió una.
- Termómetro: un número del 1 al 10 va a su rango (8 → t4). Frecuencias: "diario/siempre" → casi_siempre; "muy seguido/bastante" → seguido; "a veces" → a_veces; "casi no/poco" → casi_nunca; "nunca/para nada" → nunca.
- Una emoción que no está en la lista va como "otro" si la pregunta tiene esa opción; si no, no la registres.
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
      valor = valor.filter((v) => it.opciones.some((o) => o.id === v));
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

Cómo escribes cada mensaje:
- De 1 a 3 oraciones cortas, máximo unas 35 palabras: se lee en un celular. Una sola pregunta por mensaje, al final.
- Primero reconoce lo que dijo, en sus términos y sin exagerar. Luego conecta con el siguiente tema.
- Suena como una persona, no como un formulario: varía cómo empiezas. NO empieces con "Gracias por decírmelo/contármelo" (úsalo, como mucho, una vez cada cinco mensajes). No repitas las mismas palabras de un mensaje a otro ("pesa", "cansa", "desgasta"). A veces basta con retomar sus palabras ("Un 7, eso es bastante.") o ir directo a la pregunta.
- Si contestó tocando un botón, no hace falta comentar mucho: un reconocimiento breve o ninguno, y sigue.
- Elige el siguiente tema según lo que va contando: si habla de su colonia, sigue con lo de la colonia; si habla de dormir, pregunta por eso. Si no hay hilo, toma el siguiente pendiente obligatorio.
- Para las preguntas con opciones (escalas): usa tus palabras, pero pregunta de forma que se pueda contestar con esas opciones (si las opciones son de frecuencia, pregunta "qué tan seguido"). Marca su id en "item": las opciones se le muestran como botones. Una pregunta medida por mensaje.
- Para preguntas abiertas, marca su id en "item" también.
- Si pregunta algo ("¿para qué es esto?", "¿qué es eso?", "no entendí"), contesta en una o dos frases con la información de abajo y vuelve a la pregunta.
- Si se desvía, bromea o insulta: no regañes ni sermonees; reconoce con humor ligero o calma y regresa al tema.
- Si no quiere contestar algo, está bien: dilo con naturalidad y pasa a otro tema.
- Si dice que se siente mal o algo le pesa, valida y no corras al siguiente tema en el mismo mensaje.
- Ejercicios: puedes ofrecer uno cuando la emoción es intensa o lo pide. SIEMPRE explica antes para qué sirve, con la información de abajo, y pregunta si quiere hacerlo. Sólo cuando diga que sí, pon su id en "ejercicio" (se muestra en pantalla) y en "item" null.
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

Devuelve JSON: {"mensaje": "...", "item": id o null, "ejercicio": id o null, "terminar": true/false}.`;
}

const ESQUEMA_CONDUCIR = {
  type: "object",
  additionalProperties: false,
  properties: {
    mensaje: { type: "string" },
    item: { type: ["string", "null"] },
    ejercicio: { type: ["string", "null"] },
    terminar: { type: "boolean" },
  },
  required: ["mensaje", "item", "ejercicio", "terminar"],
};

function instrucciones(p: PedidoConversar, tipo: string, nucleo: ItemCatalogo[], respiracion: boolean): string[] {
  const xs: string[] = [];
  if (respiracion)
    xs.push(
      "El termómetro está en 9 o 10. En este mensaje reconoce que es muy intenso, explica que cuando una emoción está así de fuerte el cuerpo se acelera y que respirar lento le avisa al cuerpo que puede bajar la alerta, y pregunta si quiere respirar un minuto. item null.",
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
  const { nucleo, opcionales } = disponibles({ ...p, cubiertos: [...p.cubiertos, ...extraidas] });
  const contenido = [
    `PENDIENTES OBLIGATORIOS (${nucleo.length}):\n${nucleo.map(lineaItem).join("\n") || "(ninguno)"}`,
    `TEMAS OPCIONALES DISPONIBLES:\n${opcionales.map(lineaItem).join("\n") || "(ninguno)"}`,
    `Turno ${p.turnos} de ${p.maxTurnos}. Ejercicios ya hechos: ${p.ejercicios.join(", ") || "ninguno"}.`,
    extraidas.length ? `De su último mensaje ya quedó registrado: ${extraidas.join(", ")}. No lo vuelvas a preguntar.` : "",
    instrucciones(p, tipo, nucleo, respiracion).map((x) => `INDICACIÓN: ${x}`).join("\n"),
    `PLÁTICA HASTA AHORA:\n${p.historial.map((m) => `${m.quien === "eco" ? "Eco" : "Joven"}: ${m.texto}`).join("\n")}`,
  ].filter(Boolean).join("\n\n");

  const sistema = sistemaConducir();
  let nota = "";
  for (let intento = 0; intento < 2; intento++) {
    const r = await pedirJSON(MODELO_ESCRITURA, sistema, contenido + nota, ESQUEMA_CONDUCIR, 700, 14000);
    if (!r) return null;
    const mensaje = abrirPreguntas(String(r.mensaje ?? "").trim());
    const item = typeof r.item === "string" && r.item ? r.item : null;
    const ejercicio = typeof r.ejercicio === "string" && r.ejercicio in g.ejercicios ? r.ejercicio : null;
    const motivo =
      motivoRechazo(mensaje, r.terminar === true) ??
      (item && !itemPorId(g, item) ? `el item ${item} no existe` : null) ??
      (item && (p.cubiertos.includes(item) || extraidas.includes(item)) ? `el item ${item} ya está contestado` : null);
    if (!motivo) return { mensaje, item, ejercicio, terminar: r.terminar === true };
    registrarFalla("conducir", new Error(`rechazado: ${motivo}`));
    nota = `\n\nTu respuesta anterior no se pudo usar porque ${motivo}. Escríbela de nuevo cumpliendo las reglas.`;
  }
  return null;
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
  // Termómetro alto (9–10) recién contestado o pendiente: el código pide ofrecer la respiración.
  const termometro = respuestas.find((r) => r.id === "en_termometro")?.valor[0];
  const respiracion = p.respiracion === "pendiente" || (p.respiracion === "no" && termometro === "t5");

  let c = null;
  try { c = await conducir(p, tipo, extraidas, respiracion); } catch (e) { registrarFalla("conducir", e); }
  const final = c ?? respaldo(p, extraidas);
  return {
    riesgo: false,
    tipo: tipo === "pregunta" ? "responde" : tipo,
    respuestas,
    mensaje: final.mensaje,
    item: final.item,
    ejercicio: c?.ejercicio ?? null,
    terminar: final.terminar,
    respaldo: !c,
    ...(respiracion ? { respiracion: "ofrecida" } : {}),
  } as RespuestaConversar;
}
