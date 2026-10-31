// Un turno de la fase en que la IA conduce la plática. El código vigila:
// - riesgo en cada mensaje (lista de alarma aquí + vigilante en el servidor) → protocolo de crisis;
// - qué preguntas del núcleo faltan, el límite de turnos y la ronda rápida final;
// - la escalera de desvíos (tercer desvío → "¿otro día?") y el directorio cuando pide orientación.
import type { EjercicioId, Estado, Guion, Instancia, Salida } from "./tipos";
import { activarRojo, esperaIA, ofrecerOtroDia, pendientesNucleo, porSinonimos, seguirGuion, type Entrada } from "./motor";
import { filtrarIdentificadores, nivelAlarma } from "./seguridad";
import { catalogo, itemPorId, leerLocal, omitir, opcionesCompletas, registrar } from "./catalogo";
import { opcionParecida } from "./ortografia";
import type { ServicioIA } from "./ia-tipos";

export const MAX_TURNOS = 40;

type Uso = { llamadas: number; respaldos: number; puentes: number };

const OPC_OFERTA = [{ id: "si", label: "Sí, va" }, { id: "no", label: "Ahora no" }];
const OPC_LISTO = [{ id: "listo", label: "Listo" }];

/** La oferta de un ejercicio, con el texto aprobado: qué vas a hacer, para qué sirve y que es opcional. */
export function textoOferta(g: Guion, id: string): string {
  const e = g.ejercicios[id as EjercicioId];
  const plantilla = g.ia?.ofertaEjercicio ?? "Te propongo un ejercicio de un minuto. {como} {para} ¿Quieres intentarlo?";
  return plantilla.replace("{como}", e?.como ?? "").replace("{para}", e?.para ?? "").replace(/\s+/g, " ").trim();
}

export function enFaseIA(estado: Estado): boolean {
  return estado.modo === "ia" && estado.esperando?.paso.id === "_ia" && !!estado.ia;
}

/** Siguiente pregunta obligatoria tal como está en el guion (respaldo cuando la IA no responde). */
export async function turnoIA(
  g: Guion, inst: Instancia, estadoPrevio: Estado, entrada: Entrada, ia: ServicioIA | null,
): Promise<{ estado: Estado; salida: Salida[]; uso: Uso }> {
  const estado = structuredClone(estadoPrevio);
  const salida: Salida[] = [];
  const uso: Uso = { llamadas: 0, respaldos: 0, puentes: 0 };
  const st = estado.ia!;
  const texto = entrada.texto?.trim() || null;
  const filtrado = texto ? filtrarIdentificadores(texto).texto : null;
  const item = st.item;

  // 0. Oferta de ejercicio: el sí, el no y el "Listo" los resuelve el código.
  if (st.oferta && entrada.opcion && !texto) {
    if (st.oferta === "hecho") {
      st.historial.push({ quien: "joven", texto: "Listo, hice el ejercicio." });
      st.oferta = null;
    } else if (entrada.opcion === "si") {
      const id = st.oferta;
      st.historial.push({ quien: "joven", texto: "Sí, va." });
      salida.push({ tipo: "ejercicio", ejercicio: id as EjercicioId });
      st.ejercicios.push(id);
      if (id === "respiracion") st.respiracion = "ofrecida";
      st.oferta = "hecho";
      const t = "Aquí está. Tómate tu tiempo; cuando termines, toca «Listo» o cuéntame cómo te fue.";
      salida.push({ tipo: "eco", texto: t });
      st.historial.push({ quien: "eco", texto: `[se mostró el ejercicio ${id}] ${t}` });
      estado.esperando = esperaIA(g, null, t, OPC_LISTO);
      return { estado, salida, uso };
    } else {
      st.historial.push({ quien: "joven", texto: "Ahora no." });
      st.oferta = null;
    }
    st.turnos++;
    return conversarYSeguir(g, inst, estado, salida, uso, ia, null, null, null);
  }
  if (st.oferta) st.oferta = null;

  // 1. Etiquetas tocadas: se registran tal cual, sin pasar por la IA.
  let tocadas = entrada.opciones?.length ? entrada.opciones : entrada.opcion ? [entrada.opcion] : [];
  const it = itemPorId(g, item);
  // 1a. Respuesta corta escrita con faltas ("Aveces", "Nunka"): se toma como la opción que es, sin preguntarle otra vez.
  let corregida = false;
  if (it && !tocadas.length && texto && it.tipo === "opcion") {
    const id = opcionParecida(opcionesCompletas(g, it.id), texto);
    if (id) { tocadas = [id]; corregida = true; }
  }
  // 1b. Varias opciones (emociones) dichas en corto y a su modo ("Chingón", "tranqui", "triste y con coraje").
  if (it && !tocadas.length && texto && it.tipo === "multiple" && texto.split(/\s+/).length <= 6) {
    const ids = porSinonimos(opcionesCompletas(g, it.id), texto);
    if (ids.length) { tocadas = ids; corregida = true; }
  }
  let etiquetas = "";
  if (it && tocadas.length) {
    registrar(g, estado, it.id, tocadas);
    etiquetas = it.opciones.filter((o) => tocadas.includes(o.id)).map((o) => o.label).join(", ");
  }
  const dicho = corregida ? etiquetas : [filtrado, etiquetas].filter(Boolean).join(" · ");
  if (dicho) st.historial.push({ quien: "joven", texto: dicho });
  st.turnos++;

  // 2. Lista de alarma: lo inequívoco activa la crisis sin esperar a nadie.
  const nivel = texto ? nivelAlarma(texto, g.alarma, g.alarmaRevisar) : null;
  if (nivel === "segura") { activarRojo(g, inst, estado, salida); return { estado, salida, uso }; }

  // Si se corrigió, la IA recibe la opción tal cual ("A veces"), no la palabra mal escrita.
  return conversarYSeguir(g, inst, estado, salida, uso, ia, corregida ? etiquetas : filtrado, texto, nivel);
}

async function conversarYSeguir(
  g: Guion, inst: Instancia, estado: Estado, salida: Salida[], uso: Uso, ia: ServicioIA | null,
  filtrado: string | null, texto: string | null, nivel: "segura" | "revisar" | null,
): Promise<{ estado: Estado; salida: Salida[]; uso: Uso }> {
  const st = estado.ia!;
  const item = st.item;
  const it = itemPorId(g, item);
  // 3. La IA: vigilante + conductor en el servidor.
  let r = null;
  if (ia?.conversar) {
    uso.llamadas++;
    r = await ia.conversar({
      codigo: estado.codigo,
      historial: st.historial.slice(-16),
      texto: filtrado,
      item,
      cubiertos: Object.keys(estado.respuestas).filter((k) => itemPorId(g, k)),
      preguntados: st.preguntados ?? [],
      opcionales: st.opcionales,
      turnos: st.turnos,
      maxTurnos: MAX_TURNOS,
      respiracion: st.respiracion,
      ejercicios: st.ejercicios,
      ofrecidos: st.ofrecidos ?? [],
    });
  }

  // 3a. Sin IA: si lo ambiguo de la lista no se pudo revisar, gana la crisis; si no, sigue el guion.
  if (!r) {
    uso.respaldos++;
    if (nivel === "revisar") { activarRojo(g, inst, estado, salida); return { estado, salida, uso }; }
    respaldoSinRepetir(g, inst, estado, salida, texto, filtrado);
    return { estado, salida, uso };
  }

  if (r.riesgo) { activarRojo(g, inst, estado, salida); return { estado, salida, uso }; }

  // 4. Lo que el vigilante entendió de su mensaje.
  for (const x of r.respuestas) {
    if (estado.respuestas[x.id] && x.id !== item) continue;
    registrar(g, estado, x.id, x.valor, filtrado ?? undefined);
  }
  if (item === "en_emociones" && filtrado && estado.respuestas.en_emociones) estado.textos.en_emociones = filtrado;
  if (r.tipo === "no_quiere" && item) omitir(estado, item);

  // 5. Escalera de desvíos (se mantiene la acordada): al tercero, "¿seguimos o lo dejamos para otro día?".
  if (r.tipo === "sin_sentido" || r.tipo === "groseria" || r.tipo === "fuera_de_tema") {
    estado.desvios++;
    estado.desviosTotal++;
    if (estado.desvios >= 3) { ofrecerOtroDia(estado, g.desvios.otroDia, salida); return { estado, salida, uso }; }
  }
  if (r.tipo === "se_quiere_ir") { ofrecerOtroDia(estado, g.desvios.seQuiereIr, salida); return { estado, salida, uso }; }

  // 6. Termómetro alto: se pide ofrecer la respiración (el servidor avisa cuando ya la ofreció).
  if (r.respiracion === "ofrecida") st.respiracion = "ofrecida";
  else if (st.respiracion === "no" && (estado.respuestas.en_termometro?.num ?? 0) >= 4) st.respiracion = "pendiente";

  // 7. Lo que dice Eco. Si el servidor no logró un mensaje válido de la IA, el respaldo lo pone el código
  // y nunca repite una pregunta que ya se hizo.
  if (r.respaldo && !r.ofrecer) {
    uso.respaldos++;
    respaldoSinRepetir(g, inst, estado, salida, texto, filtrado);
    return { estado, salida, uso };
  }
  if (r.respaldo) uso.respaldos++; else uso.puentes++;
  const mensaje = r.mensaje ?? "";
  if (mensaje) {
    salida.push({ tipo: "eco", texto: mensaje });
    st.historial.push({ quien: "eco", texto: mensaje });
  }
  if (r.tipo === "pide_orientacion") salida.push({ tipo: "directorio", excluir: ["denuncia"] });
  if (r.ejercicio && !st.ejercicios.includes(r.ejercicio)) {
    salida.push({ tipo: "ejercicio", ejercicio: r.ejercicio as never });
    st.ejercicios.push(r.ejercicio);
    if (r.ejercicio === "respiracion") st.respiracion = "ofrecida";
  }
  st.historial = st.historial.slice(-30);

  // 8. ¿Termina la plática con IA? Sigue la ronda rápida (si falta para el 80%) y el cierre.
  const sinPendientes = pendientesNucleo(g, estado).length === 0;
  if (r.terminar || st.turnos >= MAX_TURNOS || (sinPendientes && !r.item)) {
    seguirGuion(g, inst, estado, salida);
    return { estado, salida, uso };
  }
  // Oferta de ejercicio: el texto aprobado y los botones Sí / Ahora no los pone el código.
  if (r.ofrecer && g.ejercicios[r.ofrecer as EjercicioId] && !st.ejercicios.includes(r.ofrecer)) {
    const oferta = textoOferta(g, r.ofrecer);
    salida.push({ tipo: "eco", texto: oferta });
    st.historial.push({ quien: "eco", texto: oferta });
    st.oferta = r.ofrecer;
    st.ofrecidos = [...(st.ofrecidos ?? []), r.ofrecer];
    st.item = null;
    if (r.ofrecer === "respiracion") st.respiracion = "ofrecida";
    estado.esperando = esperaIA(g, null, oferta, OPC_OFERTA);
    return { estado, salida, uso };
  }
  st.item = r.item && !estado.respuestas[r.item] ? r.item : null;
  if (st.item) marcarPreguntado(st, st.item);
  estado.esperando = esperaIA(g, st.item, mensaje);
  return { estado, salida, uso };
}

function marcarPreguntado(st: NonNullable<Estado["ia"]>, id: string) {
  st.preguntados = [...new Set([...(st.preguntados ?? []), id])];
}

/**
 * Respaldo sin la IA (no respondió o su mensaje no pasó la revisión). Regla: nunca se repite una pregunta.
 * 1. Lo que contestó a la pregunta en curso se lee con las reglas; si es una emoción con sus palabras, va como "otro".
 * 2. Si no se entendió una pregunta de botones, se pide UNA aclaración corta ("¿Cuál se parece más?") con los botones;
 *    si tampoco se entiende, se deja como saltada.
 * 3. Sigue con la primera pregunta obligatoria que todavía no se ha hecho.
 */
function respaldoSinRepetir(
  g: Guion, inst: Instancia, estado: Estado, salida: Salida[], texto: string | null, filtrado: string | null,
): void {
  const st = estado.ia!;
  const cur = itemPorId(g, st.item);
  if (cur && texto && !estado.respuestas[cur.id]) {
    const ids = leerLocal(g, cur.id, texto);
    if (ids.length) registrar(g, estado, cur.id, ids);
    else if (cur.tipo === "abierta") registrar(g, estado, cur.id, ["texto"], filtrado ?? undefined);
    else if (cur.aceptaOtro) registrar(g, estado, cur.id, ["otro"], filtrado ?? undefined);
    else if (!(st.aclarados ?? []).includes(cur.id)) {
      st.aclarados = [...(st.aclarados ?? []), cur.id];
      const t = "No te entendí bien. ¿Cuál de estas se parece más?";
      salida.push({ tipo: "eco", texto: t });
      st.historial.push({ quien: "eco", texto: t });
      estado.esperando = esperaIA(g, cur.id, t);
      return;
    } else omitir(estado, cur.id);
  }
  const hechas = new Set(st.preguntados ?? []);
  const pend = new Set(pendientesNucleo(g, estado));
  const sig = catalogo(g).find((x) => x.nucleo && pend.has(x.id) && !hechas.has(x.id));
  if (!sig || st.turnos >= MAX_TURNOS) { seguirGuion(g, inst, estado, salida); return; }
  salida.push({ tipo: "eco", texto: sig.texto });
  st.historial.push({ quien: "eco", texto: sig.texto });
  st.item = sig.id;
  marcarPreguntado(st, sig.id);
  estado.esperando = esperaIA(g, sig.id, sig.texto);
}
