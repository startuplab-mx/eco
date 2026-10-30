// Llamadas al modelo. Sólo corre en el servidor: la llave nunca llega al navegador.
import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import {
  validarPuente, validarRepregunta,
  type PedidoInterpretar, type PedidoRedactar, type RespuestaInterpretar, type RespuestaRedactar,
} from "./ia-tipos";

export const MODELO_RAPIDO = process.env.ECO_MODELO_RAPIDO || "claude-haiku-5-5";
export const MODELO_ESCRITURA = process.env.ECO_MODELO_ESCRITURA || "claude-sonnet-5-5";
const TIEMPO_MAXIMO_MS = 3800;

let cliente: Anthropic | null = null;
export function iaDisponible(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}
function getCliente(): Anthropic {
  cliente ??= new Anthropic({ timeout: TIEMPO_MAXIMO_MS, maxRetries: 0, openTelemetry: false });
  return cliente;
}

// ---------- instrucciones ----------

const REGLAS_ECO = `Eres Eco, un espacio de escucha para jóvenes de 12 a 18 años en México que viven en lugares con violencia y crimen organizado.
Reglas que nunca rompes:
- Tuteas con calidez, sin tecnicismos ni frases de terapeuta. Español de México, natural, sin modismos forzados.
- Lenguaje neutro: no uses adjetivos con género para hablar del joven (nada de "cansado/a", "solo", "tranquila"). Usa sustantivos: "el cansancio", "la soledad", "sentir calma".
- Frases de menos de 20 palabras. Validas antes de cualquier otra cosa.
- Nunca preguntas "¿por qué?". Nunca opinas sobre la familia del joven.
- Nunca das consejos, ni sobre cómo salirse de un grupo criminal, ni de ningún tipo. No diagnosticas ni nombras trastornos.
- Nunca pides ni repites nombres, lugares, fechas, grupos u operaciones. Nunca mencionas denuncias, policía ni delitos.
- No prometes nada que no puedas cumplir.`;

const SISTEMA_INTERPRETAR = `${REGLAS_ECO}

Tu tarea ahora: leer lo que escribió un joven como respuesta a una pregunta y devolver JSON.
1. "riesgo": true SOLO si el texto dice, de forma explícita o con modismos claros, que quiere morir o hacerse daño, que alguien lo amenaza, lo lastima o lo obliga a algo, o que está en peligro ahora. Ejemplos de true: "ya no le veo caso a vivir", "me quieren levantar", "mi tío me pega", "me voy a cortar". La tristeza, el miedo o el enojo en general NO son riesgo: "estoy triste", "me da miedo la colonia", "ya no puedo con la escuela" son false.
2. "opciones": los id de las opciones que corresponden a lo que escribió. Si la pregunta es de una sola opción, devuelve como máximo uno. Si no queda claro, devuelve una lista vacía. Si la pregunta es abierta, devuelve lista vacía.
3. "repregunta": si no quedó claro y la pregunta tiene opciones, una pregunta breve y cálida (máximo 25 palabras) que le ayude a elegir, mencionando dos o tres opciones con su texto exacto. Si quedó claro o la pregunta es abierta, null.`;

const SISTEMA_REDACTAR = `${REGLAS_ECO}

Tu tarea ahora: escribir la frase de puente que Eco dice justo después de la respuesta del joven y antes de la siguiente pregunta.
- Recibes el sentido que el equipo de psicología quiere transmitir en este momento ("base"). Conserva ese sentido; puedes ajustar las palabras para que responda a lo que el joven dijo.
- Si la base está vacía, escribe un reconocimiento breve de lo que el joven dijo, o deja el puente vacío si no hace falta.
- Una o dos frases, máximo 35 palabras en total. Sin preguntas: la siguiente pregunta la hace Eco después, tal cual, y no la repites ni la adelantas.
- No repitas palabra por palabra lo que escribió el joven. No uses comillas.
Devuelve JSON con la clave "puente".`;

const ESQUEMA_INTERPRETAR = {
  type: "object",
  properties: {
    riesgo: { type: "boolean" },
    opciones: { type: "array", items: { type: "string" } },
    repregunta: { type: ["string", "null"] },
  },
  required: ["riesgo", "opciones", "repregunta"],
  additionalProperties: false,
};

const ESQUEMA_REDACTAR = {
  type: "object",
  properties: { puente: { type: "string" } },
  required: ["puente"],
  additionalProperties: false,
};

// ---------- llamadas ----------

async function pedirJSON(modelo: string, sistema: string, contenido: string, esquema: object, maxTokens: number): Promise<Record<string, unknown> | null> {
  const base = {
    model: modelo,
    max_tokens: maxTokens,
    system: sistema,
    messages: [{ role: "user" as const, content: contenido }],
  };
  let msg: Anthropic.Message;
  try {
    msg = await getCliente().messages.create({
      ...base,
      output_config: { format: { type: "json_schema", schema: esquema as Record<string, unknown> } },
    });
  } catch (e) {
    // Si el modelo no acepta formato estructurado, se pide JSON en texto.
    if (e instanceof Anthropic.BadRequestError) {
      msg = await getCliente().messages.create({ ...base, system: `${sistema}\nResponde sólo con el JSON, sin texto adicional.` });
    } else throw e;
  }
  const texto = msg.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  const json = texto.match(/\{[\s\S]*\}/);
  if (!json) return null;
  try {
    return JSON.parse(json[0]);
  } catch {
    return null;
  }
}

export async function interpretar(p: PedidoInterpretar): Promise<RespuestaInterpretar | null> {
  const contenido = JSON.stringify({
    pregunta: p.pregunta,
    tipo: p.tipo === "multiple" ? "varias opciones" : p.tipo === "abierta" ? "abierta" : "una opción",
    opciones: p.opciones,
    texto_del_joven: p.texto,
  });
  const r = await pedirJSON(MODELO_RAPIDO, SISTEMA_INTERPRETAR, contenido, ESQUEMA_INTERPRETAR, 200);
  if (!r) return null;
  const validos = new Set(p.opciones.map((o) => o.id));
  let opciones = Array.isArray(r.opciones) ? r.opciones.filter((x): x is string => typeof x === "string" && validos.has(x)) : [];
  if (p.tipo !== "multiple") opciones = opciones.slice(0, 1);
  return {
    riesgo: r.riesgo === true,
    opciones,
    repregunta: opciones.length ? null : validarRepregunta(r.repregunta),
  };
}

export async function redactar(p: PedidoRedactar): Promise<RespuestaRedactar | null> {
  const contenido = JSON.stringify({
    platica_reciente: p.historial.map((m) => `${m.quien === "eco" ? "Eco" : "Joven"}: ${m.texto}`),
    base: p.base.join(" "),
    siguiente_pregunta: p.siguiente,
  });
  const r = await pedirJSON(MODELO_ESCRITURA, SISTEMA_REDACTAR, contenido, ESQUEMA_REDACTAR, 160);
  if (!r) return null;
  const crudo = typeof r.puente === "string" ? r.puente.trim() : null;
  if (crudo === "") return { puente: p.base.length ? null : "" };
  return { puente: validarPuente(crudo) };
}
