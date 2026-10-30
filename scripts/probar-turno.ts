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

  console.log(fallas ? `\n${fallas} fallas` : "\nTodo bien.");
  process.exit(fallas ? 1 : 0);
})();
