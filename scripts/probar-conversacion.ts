// Pruebas de la fase en que la IA conduce, con una IA simulada (sin llamar al modelo).
// Uso: npx tsx scripts/probar-conversacion.ts
import guionJson from "../data/guion.json";
import instJson from "../config/instancia.json";
import type { Estado, Guion, Instancia, Salida } from "../lib/tipos";
import type { RespuestaConversar, ServicioIA, PedidoConversar } from "../lib/ia-tipos";
import { acortar, motivoRechazo, quitarConectores, quitarMuletillas } from "../lib/ia-tipos";
import { arrancar, crearEstado } from "../lib/motor";
import { turno } from "../lib/turno";
import { cobertura, catalogo } from "../lib/catalogo";
import { resumen } from "../lib/indices";
import { cuantifica, opcionLiteral } from "../lib/literal";

const g = guionJson as unknown as Guion;
const inst = instJson as Instancia;
let fallas = 0;
const ok = (c: boolean, n: string) => { console.log(`${c ? "✓" : "✗"} ${n}`); if (!c) fallas++; };
const textos = (s: Salida[]) => s.filter((x) => "texto" in x).map((x) => (x as { texto: string }).texto);

/** IA simulada: como el servidor, decide el modo; las preguntas las pone el código. */
function iaFalsa(opc: { riesgo?: RegExp; tipo?: RespuestaConversar["tipo"]; modo?: RespuestaConversar["modo"]; nada?: boolean } = {}): ServicioIA & { pedidos: PedidoConversar[] } {
  const pedidos: PedidoConversar[] = [];
  const desvio = ["sin_sentido", "groseria", "fuera_de_tema", "privacidad", "pide_orientacion"];
  return {
    pedidos,
    interpretar: async () => null,
    redactar: async () => null,
    conversar: async (p) => {
      pedidos.push(p);
      if (opc.nada) return null;
      if (opc.riesgo && p.texto && opc.riesgo.test(p.texto)) return { riesgo: true, tipo: "responde", respuestas: [], mensaje: null, modo: "seguir", ejercicio: null };
      const tipo = opc.tipo ?? "responde";
      const sinContestar = !!p.item && !p.cubiertos.includes(p.item);
      const modo = opc.modo ?? (desvio.includes(tipo) && sinContestar ? "responder" : "seguir");
      const mensaje = modo === "escuchar" ? "Te escucho. ¿Cómo te sientes con eso?" : modo === "responder" ? "Va, sin bronca." : p.texto ? "Va." : "";
      return { riesgo: false, tipo, respuestas: [], mensaje, modo, ejercicio: null };
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

  // 4. Orden por temas: las preguntas salen tal cual el guion, en el orden de los temas, y cada intro una sola vez.
  {
    const ia = iaFalsa();
    let e = await hastaIA(ia);
    const items: string[] = [];
    const todo: Salida[] = [];
    const pideSeguir = (x: Estado) => !!x.esperando?.opciones.some((o) => o.label === "Seguimos" || o.label === "Sí, sigamos");
    for (let k = 0; k < 80 && e.esperando && !e.terminada && e.modo === "ia" && !pideSeguir(e); k++) {
      if (e.ia?.item) items.push(e.ia.item);
      const x = e.esperando;
      const r = await turno(g, inst, e, (x.opciones.length ? (x.multiple ? { opciones: [x.opciones[0].id] } : { opcion: x.opciones[0].id }) : { texto: "pues bien" }) as never, ia, []);
      e = r.estado; todo.push(...r.salida);
    }
    const orden = g.ia!.temas!.flatMap((t) => t.items);
    const posiciones = items.map((id) => orden.indexOf(id));
    ok(posiciones.every((p, i) => p >= 0 && (i === 0 || p > posiciones[i - 1])), `las preguntas siguen el orden de los temas (${items.length})`);
    const t = textos(todo);
    const intros = g.ia!.temas!.slice(1).map((x) => x.intro);
    ok(intros.every((i) => t.filter((x) => x === i).length === 1), "cada tema abre con su intro, una sola vez");
    ok(items.slice(1).every((id) => t.includes(catalogo(g).find((c) => c.id === id)!.texto)), "las preguntas se muestran tal cual el guion");
    const iIntro = t.indexOf(g.ia!.temas![1].intro);
    ok(iIntro >= 0 && t[iIntro + 1] === catalogo(g).find((c) => c.id === "v1_colonia")!.texto, "la intro va justo antes de la primera pregunta de su tema");
    // Después de los temas: ¿seguimos?, un módulo, lo libre y el cierre.
    ok(pideSeguir(e) && e.modo === "ia", "al terminar los temas pregunta si quiere seguir");
    const m = e.ia!.modulo!;
    let r = await turno(g, inst, e, { opcion: "si" }, ia, []);
    const primera = catalogo(g).find((c) => c.bloque === m)!;
    ok(r.estado.modo === "ia" && r.estado.ia?.item === primera.id, `«Seguimos»: el módulo ${m} sigue en la plática con IA, desde su primera pregunta`);
    const f = await hastaElFinal(r.estado, ia);
    ok(f.estado.modulosHechos.length === 1 && f.estado.terminada && f.estado.completa, `luego un solo módulo (${f.estado.modulosHechos.join(",")}) y el cierre`);
    // «Terminar» va directo al cierre.
    r = await turno(g, inst, e, { opcion: "terminar" }, ia, []);
    ok(r.estado.modo === "guion" && r.estado.esperando?.paso.id === "ci_termometro", "«Terminar»: directo al cierre");
    ok(f.estado.respuestas.li_libre !== undefined, "antes del cierre, la pregunta libre");
    ok(ia.pedidos.some((p) => p.siguientes?.[0]?.intro === g.ia!.temas![1].intro), "al servidor le llega lo que sigue, con la intro del tema");
  }
  // Tema difícil (C): se le pregunta con su propia entrada; «Prefiero saltarlo» pasa a lo libre y el cierre.
  {
    const ia = iaFalsa();
    let e = await hastaIA(ia);
    for (let k = 0; k < 80 && e.modo === "ia" && e.ia?.oferta !== "continuar"; k++) {
      const x = e.esperando!;
      const ent = e.ia?.item === "en_ambito" ? { opcion: "extrano" } : x.opciones.length ? (x.multiple ? { opciones: [x.opciones[0].id] } : { opcion: x.opciones[0].id }) : { texto: "pues bien" };
      e = (await turno(g, inst, e, ent as never, ia, [])).estado;
    }
    ok(e.ia?.modulo === "C" && /tema que puede ser difícil/.test(e.esperando?.pregunta ?? ""), "lo que le hace sentir así es alguien que ya no está → tema C, con su pregunta de entrada");
    const r = await turno(g, inst, e, { opcion: "terminar" }, ia, []);
    ok(r.estado.esperando?.paso.id === "li_libre" && r.estado.respuestas.mc_entrar?.valor === "saltar", "«Prefiero saltarlo»: pasa a la pregunta libre y queda registrado");
  }
  // Límite de turnos: se pasa a la ronda rápida.
  {
    const ia = iaFalsa();
    let e = await hastaIA(ia);
    e.ia!.turnos = 39;
    const r = await turno(g, inst, e, { opciones: ["triste"] }, ia, []);
    ok(r.estado.modo === "guion" && textos(r.salida).includes(g.ia!.rondaIntro), "al llegar al límite de turnos sigue la ronda rápida");
  }
  // Escuchar: sin pregunta medida, máximo dos turnos seguidos.
  {
    const ia = iaFalsa({ modo: "escuchar" });
    let e = await hastaIA(ia);
    let r = await turno(g, inst, e, { texto: "pues no sé, ando con muchas cosas en la cabeza y no duermo" }, ia, []);
    ok(r.estado.ia?.item === null && r.estado.esperando?.opciones.length === 0 && textos(r.salida).length === 1, "escuchar: sólo su frase, sin botones");
    r = await turno(g, inst, r.estado, { texto: "es que todo se junta" }, ia, []);
    ok(r.estado.ia?.item === null, "escuchar: segundo turno seguido");
    r = await turno(g, inst, r.estado, { texto: "y ya no sé qué hacer" }, ia, []);
    ok(!!r.estado.ia?.item && ia.pedidos.at(-1)?.puedeEscuchar === false, "a la tercera sigue con la siguiente pregunta");
    // Si ya contestó la pregunta (aquí, tocando una emoción), no se queda escuchando aunque la IA lo pida.
    e = await hastaIA(ia);
    r = await turno(g, inst, e, { opciones: ["triste"] }, ia, []);
    ok(r.estado.ia?.item === "en_termometro", "ya contestó: sigue con la siguiente pregunta, no se queda escuchando");
  }
  // Responder: una duda o un desvío no reimprime la pregunta; siguen sus botones.
  {
    const ia = iaFalsa({ tipo: "privacidad" });
    let e = await hastaIA(ia);
    const r = await turno(g, inst, e, { texto: "¿quién lee esto?" }, ia, []);
    ok(r.estado.ia?.item === "en_emociones" && r.estado.esperando!.opciones.length === 12 && textos(r.salida).length === 1, "responder: contesta y deja la misma pregunta con sus botones, sin repetirla");
  }
  // Aclarar: una sola vez por pregunta.
  {
    const ia: ServicioIA = {
      interpretar: async () => null, redactar: async () => null,
      conversar: async (p) => (p.texto === "depende" && p.puedeAclarar
        ? { riesgo: false, tipo: "responde", respuestas: [], mensaje: "No te entendí bien. ¿Cuál de estas se parece más?", modo: "aclarar", ejercicio: null }
        : { riesgo: false, tipo: "responde", respuestas: [], mensaje: "", modo: "seguir", ejercicio: null }),
    };
    let e = await hastaIA(ia);
    e = (await turno(g, inst, e, { opciones: ["triste"] }, ia, [])).estado;
    let r = await turno(g, inst, e, { texto: "depende" }, ia, []);
    ok(r.estado.ia?.item === "en_termometro" && r.estado.ia?.aclarados?.includes("en_termometro") === true, "aclarar: deja la misma pregunta con botones");
    r = await turno(g, inst, r.estado, { texto: "depende" }, ia, []);
    ok(r.estado.respuestas.en_termometro?.valor === "omitida" && r.estado.ia?.item !== "en_termometro", "aclarar: a la segunda se salta y sigue");
  }

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
  ok(!!motivoRechazo("Eso pesa. Cambiando un poquito: ¿qué tan seguido duermes mal?"), "validador: rechaza frases para cambiar de tema");
  ok(!!motivoRechazo("Eso debe ser muy difícil para ti. ¿Qué tan seguido te pasa?"), "validador: rechaza frases de terapeuta");
  ok(acortar(quitarConectores("Eso de enojarte también pesa. Cambiando un poquito: ¿qué tan seguido te pasa?")) === "Eso de enojarte también pesa. ¿Qué tan seguido te pasa?", "reparación: quita «Cambiando un poquito» y deja la pregunta con mayúscula");
  ok(acortar(quitarConectores("Ya platicamos de varias cosas, y te agradezco. Hay un tema de la casa que me quedó pendiente. ¿Qué tan seguido hay cariño en tu casa?")) === "¿Qué tan seguido hay cariño en tu casa?", "reparación: quita oraciones de relleno completas");
  ok(acortar("Uno. Dos. Tres. ¿Cuatro?") === "Uno. ¿Cuatro?", "reparación: máximo una oración antes de la pregunta");
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
  {
    const antes = e.esperandoPrevio?.pregunta ?? "";
    const t = textos(r.salida);
    ok(t.length === 1 && /^Va, seguimos\. ¿/.test(t[0]) && t[0] !== `Va, seguimos. ${antes}` && !t[0].includes("Pregunto:"), "«Seguir»: retoma sólo con la pregunta, sin repetir el mensaje anterior");
  }

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
      if (!ofrecido) { ofrecido = true; return { riesgo: false, tipo: "responde", respuestas: [], mensaje: "Eso suena muy pesado.", modo: "seguir", ofrecer: "anclaje", ejercicio: null }; }
      return { riesgo: false, tipo: "responde", respuestas: [], mensaje: "¿Cómo te fue con eso?", modo: "escuchar", ejercicio: null };
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

  // Pide respirar: se le muestra la respiración en ese momento, en la plática con IA y en las partes del guion.
  {
    const ia = iaFalsa();
    let e = await hastaIA(ia);
    const n = ia.pedidos.length;
    let r = await turno(g, inst, e, { texto: "ayudame a respirar porfa, me tiembla todo" }, ia, []);
    ok(r.salida.some((x) => x.tipo === "ejercicio" && x.ejercicio === "respiracion") && r.estado.esperando?.opciones[0]?.label === "Listo" && ia.pedidos.length === n, "con IA: «ayúdame a respirar» muestra la respiración y espera «Listo»");
    e = await hastaIA(null);
    r = await turno(g, inst, e, { texto: "¿me puedes ayudar a respirar?" }, null, []);
    ok(r.salida.some((x) => x.tipo === "ejercicio") && r.estado.esperando?.paso.id === e.esperando?.paso.id, "guion: muestra la respiración y la pregunta sigue ahí");
  }
  // Lo que dice tal cual manda; si no dice una frecuencia, no se adivina.
  ok(opcionLiteral(g, "v1_colonia", "pues se oye de todo, balazos en la noche casi siempre") === "casi_siempre", "literal: «…casi siempre» → Casi siempre (no Seguido)");
  ok(opcionLiteral(g, "v1_escuela", "pues a veces, no siempre. depende del día") === "a_veces", "literal: «a veces, no siempre» → A veces");
  ok(opcionLiteral(g, "v4_enojo", "no es seguido") === null, "literal: «no es seguido» no se toma como Seguido");
  ok(opcionLiteral(g, "v6_dinero", "me da mucho miedo eso de que te maten por dinero") === null, "literal: en «qué tanto», «mucho» dentro de una frase larga no cuenta");
  ok(!cuantifica(g, "v3_desesperanza", "pues la verdad no sé ni cómo estoy jaja. bien supongo? pero no duermo"), "sin frecuencia: no se registra la escala");
  {
    // La IA dice «Seguido», pero escribió «casi siempre»: queda Casi siempre.
    const ia: ServicioIA = {
      interpretar: async () => null, redactar: async () => null,
      conversar: async (p) => ({ riesgo: false, tipo: "responde", respuestas: p.item ? [{ id: p.item, valor: ["seguido"] }] : [], mensaje: "", modo: "seguir", ejercicio: null }),
    };
    let e = await hastaIA(ia);
    for (let k = 0; k < 20 && e.ia?.item !== "v1_colonia"; k++) {
      const x = e.esperando!;
      e = (await turno(g, inst, e, (x.opciones.length ? (x.multiple ? { opciones: [x.opciones[0].id] } : { opcion: x.opciones[0].id }) : { texto: "pues bien" }) as never, ia, [])).estado;
    }
    const r = await turno(g, inst, e, { texto: "pues se oye de todo, balazos en la noche casi siempre" }, ia, []);
    ok(r.estado.respuestas.v1_colonia?.valor === "casi_siempre", "lo que escribió tal cual gana sobre lo que entendió el modelo");
  }
  ok(!!motivoRechazo("Gracias por ser honesto."), "validador: rechaza «ser honesto»");
  ok(!!motivoRechazo("No tienes que cargarlo solo."), "validador: rechaza «cargarlo solo»");

  console.log(fallas ? `\n${fallas} fallas` : "\nTodo bien.");
  process.exit(fallas ? 1 : 0);
})();
