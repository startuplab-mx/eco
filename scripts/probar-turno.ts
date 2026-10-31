// Pruebas de la orquestación del turno con una IA simulada (sin llamar al modelo).
// Uso: npx tsx scripts/probar-turno.ts
import guionJson from "../data/guion.json";
import { TODAS_LAS_COLUMNAS } from "../lib/columnas";
import instJson from "../config/instancia.json";
import type { Estado, Guion, Instancia, Salida } from "../lib/tipos";
import type { ServicioIA } from "../lib/ia-tipos";
import { arrancar, crearEstado, responder } from "../lib/motor";
import { turno } from "../lib/turno";
import { nivelAlarma, filtrarIdentificadores } from "../lib/seguridad";
import { resumen } from "../lib/indices";
import { validarPuente, validarRepregunta, validarFrase } from "../lib/ia-tipos";

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
  ok(textos(r.salida).some((t) => t.startsWith("Te propongo un ejercicio de un minuto")), "la pregunta siguiente queda literal");

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
  ok(r.estado.esperando?.paso.id === "en_emociones" && !r.estado.respuestas["en_emociones"] && r.estado.esperando.opciones.length > 0 && r.estado.esperando.textoLibre !== false, "«No exactamente» muestra las etiquetas y deja la caja de texto");
  const trasNo = await turno(g, inst, r.estado, { texto: "me quiero morir" }, null, []);
  ok(trasNo.estado.rojo, "tras «No exactamente», lo escrito pasa por la revisión de riesgo");

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

  e = hasta("en_cuerpo");
  const iaSinOtro: ServicioIA = { interpretar: async () => ({ tipo: "responde", riesgo: false, opciones: [], repregunta: "¿En qué parte del cuerpo lo notas más?", otro: null }), redactar: async () => null };
  r = await turno(g, inst, e, { texto: "estoy bien encabronado con todo" }, iaSinOtro, []);
  ok(!r.estado.respuestas["en_cuerpo"] && textos(r.salida)[0] === "¿En qué parte del cuerpo lo notas más?", "con modelo, lo que no es respuesta no se guarda como «otro»");
  e = hasta("v2_alerta");
  r = await turno(g, inst, e, { texto: "asdfgh" }, null, []);
  ok(textos(r.salida)[0] === D.redirigir[0], "la primera redirección usa la variante principal");

  // Frases ambiguas: el modelo puede descartarlas; las inequívocas, no.
  const iaSinRiesgo: ServicioIA = { interpretar: async () => ({ tipo: "responde", riesgo: false, opciones: ["casi_nunca"], repregunta: null, otro: null }), redactar: async () => null };
  e = hasta("v2_alerta");
  r = await turno(g, inst, e, { texto: "me corto el pelo cada mes, casi nunca" }, iaSinRiesgo, []);
  ok(!r.estado.rojo && r.estado.respuestas["v2_alerta"]?.valor === "casi_nunca", "«me corto el pelo»: el modelo descarta el riesgo");
  r = await turno(g, inst, e, { texto: "me corto el pelo cada mes" }, null, []);
  ok(r.estado.rojo, "«me corto…» sin modelo: gana la crisis");
  r = await turno(g, inst, e, { texto: "me quiero morir, casi nunca" }, iaSinRiesgo, []);
  ok(r.estado.rojo, "«me quiero morir»: el modelo no puede descartarlo");
  r = await turno(g, inst, e, { texto: "me-quiero-m0rir" }, null, []);
  ok(r.estado.rojo, "variantes con guiones y números también activan");

  let c = arrancar(g, inst, crearEstado()).estado;
  r = await turno(g, inst, c, { texto: "jajaja" }, null, []);
  r = await turno(g, inst, r.estado, { texto: "jajaja" }, null, []);
  ok(r.estado.esperando?.paso.id === "bi_consentimiento" && !r.estado.respuestas["bi_consentimiento"], "el consentimiento nunca se salta");

  // ——— Regresiones de la revisión independiente ———
  const iaNoEntiende: ServicioIA = { interpretar: async () => ({ tipo: "sin_sentido", riesgo: false, opciones: [], repregunta: null, otro: null }), redactar: async () => null };
  const iaRiesgo: ServicioIA = { interpretar: async () => ({ tipo: "responde", riesgo: true, opciones: [], repregunta: null, otro: null }), redactar: async () => null };

  // C1: el consentimiento no se salta aunque el modelo tampoco entienda.
  c = arrancar(g, inst, crearEstado()).estado;
  const vistos: string[] = [];
  for (let i = 0; i < 4 && !c.terminada; i++) { c = (await turno(g, inst, c, { texto: "qwerty" }, iaNoEntiende, [])).estado; vistos.push(c.esperando?.paso.id ?? "fin"); }
  ok(Object.keys(c.respuestas).length === 0 && vistos.every((p) => ["bi_consentimiento", "_otrodia", "fin"].includes(p)), `C1: con modelo, el consentimiento no se salta (${vistos.join(",")})`);
  const iaNoQuiere: ServicioIA = { interpretar: async () => ({ tipo: "no_quiere", riesgo: false, opciones: [], repregunta: null, otro: null }), redactar: async () => null };
  c = arrancar(g, inst, crearEstado()).estado;
  for (let i = 0; i < 3; i++) c = (await turno(g, inst, c, { texto: "no quiero contestar" }, iaNoQuiere, [])).estado;
  ok(!c.respuestas["bi_consentimiento"] || c.respuestas["bi_consentimiento"].valor !== "si", "C1: «no quiero contestar» nunca cuenta como sí al consentimiento");
  ok(!Object.keys(c.respuestas).some((k) => k.startsWith("da_") || k.startsWith("en_")), "C1: sin consentimiento no se registra nada más");

  // C2: riesgo mientras espera la confirmación del espejo.
  e = hasta("en_emociones");
  r = await turno(g, inst, e, { texto: "triste. y enojado" }, null, []);
  r = await turno(g, inst, r.estado, { texto: "ya no quiero vivir" }, null, []);
  ok(r.estado.rojo && r.estado.confirmacion === undefined && r.salida.some((s) => s.tipo === "eco-crisis"), "C2: riesgo en la confirmación abre la crisis limpia");
  ok(r.estado.esperando?.paso.id !== "en_termometro", "C2: no vuelve a la pregunta siguiente");

  // C3: tras la crisis no regresa al cuestionario ni muestra el 089.
  let pasos: string[] = [];
  let est = r.estado;
  let sal = r.salida;
  for (let i = 0; i < 12 && est.esperando && !est.terminada; i++) {
    pasos.push(est.esperando.paso.id);
    const op = est.esperando.opciones[est.esperando.opciones.length - 1]?.id;
    const t = await turno(g, inst, est, op ? { opcion: op } : { texto: "ok" }, null, []);
    est = t.estado; sal = sal.concat(t.salida);
  }
  ok(pasos.every((p) => p.startsWith("cr_") || p.startsWith("sa_") || p.startsWith("od_") || p === "_pausa"), `C3: tras la crisis sólo hay pasos de crisis (${pasos.join(",")})`);
  const dirs = sal.filter((s) => s.tipo === "directorio") as { excluir: string[] }[];
  ok(dirs.length > 0 && dirs.every((d) => d.excluir.includes("denuncia")), "C3: el directorio en rojo nunca incluye denuncia");

  // C4: riesgo escrito durante la pausa.
  e = hasta("v2_alerta");
  r = await turno(g, inst, e, { texto: "pausa" }, null, []);
  const enPausa = r.estado;
  r = await turno(g, inst, enPausa, { texto: "me quiero matar" }, null, []);
  ok(r.estado.rojo, "C4: la lista de alarma funciona en pausa");
  r = await turno(g, inst, enPausa, { texto: "ya no le veo sentido a seguir así" }, iaRiesgo, []);
  ok(r.estado.rojo, "C4: el modelo revisa el riesgo en pausa");
  r = await turno(g, inst, e, { texto: "salir" }, null, []);
  r = await turno(g, inst, r.estado, { texto: "me voy a quitar la vida" }, null, []);
  ok(r.estado.rojo, "C4: la lista de alarma funciona al salir");

  // C5: la confirmación conserva el texto escrito.
  e = hasta("en_emociones");
  r = await turno(g, inst, e, { texto: "triste" }, null, []);
  r = await turno(g, inst, r.estado, { texto: "sí, y me quiero morir" }, null, []);
  ok(r.estado.rojo, "C5: «sí, y me quiero morir» en la confirmación activa la crisis");

  // I2: pausa → terminar antes del consentimiento va a salida, no al cierre.
  c = arrancar(g, inst, crearEstado()).estado;
  r = await turno(g, inst, c, { texto: "pausa" }, null, []);
  r = await turno(g, inst, r.estado, { opcion: "terminar" }, null, []);
  ok(!textos(r.salida).some((t) => /preguntas para cerrar|último/i.test(t)) && !r.estado.cola.includes("cierre"), "I2: sin consentimiento, terminar no pasa por el cierre");
  ok(resumen(g, inst, r.estado).consintio === false, "I2: el resumen marca que no consintió");

  // I3/I4: lista de alarma.
  const A = (t: string) => nivelAlarma(t, g.alarma, g.alarmaRevisar);
  for (const t of ["me kiero morir", "ya no kiero vivir", "me voy a quitar la vida", "me amenazó", "me violaron", "abusó de mí", "si no le entro me va a ir mal", "me quieren reclutar"])
    ok(A(t) === "segura", `I3: «${t}» es alarma segura`);
  for (const t of ["me mato", "mi novio me obliga", "me pegan en la casa"]) ok(A(t) === "revisar", `I3: «${t}» se revisa con el modelo`);
  for (const t of ["quiero matarme de risa", "me muero de hambre", "quiero comer queso", "que onda", "me toca exponer mañana"]) ok(A(t) === null, `I4: «${t}» no es alarma`);

  // I5: validadores.
  ok(!validarPuente("Te noto muy cansado."), "I5: puente con adjetivo con género se rechaza");
  ok(!validarPuente("Lo mejor es que hables con tu mamá."), "I5: puente con consejo se rechaza");
  ok(!validarPuente("Marca al 800 123 4567."), "I5: puente con teléfono se rechaza");
  ok(!!validarPuente("Querer que te dejen en paz dice mucho del cansancio que cargas."), "I5: puente sobrio pasa");
  ok(!validarFrase("ansioso") && !!validarFrase("con ansiedad"), "I5: frase del espejo en lenguaje neutro");
  const ops = [{ label: "Nunca" }, { label: "A veces" }, { label: "Seguido" }];
  ok(!validarRepregunta("¿Quién te hizo eso?", ops) && !validarRepregunta("¿Y eso a qué se debe?", ops) && !validarRepregunta("¿Me cuentas más?", ops), "I5: repreguntas que piden detalles se rechazan");
  ok(!!validarRepregunta("¿Dirías que es más a veces o seguido?", ops), "I5: repregunta que ofrece las opciones pasa");

  // I6: filtro de identificadores.
  const F = (t: string) => filtrarIdentificadores(t).texto;
  ok(F("mi primo juan me pega") === "mi primo [nombre] me pega", "I6: nombre en minúscula tras parentesco");
  ok(F("Sofía no me habla").startsWith("[nombre]"), "I6: nombre al inicio de oración");
  ok(F("voy en la secu 23") === "voy en la [escuela]", "I6: escuela con número");
  ok(F("mi tío abusa de mí") === "mi tío abusa de mí", "I6: no tapa verbos tras parentesco");
  ok(F("que ya me dejen en paz") === "que ya me dejen en paz", "I6: no tapa palabras comunes");
  ok(F("marca al 55 1234 5678") === "marca al [número]", "I6: el teléfono no se vuelve [lugar]");

  // I7: escalas por reglas.
  e = hasta("v2_alerta");
  for (const [t, esperado] of [["no mucho la verdad", undefined], ["s", undefined], ["nadar", undefined], ["casi siempre", "casi_siempre"], ["a veces", "a_veces"], ["nunca jamás", "nunca"]] as const) {
    r = await turno(g, inst, e, { texto: t }, null, []);
    ok(r.estado.respuestas["v2_alerta"]?.valor === esperado, `I7: «${t}» → ${esperado ?? "no se entiende"}`);
  }
  e = hasta("en_termometro");
  r = await turno(g, inst, e, { texto: "del 1 al 10 como un 8" }, null, []);
  ok(r.estado.respuestas["en_termometro"]?.valor === "t4", "I7: usa el último número (8 → t4)");
  // Escalas con palabras: gana la frase más larga; "no sé" no cuenta como "Nada".
  for (const [paso, t, v] of [
    ["en_termometro", "muy fuerte", "t5"], ["en_termometro", "fuerte", "t4"], ["en_termometro", "pues muy poquito", "t1"],
    ["en_termometro", "poquito", "t2"], ["v6_normal", "bastante", "a4"], ["v6_normal", "un poco", "a2"],
    ["v6_normal", "para nada", "a1"], ["v6_normal", "no sé", undefined], ["v6_normal", "3", undefined],
    ["v2_alerta", "casi nunca la verdad", "casi_nunca"],
  ] as const) {
    e = hasta(paso);
    r = await turno(g, inst, e, { texto: t }, null, []);
    ok(r.estado.respuestas[paso]?.valor === v, `escala con palabras: «${t}» → ${v ?? "no se entiende"}`);
  }
  e = hasta("en_termometro");
  r = await turno(g, inst, e, { texto: "pues como mas o menos, a veces fuerte" }, null, []);
  ok(!r.estado.respuestas["en_termometro"] && textos(r.salida)[0] === "¿Cuál se parece más: «Más o menos» o «Fuerte»?", "dos opciones a la vez: pregunta cuál se parece más");
  r = await turno(g, inst, r.estado, { texto: "fuerte" }, null, []);
  ok(r.estado.respuestas["en_termometro"]?.valor === "t4", "…y luego registra la que elige");
  ok(r.estado.respuestas["en_termometro"]?.num === 3, "termómetro: «Fuerte» se guarda como 3");
  for (const [t, n] of [["muy poquito", 0], ["poquito", 1], ["más o menos", 2], ["como un 8", 3], ["muy fuerte", 4]] as const) {
    e = hasta("en_termometro");
    r = await turno(g, inst, e, { texto: t }, null, []);
    ok(r.estado.respuestas["en_termometro"]?.num === n, `termómetro: «${t}» se guarda como ${n}`);
  }
  ok(r.estado.esperando?.paso.id === "en_respirar", "termómetro en «Muy fuerte» (4): ofrece respirar");
  // Faltas de ortografía: se toma la opción a la que claramente se parece; si no se parece a ninguna, no adivina.
  for (const [paso, t, v] of [
    ["v2_alerta", "Aveces", "a_veces"], ["v2_alerta", "aveses", "a_veces"], ["v2_alerta", "Nunka", "nunca"],
    ["v2_alerta", "kasi nunca", "casi_nunca"], ["v2_alerta", "Kasi siempre", "casi_siempre"], ["v2_alerta", "seguio", "seguido"],
    ["v6_normal", "Masomenos", "a3"], ["v6_normal", "bastate", "a4"], ["en_termometro", "muy fuerrte", "t5"],
    ["en_termometro", "poqito", "t2"], ["v2_alerta", "nadar", undefined], ["v2_alerta", "s", undefined], ["v2_alerta", "perro", undefined],
  ] as const) {
    e = hasta(paso);
    r = await turno(g, inst, e, { texto: t }, null, []);
    ok(r.estado.respuestas[paso]?.valor === v, `faltas de ortografía: «${t}» → ${v ?? "no se entiende"}`);
  }
  // Filtro de privacidad: «aveces» no es una dirección; «colonia Centro» sí.
  ok(filtrarIdentificadores("Aveces").texto === "Aveces" && filtrarIdentificadores("en mi colonia hay balazos").texto === "en mi colonia hay balazos", "filtro: «aveces» y «mi colonia hay…» no se tapan");
  ok(filtrarIdentificadores("vivo en la colonia Centro").texto.includes("[lugar]") && filtrarIdentificadores("av. Juárez 120").texto.includes("[lugar]"), "filtro: «colonia Centro» y «av. Juárez» sí se tapan");
  // Airtable: cada pregunta con opciones tiene su columna, sin nombres repetidos.
  {
    const conItem = Object.values(g.bloques).flatMap((b) => b.pasos).filter((p) => p.item && (p.tipo === "opcion" || p.tipo === "multiple"));
    const cols = new Set(TODAS_LAS_COLUMNAS.map((c) => c.paso));
    ok(conItem.every((p) => cols.has(p.id)), "Airtable: cada pregunta con opciones tiene su columna");
    ok(new Set(TODAS_LAS_COLUMNAS.map((c) => c.nombre)).size === TODAS_LAS_COLUMNAS.length, "Airtable: sin nombres de columna repetidos");
  }
  // Rúbrica: sólo las escalas llevan número, siempre 0–4 y consecutivo.
  for (const [k, ops] of Object.entries(g.escalas)) ok(JSON.stringify(ops.map((o) => o.valor)) === "[0,1,2,3,4]", `rúbrica: escala ${k} va de 0 a 4`);
  ok(Object.values(g.bloques).flatMap((b) => b.pasos).every((p) => !p.opciones?.some((o) => o.valor !== undefined)), "rúbrica: las preguntas que no son escala no llevan número");
  ok(!JSON.stringify(g).match(/[Dd]el 1 al|qué tan de acuerdo/), "el guion ya no usa escalas de números ni de acuerdo");

  // Consentimiento por sinónimos.
  for (const [t, v] of [["nel", "no"], ["va", "si"], ["simón", "si"], ["ahorita no", "no"]] as const) {
    c = arrancar(g, inst, crearEstado()).estado;
    r = await turno(g, inst, c, { texto: t }, null, []);
    ok(r.estado.respuestas["bi_consentimiento"]?.valor === v, `consentimiento «${t}» → ${v}`);
  }

  // Redacción: la redirección siempre repite la pregunta completa, en su propia burbuja.
  const iaFuera: ServicioIA = { interpretar: async () => ({ tipo: "fuera_de_tema", riesgo: false, opciones: [], repregunta: null, otro: null }), redactar: async () => null };
  e = hasta("da_edad");
  r = await turno(g, inst, e, { texto: "51" }, iaFuera, []);
  ok(r.estado.respuestas["da_edad"]?.valor === "adulto" && textos(r.salida)[0].startsWith("Eco está pensado para jóvenes de 12 a 18") && r.estado.esperando?.paso.id === "da_genero", "«51»: se registra como adulto, se avisa y sigue");
  ok(resumen(g, inst, r.estado).edad === "adulto", "el resumen cuenta la sesión con edad «adulto»");
  r = await turno(g, inst, e, { texto: "tengo 9" }, iaFuera, []);
  ok(r.estado.respuestas["da_edad"]?.valor === "menor_12", "«tengo 9» → menor de 12");
  r = await turno(g, inst, e, { texto: "y tú qué" }, iaFuera, []);
  ok(textos(r.salida).length === 2 && textos(r.salida)[0] === g.desvios.fueraDeTema![0] && textos(r.salida)[1] === "¿Cuántos años tienes?", "fuera de tema: «Aquí platicamos…» y la pregunta");
  const iaPriv: ServicioIA = { interpretar: async () => ({ tipo: "privacidad", riesgo: false, opciones: [], repregunta: null, otro: null }), redactar: async () => null };
  r = await turno(g, inst, e, { texto: "¿quién lee esto?" }, iaPriv, []);
  ok(textos(r.salida).at(-1) === "¿Cuántos años tienes?", "tras explicar la privacidad, repite la pregunta");
  e = hasta("v5_lealtad");
  r = await turno(g, inst, e, { texto: "asdf" }, null, []);
  ok(textos(r.salida)[1] === "¿Qué tan seguido sientes que no puedes contar algo para proteger a alguien?", "pasos que dependen de la oración anterior se repiten completos");
  c = arrancar(g, inst, crearEstado()).estado;
  r = await turno(g, inst, c, { texto: "jajaja" }, null, []);
  ok(textos(r.salida)[1] === "¿Quieres seguir?", "en el consentimiento también se repite la pregunta");

  // Mayúsculas del teclado del celular: la primera palabra nunca se toma como nombre.
  for (const [t, esperado] of [["Tranquilo", "Tranquilo"], ["Casi siempre", "Casi siempre"], ["Desde hace un mes", "Desde hace un mes"], ["Nunca", "Nunca"], ["Me pega Brayan", "Me pega [nombre]"], ["Sofía no me habla", "[nombre] no me habla"]] as const)
    ok(filtrarIdentificadores(t).texto === esperado, `filtro: «${t}» → «${esperado}»`);
  // Si el modelo no entiende pero las reglas sí, ganan las reglas.
  const iaSinSentido: ServicioIA = { interpretar: async () => ({ tipo: "sin_sentido", riesgo: false, opciones: [], repregunta: null, otro: null }), redactar: async () => null };
  const iaSinOpcion: ServicioIA = { interpretar: async () => ({ tipo: "responde", riesgo: false, opciones: [], repregunta: null, otro: null }), redactar: async () => null };
  e = hasta("en_emociones");
  r = await turno(g, inst, e, { texto: "Tranquilo" }, iaSinSentido, []);
  ok(textos(r.salida)[0] === "Entiendo que hoy te sientes en calma. ¿Es así?", "«Tranquilo» con modelo que duda → espejo «en calma»");
  r = await turno(g, inst, e, { texto: "Tranquilo" }, iaSinOpcion, []);
  ok(textos(r.salida)[0] === "Entiendo que hoy te sientes en calma. ¿Es así?", "«Tranquilo» con modelo sin opción → espejo «en calma»");
  e = hasta("v2_alerta");
  r = await turno(g, inst, e, { texto: "Casi siempre" }, iaSinSentido, []);
  ok(r.estado.respuestas["v2_alerta"]?.valor === "casi_siempre", "«Casi siempre» con modelo que duda → casi siempre");
  const iaGroseria: ServicioIA = { interpretar: async () => ({ tipo: "groseria", riesgo: false, opciones: [], repregunta: null, otro: null }), redactar: async () => null };
  r = await turno(g, inst, e, { texto: "nunca te voy a contestar pendejo" }, iaGroseria, []);
  ok(!r.estado.respuestas["v2_alerta"] && textos(r.salida)[0] === g.desvios.groseria[0], "grosería: manda el modelo aunque diga «nunca»");

  console.log(fallas ? `\n${fallas} fallas` : "\nTodo bien.");
  process.exit(fallas ? 1 : 0);
})();
