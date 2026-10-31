// Pruebas de la fase en que la IA conduce, con una IA simulada (sin llamar al modelo).
// Uso: npx tsx scripts/probar-conversacion.ts
import guionJson from "../data/guion.json";
import instJson from "../config/instancia.json";
import type { Estado, Guion, Instancia, Salida } from "../lib/tipos";
import type { RespuestaConversar, ServicioIA, PedidoConversar } from "../lib/ia-tipos";
import { motivoRechazo, quitarMuletillas } from "../lib/ia-tipos";
import { arrancar, crearEstado } from "../lib/motor";
import { turno } from "../lib/turno";
import { cobertura, catalogo } from "../lib/catalogo";
import { resumen } from "../lib/indices";

const g = guionJson as unknown as Guion;
const inst = instJson as Instancia;
let fallas = 0;
const ok = (c: boolean, n: string) => { console.log(`${c ? "✓" : "✗"} ${n}`); if (!c) fallas++; };
const textos = (s: Salida[]) => s.filter((x) => "texto" in x).map((x) => (x as { texto: string }).texto);

/** IA simulada: contesta la siguiente pendiente obligatoria y registra lo que el "joven" tocó. */
function iaFalsa(opc: { riesgo?: RegExp; tipo?: RespuestaConversar["tipo"]; terminarEn?: number; nada?: boolean } = {}): ServicioIA & { pedidos: PedidoConversar[] } {
  const pedidos: PedidoConversar[] = [];
  return {
    pedidos,
    interpretar: async () => null,
    redactar: async () => null,
    conversar: async (p) => {
      pedidos.push(p);
      if (opc.nada) return null;
      if (opc.riesgo && p.texto && opc.riesgo.test(p.texto)) return { riesgo: true, tipo: "responde", respuestas: [], mensaje: null, item: null, ejercicio: null, terminar: false };
      const pend = catalogo(g).filter((x) => x.nucleo && !x.id.startsWith("ci_") && !p.cubiertos.includes(x.id));
      const sig = pend[0];
      return {
        riesgo: false, tipo: opc.tipo ?? "responde", respuestas: [],
        mensaje: sig ? `Pregunto: ${sig.texto}` : "Gracias.", item: sig?.id ?? null, ejercicio: null,
        terminar: !sig || (opc.terminarEn !== undefined && p.turnos >= opc.terminarEn),
      };
    },
  };
}

async function hastaIA(ia: ServicioIA | null): Promise<Estado> {
  let { estado } = arrancar(g, inst, crearEstado(Math.random, new Date(), 3, true));
  const plan = [{ opcion: "si" }, { opcion: "15-16" }, { opcion: "mujer" }, { opciones: ["mama"] }];
  for (const e of plan) estado = (await turno(g, inst, estado, e as never, ia, [])).estado;
  return estado;
}

/** Contesta siempre con la primera etiqueta disponible (o texto) hasta terminar. */
async function hastaElFinal(estado: Estado, ia: ServicioIA | null, max = 120) {
  const todo: Salida[] = [];
  for (let k = 0; k < max && estado.esperando && !estado.terminada; k++) {
    const e = estado.esperando;
    const ent = e.opciones.length ? (e.multiple ? { opciones: [e.opciones[0].id] } : { opcion: e.opciones[0].id }) : { texto: "pues bien" };
    const r = await turno(g, inst, estado, ent as never, ia, []);
    estado = r.estado; todo.push(...r.salida);
  }
  return { estado, todo };
}

(async () => {
  // 1. Con IA: después de los datos empieza la fase con IA, con la emoción y sus etiquetas.
  let ia = iaFalsa();
  let e = await hastaIA(ia);
  ok(e.modo === "ia" && e.esperando?.paso.id === "_ia" && e.esperando.opciones.length === 12, "con IA: tras los datos la IA conduce, empezando por la emoción con etiquetas");

  // 2. Etiqueta tocada: se registra sin pasar por el modelo como texto.
  let r = await turno(g, inst, e, { opciones: ["triste"] }, ia, []);
  ok(JSON.stringify(r.estado.respuestas.en_emociones?.valor) === '["triste"]', "la etiqueta tocada se registra tal cual");
  ok(ia.pedidos[0].texto === null && ia.pedidos[0].item === "en_emociones", "al modelo le llega que tocó etiqueta (sin texto)");
  ok(r.estado.ia?.item === "en_termometro" && r.estado.esperando?.opciones.length === 5, "la siguiente pregunta medida muestra sus etiquetas");

  // 3. Plática completa: termina en el cierre con todo el núcleo contestado y el resumen sale bien.
  const fin = await hastaElFinal(r.estado, ia);
  const cob = cobertura(g, fin.estado);
  ok(fin.estado.terminada && fin.estado.completa, "la plática llega al cierre y queda completa");
  ok(cob.contestadas === cob.total, `cobertura completa (${cob.contestadas}/${cob.total})`);
  const res = resumen(g, inst, fin.estado);
  ok(res.nivel !== "rojo" && Object.keys(res.indices).length >= 8 && res.consintio, "el resumen tiene índices y nivel");

  // 4. La IA termina pronto: la ronda rápida completa hasta el 80%.
  ia = iaFalsa({ terminarEn: 4 });
  e = await hastaIA(ia);
  const f2 = await hastaElFinal(e, ia);
  const c2 = cobertura(g, f2.estado);
  ok(textos(f2.todo).includes(g.ia!.rondaIntro), "si la IA termina antes, aparece la ronda rápida");
  ok(c2.contestadas >= Math.ceil(0.8 * c2.total), `la ronda llega al 80% (${c2.contestadas}/${c2.total})`);

  // 5. Riesgo: la lista local activa la crisis sin esperar al modelo; el vigilante también.
  ia = iaFalsa();
  e = await hastaIA(ia);
  r = await turno(g, inst, e, { texto: "ya no quiero vivir" }, ia, []);
  ok(r.estado.rojo && r.salida.some((s) => s.tipo === "eco-crisis") && ia.pedidos.length === 0, "lista de alarma: crisis inmediata, sin llamar al modelo");
  ia = iaFalsa({ riesgo: /caso a nada/ });
  e = await hastaIA(ia);
  r = await turno(g, inst, e, { texto: "la neta ya no le veo caso a nada" }, ia, []);
  ok(r.estado.rojo && r.estado.modo === "guion", "vigilante: crisis y sale de la fase con IA");
  const tras = await hastaElFinal(r.estado, ia);
  ok(tras.estado.terminada && !Object.keys(tras.estado.respuestas).some((k) => k.startsWith("v")), "tras la crisis no vuelve a preguntar nada del núcleo");

  // 6. Ambiguo de la lista + modelo caído: gana la crisis.
  ia = iaFalsa({ nada: true });
  e = await hastaIA(ia);
  r = await turno(g, inst, e, { texto: "me corto mucho" }, ia, []);
  ok(r.estado.rojo, "«me corto…» sin modelo: crisis");

  // Nunca se repite una pregunta.
  {
    // «Chingón» se registra como «Con alegría» sin depender de la IA.
    let ia = iaFalsa();
    let e = await hastaIA(ia);
    let r = await turno(g, inst, e, { texto: "Chingon" }, ia, []);
    ok(JSON.stringify(r.estado.respuestas.en_emociones?.valor) === '["contento"]', "«Chingón» → Con alegría");

    // Sin IA: una emoción con sus palabras va como «otro» y la siguiente pregunta NO es otra vez la de emociones.
    ia = iaFalsa({ nada: true });
    e = await hastaIA(ia);
    r = await turno(g, inst, e, { texto: "me siento de la fregada" }, ia, []);
    ok(JSON.stringify(r.estado.respuestas.en_emociones?.valor) === '["otro"]', "sin IA: emoción con sus palabras → «otro»");
    ok(!textos(r.salida).some((t) => /cómo te sientes hoy/i.test(t)), "sin IA: no vuelve a preguntar cómo se siente");

    // Sin IA: respuesta que no se entiende en una escala → UNA aclaración corta; a la segunda se salta. Nunca la pregunta completa otra vez.
    e = r.estado;
    const enCurso = e.ia!.item!;
    r = await turno(g, inst, e, { texto: "xyz qwe" }, ia, []);
    ok(textos(r.salida)[0] === "No te entendí bien. ¿Cuál de estas se parece más?" && r.estado.esperando!.opciones.length > 0, `sin IA: aclaración corta con botones (${enCurso})`);
    r = await turno(g, inst, r.estado, { texto: "xyz qwe" }, ia, []);
    ok(r.estado.respuestas[enCurso]?.valor === "omitida" && r.estado.ia!.item !== enCurso, "sin IA: a la segunda se deja como saltada y sigue con otra");

    // A lo largo de toda una plática sin IA, ninguna pregunta se hace dos veces.
    e = await hastaIA(ia);
    const hechas: string[] = [];
    for (let k = 0; k < 60 && e.esperando && !e.terminada && e.modo === "ia"; k++) {
      if (e.ia?.item) hechas.push(e.ia.item);
      e = (await turno(g, inst, e, { texto: k % 3 ? "pues no sé" : "a veces" }, ia, [])).estado;
    }
    const repetidas = hechas.filter((x, i) => hechas.indexOf(x) !== i && hechas[i - 1] !== x);
    ok(repetidas.length === 0, `sin IA: ninguna pregunta se repite en toda la plática${repetidas.length ? ` (${repetidas.join(", ")})` : ""}`);
  }

  // Faltas de ortografía en modo IA: «Aveces» se registra como «A veces» y la IA recibe la opción, no la palabra mal escrita.
  {
    const ia = iaFalsa();
    let e = await hastaIA(ia);
    // Avanza hasta una pregunta de frecuencia.
    for (let k = 0; k < 20 && !(e.esperando?.opciones.some((o) => o.id === "a_veces")); k++) {
      const x = e.esperando!;
      e = (await turno(g, inst, e, (x.opciones.length ? (x.multiple ? { opciones: [x.opciones[0].id] } : { opcion: x.opciones[0].id }) : { texto: "pues bien" }) as never, ia, [])).estado;
    }
    const item = e.ia!.item!;
    const antes = ia.pedidos.length;
    const r = await turno(g, inst, e, { texto: "Aveces" }, ia, []);
    ok(r.estado.respuestas[item]?.valor === "a_veces", `modo IA: «Aveces» se registra como «A veces» (${item})`);
    ok(ia.pedidos[antes]?.texto === "A veces", "modo IA: la IA recibe «A veces», no «[lugar]» ni la palabra mal escrita");
    ok(!textos(r.salida).some((t) => /lugares/.test(t)), "modo IA: no responde como si hubiera dado un lugar");
  }

  // Validador: nada de escalas de números ni de acuerdo en lo que escribe el modelo.
  ok(!!motivoRechazo("Del 1 al 5, ¿qué tan de acuerdo estás con esta frase?"), "validador: rechaza «del 1 al 5 / de acuerdo»");
  ok(!!motivoRechazo("¿Qué tan de acuerdo estás con que la violencia es normal?"), "validador: rechaza «qué tan de acuerdo»");
  ok(!!motivoRechazo("Eso de cuidar a tu jefa dice mucho de cómo la quieres."), "validador: rechaza «dice mucho…»");
  ok(!!motivoRechazo("Mucho, eso dice bastante de ti."), "validador: rechaza «dice bastante de ti»");
  ok(!!motivoRechazo("Tienes de dónde agarrarte, y eso se nota."), "validador: rechaza «eso se nota»");
  for (const m of ["Eso también cabe aquí. ¿Qué tan fuerte lo sientes?", "Todo cabe en este espacio.", "Es totalmente válido sentir eso.", "Es válido que te sientas así."])
    ok(!!motivoRechazo(m), `validador: rechaza la muletilla «${m.slice(0, 30)}…»`);
  ok(quitarMuletillas("Qué bueno. Eso también cabe aquí. ¿Qué tan fuerte sientes esa alegría ahorita?") === "Qué bueno. ¿Qué tan fuerte sientes esa alegría ahorita?", "reparación: se quita sólo la oración con muletilla");
  ok(motivoRechazo("Donde vives, ¿qué tanto se ve la violencia como algo normal?") === null, "validador: acepta «¿qué tanto…?»");

  // 7. Modelo caído a media plática: sigue con las preguntas del guion sin trabarse.
  r = await turno(g, inst, e, { opciones: ["miedo"] }, ia, []);
  ok(!r.estado.rojo && r.estado.ia?.item === "en_termometro" && textos(r.salida)[0].includes("¿Qué tan fuerte"), "modelo caído: siguiente pregunta del guion con etiquetas");

  // 8. Escalera de desvíos: al tercero, otro día.
  ia = iaFalsa({ tipo: "fuera_de_tema" });
  e = await hastaIA(ia);
  for (let i = 0; i < 3; i++) e = (await turno(g, inst, e, { texto: "¿quién ganó el clásico?" }, ia, [])).estado;
  ok(e.esperando?.paso.id === "_otrodia", "tres desvíos: ofrece dejarlo para otro día");
  r = await turno(g, inst, e, { opcion: "seguir" }, ia, []);
  ok(r.estado.modo === "ia" && r.estado.esperando?.paso.id === "_ia" && r.estado.desvios === 0, "«Seguir» regresa a la plática con IA");

  // 9. Pausa y salir funcionan en la fase con IA.
  ia = iaFalsa();
  e = await hastaIA(ia);
  r = await turno(g, inst, e, { texto: "pausa" }, ia, []);
  ok(r.estado.esperando?.paso.id === "_pausa", "pausa en la fase con IA");
  r = await turno(g, inst, r.estado, { opcion: "seguir" }, ia, []);
  ok(r.estado.esperando?.paso.id === "_ia", "seguir regresa a la IA");

  // 10. Sin IA desde el inicio: guion completo de antes.
  e = await hastaIA(null);
  ok(e.modo === "guion" && e.esperando?.paso.id === "en_emociones", "sin IA: guion completo, empieza con la emoción del guion");

  // 11. Lo que se manda al servidor no lleva nombres.
  ia = iaFalsa();
  e = await hastaIA(ia);
  await turno(g, inst, e, { texto: "me siento mal porque mi primo juan se fue" }, ia, []);
  ok(!JSON.stringify(ia.pedidos).includes("juan"), "al servidor no llegan nombres");

  // 12. Oferta de ejercicio: el texto lo pone el código (qué es, para qué sirve) con botones Sí / Ahora no.
  let ofrecido = false;
  const iaOferta: ServicioIA = {
    interpretar: async () => null, redactar: async () => null,
    conversar: async (p) => {
      if (!ofrecido) { ofrecido = true; return { riesgo: false, tipo: "responde", respuestas: [], mensaje: "Eso suena muy pesado.", item: null, ofrecer: "anclaje", ejercicio: null, terminar: false }; }
      return { riesgo: false, tipo: "responde", respuestas: [], mensaje: "¿Cómo te fue con eso?", item: null, ejercicio: null, terminar: false };
    },
  };
  e = await hastaIA(iaOferta);
  r = await turno(g, inst, e, { texto: "ando bien acelerado" }, iaOferta, []);
  const oferta = textos(r.salida).at(-1) ?? "";
  ok(oferta.startsWith("Te propongo un ejercicio de un minuto.") && oferta.includes("5 cosas que ves") && oferta.includes("regresa tu atención"), "la oferta explica qué vas a hacer y para qué sirve");
  ok(JSON.stringify(r.estado.esperando?.opciones.map((o) => o.label)) === '["Sí, va","Ahora no"]', "la oferta trae botones Sí, va / Ahora no");
  const trasSi = await turno(g, inst, r.estado, { opcion: "si" }, iaOferta, []);
  ok(trasSi.salida.some((x) => x.tipo === "ejercicio" && x.ejercicio === "anclaje") && trasSi.estado.esperando?.opciones[0]?.label === "Listo", "«Sí, va» muestra el ejercicio y un botón «Listo»");
  const trasListo = await turno(g, inst, trasSi.estado, { opcion: "listo" }, iaOferta, []);
  ok(textos(trasListo.salida)[0] === "¿Cómo te fue con eso?" && trasListo.estado.ia?.oferta === null, "«Listo» regresa a la plática");
  const trasNo = await turno(g, inst, r.estado, { opcion: "no" }, iaOferta, []);
  ok(!trasNo.salida.some((x) => x.tipo === "ejercicio") && textos(trasNo.salida)[0] === "¿Cómo te fue con eso?", "«Ahora no» sigue la plática sin ejercicio");

  console.log(fallas ? `\n${fallas} fallas` : "\nTodo bien.");
  process.exit(fallas ? 1 : 0);
})();
