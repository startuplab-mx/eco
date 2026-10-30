// Pruebas de la orquestación del turno con una IA simulada (sin llamar al modelo).
// Uso: npx tsx scripts/probar-turno.ts
import guionJson from "../data/guion.json";
import instJson from "../config/instancia.json";
import type { Estado, Guion, Instancia, Salida } from "../lib/tipos";
import type { ServicioIA } from "../lib/ia-tipos";
import { arrancar, crearEstado, responder } from "../lib/motor";
import { turno } from "../lib/turno";

const g = guionJson as unknown as Guion;
const inst = instJson as Instancia;
let fallas = 0;
const ok = (cond: boolean, nombre: string) => { console.log(`${cond ? "✓" : "✗"} ${nombre}`); if (!cond) fallas++; };
const textos = (s: Salida[]) => s.filter((x) => "texto" in x).map((x) => (x as { texto: string }).texto);

function hasta(paso: string): Estado {
  let { estado } = arrancar(g, inst, crearEstado());
  const plan: Record<string, object> = {
    bi_consentimiento: { opcion: "si" }, da_edad: { opcion: "15-16" }, da_genero: { opcion: "nd" }, da_vive: { opciones: ["nd"] },
    en_emociones: { opciones: ["miedo"] }, en_termometro: { opcion: "t3" }, en_cuerpo: { opciones: ["pecho"] },
    en_tiempo: { opcion: "semana" }, en_voz: { opcion: "prefiero" }, en_ambito: { opcion: "colonia" }, en_regular: { opcion: "no" },
  };
  while (estado.esperando && estado.esperando.paso.id !== paso) {
    const p = estado.esperando.paso;
    ({ estado } = responder(g, inst, estado, (plan[p.id] ?? { opcion: estado.esperando.opciones[0].id }) as never));
  }
  return estado;
}

const iaBuena: ServicioIA = {
  interpretar: async (p) => ({ riesgo: /caso a nada/.test(p.texto), opciones: /depende.*casi siempre/.test(p.texto) ? ["casi_siempre"] : [], repregunta: "¿Dirías que es más bien A veces o Seguido?" }),
  redactar: async (p) => ({ puente: p.base.length ? "PUENTE con base" : "PUENTE libre" }),
};
const iaCaida: ServicioIA = { interpretar: async () => null, redactar: async () => null };

(async () => {
  // Validación tras la emoción: se reescribe, la pregunta siguiente queda literal.
  let e = hasta("en_ambito");
  let r = await turno(g, inst, e, { opcion: "colonia" }, iaBuena, []);
  ok(textos(r.salida)[0] === "PUENTE con base", "la validación de la emoción se reescribe");
  ok(textos(r.salida).some((t) => t.startsWith("¿Quieres hacer un ejercicio")), "la pregunta siguiente queda literal");

  // Escala con botón y sin reacción: no se llama a la IA.
  e = hasta("v2_alerta");
  r = await turno(g, inst, e, { opcion: "a_veces" }, iaBuena, []);
  ok(r.uso.llamadas === 0, "botón sin reacción no llama a la IA");

  // Escala con texto ambiguo que el modelo entiende.
  r = await turno(g, inst, e, { texto: "pues depende del día pero casi siempre" }, iaBuena, []);
  ok(r.estado.respuestas["v2_alerta"]?.valor === "casi_siempre", "el modelo entiende 'depende… casi siempre'");

  // Escala con texto que nadie entiende: repregunta del modelo, sin avanzar.
  r = await turno(g, inst, e, { texto: "mmm no sé qué decirte" }, iaBuena, []);
  ok(textos(r.salida)[0].startsWith("¿Dirías") && r.estado.esperando?.paso.id === "v2_alerta", "repregunta sin avanzar");

  // Riesgo que la lista de palabras no detecta.
  r = await turno(g, inst, e, { texto: "ya no le veo caso a nada" }, iaBuena, []);
  ok(r.estado.rojo && r.salida.some((s) => s.tipo === "eco-crisis"), "el clasificador activa el protocolo rojo");
  ok(!textos(r.salida).includes("PUENTE libre"), "en crisis no se reescribe nada");

  // IA caída: todo sale del guion.
  e = hasta("en_ambito");
  r = await turno(g, inst, e, { opcion: "colonia" }, iaCaida, []);
  ok(textos(r.salida)[0] === g.validaciones.miedo, "si la IA falla, se usa la validación del guion");
  e = hasta("v2_alerta");
  r = await turno(g, inst, e, { texto: "a veces" }, iaCaida, []);
  ok(r.estado.respuestas["v2_alerta"]?.valor === "a_veces", "si la IA falla, las reglas siguen entendiendo");

  // Lista de alarma sigue funcionando sin IA.
  r = await turno(g, inst, e, { texto: "me quiero morir" }, null, []);
  ok(r.estado.rojo, "la lista de alarma funciona sin IA");

  // Espejo con confirmación en emociones (sin IA, por reglas).
  e = hasta("en_emociones");
  r = await turno(g, inst, e, { texto: "triste. y enojado" }, null, []);
  ok(textos(r.salida)[0] === "Entiendo que hoy te sientes con tristeza y con enojo. ¿Es así?", "espejo de emociones con confirmación");
  const conf = r.estado;
  r = await turno(g, inst, conf, { opcion: "si" }, null, []);
  ok(JSON.stringify(r.estado.respuestas["en_emociones"]?.valor) === JSON.stringify(["triste", "enojado"]) && r.estado.esperando?.paso.id === "en_termometro", "«Sí» registra y sigue");
  r = await turno(g, inst, conf, { texto: "sí, así" }, null, []);
  ok(r.estado.esperando?.paso.id === "en_termometro", "«sí, así» escrito también confirma");
  r = await turno(g, inst, conf, { opcion: "no" }, null, []);
  ok(r.estado.esperando?.paso.id === "en_emociones" && !r.estado.respuestas["en_emociones"] && r.estado.esperando.textoLibre === false, "«No exactamente» muestra las etiquetas para elegir");

  // Espejo corto en una escala escrita.
  e = hasta("v2_alerta");
  r = await turno(g, inst, e, { texto: "pues depende del día pero casi siempre" }, iaBuena, []);
  ok(textos(r.salida)[0] === "Va, casi siempre.", "espejo corto en escala escrita");
  r = await turno(g, inst, e, { opcion: "a_veces" }, iaBuena, []);
  ok(!textos(r.salida).some((t) => t.startsWith("Va,")), "sin espejo cuando se pica la etiqueta");

  // "Otro": lo que no está en las opciones se registra y se repite.
  const iaOtro: ServicioIA = {
    interpretar: async (p) => ({ riesgo: false, opciones: [], repregunta: null, otro: /rodilla/.test(p.texto) ? "en la rodilla" : /ansios/.test(p.texto) ? "con ansiedad" : null }),
    redactar: async () => ({ puente: null }),
  };
  e = hasta("en_cuerpo");
  r = await turno(g, inst, e, { texto: "en mi rodilla" }, iaOtro, []);
  ok(textos(r.salida)[0] === "Va, en la rodilla." && JSON.stringify(r.estado.respuestas["en_cuerpo"]?.valor) === '["otro"]', "«en mi rodilla» → otro, con espejo");
  r = await turno(g, inst, e, { texto: "en mi rodilla" }, null, []);
  ok(textos(r.salida)[0] === "Va, «en mi rodilla».", "sin modelo: espejo con sus palabras");
  e = hasta("en_emociones");
  r = await turno(g, inst, e, { texto: "ansioso" }, iaOtro, []);
  ok(textos(r.salida)[0] === "Entiendo que hoy te sientes con ansiedad. ¿Es así?", "emoción fuera de la lista → espejo con confirmación");
  r = await turno(g, inst, r.estado, { opcion: "si" }, iaOtro, []);
  ok(JSON.stringify(r.estado.respuestas["en_emociones"]?.valor) === '["otro"]' && r.estado.esperando?.paso.id === "en_termometro", "se registra como otro y sigue");
  e = hasta("en_regular");
  r = await turno(g, inst, e, { texto: "nel, así estoy bien" }, null, []);
  ok(!textos(r.salida).some((t) => t.startsWith("Va,")), "sin espejo en el ofrecimiento del ejercicio");

  // La lista de alarma no se pierde aunque el modelo diga "no es riesgo, no entendí".
  const iaCiega: ServicioIA = { interpretar: async () => ({ riesgo: false, opciones: [], repregunta: "¿Seguido o a veces?", otro: null }), redactar: async () => null };
  e = hasta("v2_alerta");
  r = await turno(g, inst, e, { texto: "me quiero morir" }, iaCiega, []);
  ok(r.estado.rojo, "la lista de alarma gana aunque el modelo no vea riesgo (escala)");

  // ---------- Escalera de desvíos ----------
  const D = g.desvios;
  const iaDesvio: ServicioIA = {
    interpretar: async (p) => {
      const t = p.texto;
      const tipo = /no quiero contestar/.test(t) ? "no_quiere" : /me voy|aburrid/.test(t) ? "se_quiere_ir"
        : /ubicar|quién va a leer/.test(t) ? "privacidad" : /salgo de un grupo/.test(t) ? "pide_orientacion"
        : /clásico|tarea/.test(t) ? "fuera_de_tema" : /pendejo/.test(t) ? "groseria" : /depende/.test(t) ? "responde" : "sin_sentido";
      return { tipo, riesgo: false, opciones: [], repregunta: tipo === "responde" ? "¿Más bien a veces o seguido?" : null, otro: null };
    },
    redactar: async () => ({ puente: "PUENTE" }),
  };
  e = hasta("v2_alerta");
  r = await turno(g, inst, e, { texto: "asdfgh" }, null, []);
  ok(D.redirigir.includes(textos(r.salida)[0]) && r.estado.esperando?.paso.id === "v2_alerta", "1er desvío (sin modelo): redirige y espera");
  r = await turno(g, inst, r.estado, { texto: "jajajaja" }, null, []);
  ok(textos(r.salida)[0] === D.saltarInsiste[0] && r.estado.respuestas["v2_alerta"]?.valor === "omitida" && r.estado.esperando?.paso.id === "v2_dormir", "2º desvío en la misma pregunta: la deja pasar");
  r = await turno(g, inst, r.estado, { texto: "¿quién ganó el clásico?" }, iaDesvio, []);
  ok(textos(r.salida)[0] === D.otroDia && r.estado.esperando?.paso.id === "_otrodia", "3er desvío en la sesión: ofrece otro día");
  const oferta = r.estado;
  r = await turno(g, inst, oferta, { opcion: "seguir" }, iaDesvio, []);
  ok(r.estado.esperando?.paso.id === "v2_dormir" && r.estado.desvios === 0, "«Seguir» retoma la pregunta y reinicia la cuenta");
  r = await turno(g, inst, oferta, { opcion: "otrodia" }, iaDesvio, []);
  ok(r.estado.terminada && textos(r.salida)[0].startsWith("Va, lo dejamos para otro día") && r.salida.some((x) => x.tipo === "directorio"), "«Otro día» despide con directorio");

  e = hasta("v2_alerta");
  r = await turno(g, inst, e, { texto: "no quiero contestar eso" }, iaDesvio, []);
  ok(D.saltarNoQuiere.includes(textos(r.salida)[0]) && r.estado.respuestas["v2_alerta"]?.valor === "omitida" && r.estado.desvios === 0, "«no quiero contestar»: salta sin contar desvío");
  r = await turno(g, inst, e, { texto: "esto está aburrido, ya me voy" }, iaDesvio, []);
  ok(textos(r.salida)[0] === D.seQuiereIr && r.estado.esperando?.paso.id === "_otrodia", "«ya me voy»: ofrece seguir u otro día");
  r = await turno(g, inst, e, { texto: "¿me pueden ubicar?" }, iaDesvio, []);
  ok(textos(r.salida)[0] === D.privacidad[0] && textos(r.salida).includes(e.esperando!.pregunta!) && r.estado.desvios === 0, "privacidad: responde y vuelve a preguntar");
  r = await turno(g, inst, e, { texto: "¿cómo me salgo de un grupo?" }, iaDesvio, []);
  ok(r.salida.some((x) => x.tipo === "directorio") && r.estado.esperando?.paso.id === "v2_alerta", "orientación: directorio y vuelve a preguntar");
  r = await turno(g, inst, e, { texto: "eres un bot bien pendejo" }, iaDesvio, []);
  ok(D.groseria.includes(textos(r.salida)[0]), "grosería al bot: respuesta sin regaño");
  r = await turno(g, inst, e, { texto: "pues depende" }, iaDesvio, []);
  ok(textos(r.salida)[0].startsWith("¿Más bien") && r.estado.esperando?.paso.id === "v2_alerta", "respuesta ambigua: repregunta una vez");
  r = await turno(g, inst, r.estado, { texto: "pues depende" }, iaDesvio, []);
  ok(r.estado.respuestas["v2_alerta"]?.valor === "omitida" && r.estado.desviosTotal === 0, "ambigua dos veces: la deja pasar sin contar desvío");

  e = hasta("en_cuerpo");
  r = await turno(g, inst, e, { texto: "chinga tu madre" }, null, []);
  ok(!r.estado.respuestas["en_cuerpo"] && D.groseria.includes(textos(r.salida)[0]), "grosería ya no se registra como «otro»");

  e = hasta("v2_alerta");
  r = await turno(g, inst, e, { texto: "me quiero morir de risa" }, null, []);
  ok(!r.estado.rojo, "«me quiero morir de risa» no activa la crisis");
  r = await turno(g, inst, e, { texto: "me quiero morir" }, null, []);
  ok(r.estado.rojo, "«me quiero morir» sí activa la crisis");

  let c = arrancar(g, inst, crearEstado()).estado;
  r = await turno(g, inst, c, { texto: "jajaja" }, null, []);
  r = await turno(g, inst, r.estado, { texto: "jajaja" }, null, []);
  ok(r.estado.esperando?.paso.id === "bi_consentimiento" && !r.estado.respuestas["bi_consentimiento"], "el consentimiento nunca se salta");

  console.log(fallas ? `\n${fallas} fallas` : "\nTodo bien.");
  process.exit(fallas ? 1 : 0);
})();
