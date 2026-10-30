// Conversaciones de prueba: el mismo joven simulado, con y sin IA.
// Sólo existe fuera de producción (versiones de prueba de Vercel o local).
import guionJson from "@/data/guion.json";
import instJson from "@/config/instancia.json";
import type { Guion, Instancia, Salida } from "@/lib/tipos";
import type { ServicioIA } from "@/lib/ia-tipos";
import { arrancar, crearEstado, type Entrada } from "@/lib/motor";
import { turno, type Mensaje } from "@/lib/turno";
import { resumen } from "@/lib/indices";
import { interpretar, redactar, iaDisponible, MODELO_RAPIDO, MODELO_ESCRITURA, registrarFalla } from "@/lib/ia-servidor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const g = guionJson as unknown as Guion;
const inst = instJson as Instancia;

type Plan = Record<string, Entrada>;
const PERSONAS: Record<string, { nombre: string; plan: Plan; defecto: number }> = {
  "1": {
    nombre: "15 años, tristeza y enojo, casa; escribe casi todo",
    defecto: 3,
    plan: {
      bi_consentimiento: { opcion: "si" }, da_edad: { texto: "tengo 15" }, da_genero: { opcion: "mujer" },
      da_vive: { opciones: ["mama", "hermanos"] },
      en_emociones: { texto: "ando bien bajoneada y con coraje" },
      en_termometro: { texto: "como un 8" }, en_cuerpo: { texto: "en el pecho y la garganta" },
      en_tiempo: { texto: "desde hace como un mes" }, en_voz: { texto: "que ya me dejen en paz" },
      en_ambito: { opcion: "casa" }, en_regular: { opcion: "no" },
      v3_triste: { texto: "pues depende del día pero casi siempre" },
      v3_desesperanza: { texto: "a veces sí, a veces no sé" },
      v4_enojo: { texto: "seguido, exploto por cualquier cosa" },
      mb_carino: { texto: "a veces mi mamá sí, mi papá casi nunca" },
      mb_tension: { texto: "todo el tiempo hay gritos" },
      mb_pedir: { texto: "que dejen de pelear" },
      mc_entrar: { opcion: "si" }, mc_perdida: { opcion: "si" }, mc_duele: { opcion: "bastante" },
      mc_decir: { texto: "que lo extraño mucho y que me hace falta" },
      md_bien: { texto: "dibujar y que soy buena amiga" },
      md_fuerza: { texto: "mi hermanito" },
      v9_adulto: { texto: "mi abuela creo" },
      li_libre: { texto: "nada más que a veces siento que nadie me pela" },
      li_cierre: { opcion: "prefiero" }, ci_termometro: { texto: "6" }, ci_ahora: { opcion: "mejor" },
      tr_seguir: { opcion: "seguir" },
    },
  },
  "2": {
    nombre: "13 años, no sabe cómo se siente; usa botones y poco texto",
    defecto: 1,
    plan: {
      bi_consentimiento: { opcion: "si" }, da_edad: { texto: "trece" }, da_genero: { opcion: "hombre" },
      da_vive: { opciones: ["mama", "abuelos"] }, en_emociones: { texto: "no sé, normal" },
      en_sensacion: { opcion: "apagado" }, en_termometro: { opcion: "t2" }, en_cuerpo: { opciones: ["ninguna"] },
      en_tiempo: { opcion: "siempre" }, en_voz: { opcion: "prefiero" }, en_ambito: { opcion: "nose" },
      en_regular: { opcion: "no" }, md_bien: { texto: "jugar fut" }, md_fuerza: { texto: "mis amigos" },
      v8_cinco: { opcion: "mas_menos" }, v9_adulto: { opcion: "nose" },
      mh_que: { texto: "que es bien bueno en el fut" }, mh_ser: { texto: "futbolista" }, mh_posible: { opcion: "imposible" },
      mh_paso: { texto: "entrenar más" }, li_libre: { opcion: "prefiero" }, li_cierre: { texto: "que nos escuchen más" },
      tr_seguir: { opcion: "seguir" }, ci_ahora: { opcion: "igual" },
    },
  },
  "3": {
    nombre: "16 años, cansancio; una frase de riesgo que no está en la lista de palabras",
    defecto: 2,
    plan: {
      bi_consentimiento: { opcion: "si" }, da_edad: { opcion: "15-16" }, da_genero: { opcion: "nd" },
      da_vive: { opciones: ["nd"] }, en_emociones: { texto: "cansancio de todo" },
      en_termometro: { opcion: "t4" }, en_cuerpo: { opciones: ["todo"] }, en_tiempo: { opcion: "mucho" },
      en_voz: { texto: "ya no puedo más" }, en_ambito: { opcion: "nd" }, en_regular: { opcion: "no" },
      v2_miedo: { opcion: "a_veces" }, v2_alerta: { opcion: "seguido" },
      v2_dormir: { texto: "casi no duermo, la neta ya no le veo caso a nada" },
    },
  },
};

const fallas: string[] = [];
function anota(donde: string) {
  return (e: unknown) => {
    registrarFalla(donde, e);
    const err = e as { status?: number; message?: string };
    fallas.push(`${donde}: ${err?.status ?? ""} ${String(err?.message ?? e).slice(0, 300)}`);
    return null;
  };
}
function servidorIA(): ServicioIA {
  return {
    interpretar: (p) => interpretar(p).then((r) => r ?? (fallas.push("interpretar: respuesta vacía o sin JSON"), null)).catch(anota("interpretar")),
    redactar: (p) => redactar(p).catch(anota("redactar")),
  };
}

async function correr(plan: Plan, defecto: number, ia: ServicioIA | null) {
  let { estado, salida } = arrancar(g, inst, crearEstado());
  const lineas: string[] = [];
  const historial: Mensaje[] = [];
  const registrar = (s: Salida[]) => {
    for (const x of s) {
      if (x.tipo === "eco" || x.tipo === "eco-crisis") { lineas.push(`Eco: ${x.texto}`); historial.push({ quien: "eco", texto: x.texto }); }
      else if (x.tipo === "ejercicio") lineas.push(`[ejercicio: ${x.ejercicio}]`);
      else if (x.tipo === "directorio") lineas.push("[directorio de ayuda]");
    }
  };
  registrar(salida);
  const uso = { llamadas: 0, respaldos: 0, puentes: 0 };
  const intentos: Record<string, number> = {};
  for (let i = 0; i < 90 && !estado.terminada && estado.esperando; i++) {
    const esp = estado.esperando;
    const id = esp.paso.id;
    intentos[id] = (intentos[id] ?? 0) + 1;
    let entrada: Entrada | undefined = intentos[id] === 1 ? plan[id] : undefined;
    if (!entrada) {
      if (esp.paso.tipo === "abierta") entrada = { opcion: esp.opciones.find((o) => o.id === "prefiero")?.id ?? esp.opciones[0]?.id };
      else if (esp.multiple) entrada = { opciones: [esp.opciones[Math.min(defecto, esp.opciones.length - 1)].id] };
      else entrada = { opcion: esp.opciones[Math.min(defecto, esp.opciones.length - 1)]?.id };
    }
    const etiqueta = entrada.texto ?? (entrada.opciones ?? [entrada.opcion]).map((x) => esp.opciones.find((o) => o.id === x)?.label ?? x).join(", ");
    lineas.push(`Joven: ${etiqueta}`);
    historial.push({ quien: "joven", texto: etiqueta });
    const r = await turno(g, inst, estado, entrada, ia, historial.slice(-6));
    estado = r.estado;
    uso.llamadas += r.uso.llamadas; uso.respaldos += r.uso.respaldos; uso.puentes += r.uso.puentes;
    registrar(r.salida);
  }
  const res = resumen(g, inst, estado);
  return { lineas, uso, nivel: res.nivel, emociones: res.emociones, items: res.items };
}

export async function GET(req: Request) {
  if (process.env.VERCEL_ENV === "production") return new Response("No disponible", { status: 404 });
  const p = new URL(req.url).searchParams.get("p") ?? "1";
  const persona = PERSONAS[p];
  if (!persona) return Response.json({ error: "persona" }, { status: 400 });
  const modo = new URL(req.url).searchParams.get("modo") ?? "ambos";
  const inicio = Date.now();
  fallas.length = 0;
  const sinIA = modo !== "ia" ? await correr(persona.plan, persona.defecto, null) : null;
  const conIA = modo !== "guion" && iaDisponible() ? await correr(persona.plan, persona.defecto, servidorIA()) : null;
  return Response.json({
    persona: persona.nombre,
    modelos: { rapido: MODELO_RAPIDO, escritura: MODELO_ESCRITURA },
    ia: iaDisponible(),
    segundos: Math.round((Date.now() - inicio) / 1000),
    sinIA,
    conIA,
    fallas: [...new Set(fallas)],
  });
}
