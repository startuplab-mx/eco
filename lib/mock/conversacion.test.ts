// Batería de casos del chat. Correr con: npm test
// Cada caso: lo que escribe el estudiante (primer mensaje y respuestas) y la
// secuencia de repreguntas que esperamos. Sirve también como set de
// evaluación para el prompt real de lib/ia/repreguntar.ts.

import { test } from "node:test";
import assert from "node:assert/strict";
import { clasificar, conversar, detectar, esFisico, limpiar, MAX_PREGUNTAS } from "./conversacion.ts";
import type { Campo, Clase } from "./conversacion.ts";
import { CASOS as REVISION_A } from "./revision/casos.mjs";
import { CASOS as REVISION_B } from "./revision/casos2.mjs";
import { CASOS as REVISION_C } from "./revision/casos3.mjs";

type Caso = {
  turnos: string[];
  preguntas: Campo[];
  clase?: Clase;
  cierre?: "parecidos" | "sin_parecidos" | "no_suma";
};

const CASOS: Record<string, Caso> = {
  // En línea: nunca se pregunta dónde ni cuándo.
  "venta en línea sin app: pregunta la app y cierra": {
    turnos: ["alguien vendía droga en línea", "TikTok"],
    preguntas: ["medio"],
  },
  "venta en línea, no sabe la app": { turnos: ["alguien vende droga en línea", "no sé"], preguntas: ["medio"] },
  "dijo afuera pero elige En línea: sigue con la app, no con la hora": {
    turnos: ["un wey afuera nos ofreció lana fácil", "En línea", "Instagram"],
    preguntas: ["lugar", "medio"],
  },
  "no sabe dónde, luego elige En línea": {
    turnos: ["me ofrecieron lana fácil", "En línea", "WhatsApp"],
    preguntas: ["lugar", "medio"],
  },
  "oferta vaga por TikTok: pregunta qué ofrecían": {
    turnos: ["me ofrecieron un jale por tiktok", "Dinero"],
    preguntas: ["oferta"],
  },
  "cuenta de TikTok que ofrece chamba": {
    turnos: ["en tiktok hay una cuenta que ofrece chamba a los de la escuela", "Avisar o vigilar"],
    preguntas: ["oferta"],
  },
  "en línea con todo dicho: no pregunta": {
    turnos: ["me escribieron por insta para ofrecerme 4 mil a la semana por avisar"],
    preguntas: [],
  },
  "juego en línea con regalo concreto": {
    turnos: ["en free fire un vato nos ofrece diamantes si le hacemos un favor"],
    preguntas: [],
  },
  "roblox, pide fotos": { turnos: ["en roblox un señor les pide a los niños que le manden fotos"], preguntas: [] },
  "página de Instagram con peleas": {
    turnos: ["en instagram hay una página que sube videos de los de la escuela peleando"],
    preguntas: [],
  },
  "reclutan por Discord": { turnos: ["mi primo me dijo que en su escuela reclutan por discord"], preguntas: [] },
  "mensajes a la hermana, sin app": {
    turnos: ["le mandan mensajes a mi hermana ofreciéndole trabajo de modelo", "Instagram", "No dijeron qué"],
    preguntas: ["medio", "oferta"],
  },
  "me siguen en TikTok no es riesgo": {
    turnos: ["me siguen en tiktok unos que suben videos con armas y ofrecen chamba", "Dinero"],
    preguntas: ["oferta"],
    clase: "serio",
  },

  // Presencial: dónde (si falta) y cuándo (si falta).
  "ejemplo de la especificación: 'afuera' no basta para la celda": {
    turnos: ["un wey afuera nos dijo que si queríamos ganar una lana fácil", "En la parada", "En la tarde"],
    preguntas: ["lugar", "cuando"],
  },
  "sin lugar ni hora": { turnos: ["me pegaron", "en el patio", "hoy"], preguntas: ["lugar", "cuando"] },
  "lugar y frecuencia dichos: no pregunta": {
    turnos: ["vi que en la entrada venden vapes y mota todos los días"],
    preguntas: [],
  },
  "lugar sin hora": { turnos: ["en la entrada venden droga", "Pasa seguido"], preguntas: ["cuando"] },
  "hora sin lugar": {
    turnos: ["hay una bronca a la salida entre los de tercero y los de quinto", "En la entrada"],
    preguntas: ["lugar"],
  },
  "saludo al inicio no lo vuelve broma": {
    turnos: ["hola, un señor en la parada nos ofreció trabajo", "ayer", "No dijeron qué"],
    preguntas: ["cuando", "oferta"],
    clase: "serio",
  },
  "combi, siempre, oferta vaga": {
    turnos: ["en la combi de regreso siempre se sube un señor que nos ofrece jale", "Llevar o guardar algo"],
    preguntas: ["oferta"],
  },
  "grupo de whats de la colonia": {
    turnos: ["unos del grupo de whats de la colonia andan buscando chavos para un jale", "Fin de semana", "Dinero"],
    preguntas: ["cuando", "oferta"],
  },
  "los de la moto diario en la entrada": { turnos: ["los de la moto vienen diario a la entrada"], preguntas: [] },
  "acoso en el metro": { turnos: ["me acosa un wey en el metro", "En la mañana"], preguntas: ["cuando"] },
  "venden en el baño": { turnos: ["hay un vato que vende en el baño", "Pasa seguido"], preguntas: ["cuando"] },
  "colonia en las noches con chamba": {
    turnos: ["unos de la colonia nos ofrecen chamba en las noches", "Vender algo"],
    preguntas: ["oferta"],
  },
  "tianguis los sábados con tarea concreta": {
    turnos: ["en el tianguis los sábados hay unos que ofrecen trabajo de cuidar"],
    preguntas: [],
  },
  "quieren meterlos a vender en la escuela": {
    turnos: ["nos quieren meter a vender en la escuela", "En la tarde"],
    preguntas: ["cuando"],
  },
  "está ahí ahorita": {
    turnos: ["estoy en la parada y hay un wey ofreciendo jale", "No dijeron qué"],
    preguntas: ["oferta"],
  },
  "responde solo 'afuera'": {
    turnos: ["me ofrecieron lana fácil", "afuera nomás", "en la tarde"],
    preguntas: ["lugar", "cuando"],
  },
  "no quiere seguir contestando": {
    turnos: ["me ofrecieron lana fácil", "prefiero no decir"],
    preguntas: ["lugar"],
  },
  "compa que dejó de venir": { turnos: ["mi compa dejó de venir y dicen que anda con los de la moto", "no sé"], preguntas: ["lugar"] },
  "arma en la mochila": {
    turnos: ["un compa trae pistola en la mochila", "Adentro del plantel", "hoy"],
    preguntas: ["lugar", "cuando"],
  },

  // Maestros.
  "maestro en el laboratorio": {
    turnos: ["el profe de química le toca la pierna a una compa en el laboratorio", "En la mañana"],
    preguntas: ["cuando"],
    cierre: "sin_parecidos",
  },
  "maestro por mensajes, sin app": {
    turnos: ["un profe le manda mensajes en la noche a una compa y le regala cosas, soy de su mismo grupo", "WhatsApp"],
    preguntas: ["medio"],
    cierre: "sin_parecidos",
  },
  "maestro por whats con todo dicho": {
    turnos: ["el profe le pide fotos a una compa por whats"],
    preguntas: [],
    cierre: "sin_parecidos",
  },
  "maestro que trata mal": {
    turnos: ["un maestro nos insulta a todos", "Pasa seguido"],
    preguntas: ["cuando"],
    cierre: "sin_parecidos",
  },

  // Vías que afectan más a chavas: relación, regalos, fotos, "trabajo de modelo", trata.
  "señor mayor que la recoge y le pide fotos": {
    turnos: ["a mi amiga un señor mayor la recoge en la entrada, le regala cosas y le pide fotos", "Pasa seguido"],
    preguntas: ["cuando"],
  },
  "trabajo de modelo por insta": {
    turnos: ["a las chavas de primero les ofrecen trabajo de modelo por insta", "Mandar fotos"],
    preguntas: ["oferta"],
  },
  "novio de la maña": {
    turnos: ["mi amiga anda con uno de la maña y le regala celulares para que no diga nada", "En la colonia", "Pasa seguido"],
    preguntas: ["lugar", "cuando"],
  },
  "la invitan a fiestas": {
    turnos: ["unos weyes mayores invitan a las de primero a fiestas en la colonia", "Fin de semana"],
    preguntas: ["cuando"],
  },
  "trata: trabajar a otro estado": {
    turnos: ["a mi prima le ofrecieron llevarla a trabajar a otro estado y ya no contesta"],
    preguntas: [],
    clase: "rojo",
  },
  "trata: se la llevaron": { turnos: ["se llevaron a una chava de quinto en un carro"], preguntas: [], clase: "rojo" },
  "amenaza con subir fotos": { turnos: ["un wey amenaza con subir los packs de mi amiga"], preguntas: [], clase: "rojo" },
  "la obligan a prostituirse": { turnos: ["a mi vecina la obligan a prostituirse"], preguntas: [], clase: "rojo" },
  "me venden vapes no es trata": {
    turnos: ["en la entrada me venden vapes todos los dias"],
    preguntas: [],
    clase: "serio",
  },
  "estoy sola y me ven raro": {
    turnos: ["estoy sola en la parada y un señor no me deja de ver"],
    preguntas: [],
    clase: "serio",
  },
  "cansada de vivir": { turnos: ["ya estoy cansada de vivir"], preguntas: [], clase: "autolesion" },
  "maestra que acosa": {
    turnos: ["la maestra de ingles le toca la pierna a un compa", "Pasa seguido"],
    preguntas: ["cuando"],
    cierre: "sin_parecidos",
  },

  // Riesgo inmediato: no pregunta nada.
  "cita con amenaza": {
    turnos: ["me dijeron que el viernes a la salida me esperan en la parada para llevar algo y que si no voy ya saben dónde vivo"],
    preguntas: [],
    clase: "rojo",
  },
  "me amenazaron": { turnos: ["me amenazaron"], preguntas: [], clase: "rojo" },
  "ayuda": { turnos: ["ayuda"], preguntas: [], clase: "rojo" },
  "amigo amenazado": { turnos: ["a mi amigo lo amenazaron por no querer vender"], preguntas: [], clase: "rojo" },
  "se llevan a chavos": { turnos: ["en la noche pasan unos en camioneta y se llevan a chavos"], preguntas: [], clase: "rojo" },
  "el riesgo aparece en la respuesta": {
    turnos: ["un wey afuera nos ofreció lana fácil", "en la parada, y dijo que si no voy mañana me va a ir mal"],
    preguntas: ["lugar"],
    clase: "rojo",
  },

  // Pruebas y bromas: no se castigan ni se preguntan.
  "hola prueba": { turnos: ["hola prueba jaja"], preguntas: [], clase: "broma", cierre: "no_suma" },
  "xd": { turnos: ["xd"], preguntas: [], clase: "broma" },
  "es real": { turnos: ["¿esto es real?"], preguntas: [], clase: "broma" },
  "q onda": { turnos: ["q onda"], preguntas: [], clase: "broma" },
  "nel": { turnos: ["nel"], preguntas: [], clase: "broma" },
  "risa y contenido es serio": {
    turnos: ["jajaja un wey me dijo que si quería jalar con ellos", "En la colonia", "En la noche"],
    preguntas: ["lugar", "cuando"],
    clase: "serio",
  },
  "mensaje corto pero serio": { turnos: ["están reclutando", "no sé"], preguntas: ["lugar"], clase: "serio" },
};

for (const [nombre, c] of Object.entries(CASOS)) {
  test(nombre, () => {
    const r = conversar(c.turnos);
    assert.deepEqual(r.hechas, c.preguntas, "secuencia de repreguntas");
    if (c.clase) assert.equal(r.clase, c.clase, "clase");
    if (c.cierre) assert.equal(r.cierre?.tipo, c.cierre, "cierre");
    assert.ok(r.cierre, "la conversación cierra");
  });
}

// Reglas que valen para todos los casos, además de la secuencia esperada.
test("invariantes en todos los casos", () => {
  for (const [nombre, c] of Object.entries(CASOS)) {
    const r = conversar(c.turnos);
    assert.ok(r.hechas.length <= MAX_PREGUNTAS, `${nombre}: más de ${MAX_PREGUNTAS} preguntas`);
    assert.equal(new Set(r.hechas).size, r.hechas.length, `${nombre}: repitió una pregunta`);
    r.fichasAlPreguntar.forEach((f, i) => {
      const campo = r.hechas[i];
      if (campo === "cuando") assert.ok(esFisico(f), `${nombre}: preguntó cuándo de algo que no es físico`);
      if (campo === "lugar") assert.ok(!f.enLinea && !f.lugar, `${nombre}: preguntó dónde sabiendo el lugar o que fue en línea`);
      if (campo === "medio") assert.ok(!f.medio, `${nombre}: preguntó la app ya sabiéndola`);
      if (campo === "cuando") assert.ok(!f.cuando, `${nombre}: preguntó cuándo ya sabiéndolo`);
    });
    if (clasificar(c.turnos[0]) !== "serio") {
      assert.equal(conversar([c.turnos[0]]).hechas.length, 0, `${nombre}: preguntó a un rojo o a una broma`);
    }
  }
});

test("detecta en línea sin confundir 'historia' la materia", () => {
  assert.equal(detectar("en la clase de historia el profe nos grita").enLinea, false);
  assert.equal(detectar("subió una historia en insta").enLinea, true);
});

// --- Limpieza -------------------------------------------------------------------

const LIMPIEZA: [string, string][] = [
  ["un profe le manda mensajes a una compa, soy de su mismo grupo", "un profe le manda mensajes a una compa"],
  ["Me llamo Juan y un wey me ofreció lana", "un wey me ofreció lana"],
  ["soy la de 3B, en la parada venden", "en la parada venden"],
  ["voy en tercer semestre y me ofrecieron un jale", "y me ofrecieron un jale"],
  ["me dicen la güera y en la parada me quieren pegar", "en la parada me quieren pegar"],
  ["soy la nueva del 5C y un señor me pide fotos", "un señor me pide fotos"],
];
const SIN_CAMBIO = [
  "hola prueba jaja",
  "hola, un señor en la parada nos ofreció trabajo",
  "estoy en la parada y hay un wey ofreciendo jale",
  "un wey afuera nos dijo que si queríamos ganar una lana fácil",
  "soy muy chismoso pero vi que venden en el baño",
];

test("limpieza quita lo que identifica a quien escribe", () => {
  for (const [entrada, esperado] of LIMPIEZA) assert.equal(limpiar(entrada).limpio, esperado.replace(/^y /, ""));
});

test("limpieza no toca lo que describe el hecho", () => {
  for (const t of SIN_CAMBIO) assert.equal(limpiar(t).cambio, false, t);
});

// --- Revisión adversarial -----------------------------------------------------
// Conversaciones escritas como las mandaría un estudiante (jerga, faltas,
// mensajes largos), con lo que se espera en cada una. Ver docs/revision-chat.md.


type CasoRevision = {
  id: string;
  t: string[];
  clase?: Clase | Clase[];
  p?: Campo[] | null;
  cierre?: string;
  limpio?: string;
  sinCambio?: boolean;
  lugar?: string;
  contiene?: string;
};

for (const c of [...REVISION_A, ...REVISION_B, ...REVISION_C] as CasoRevision[]) {
  test(`revisión ${c.id}: ${c.t[0].slice(0, 60)}`, () => {
    const r = conversar(c.t);
    if (c.clase) {
      const aceptadas = Array.isArray(c.clase) ? c.clase : [c.clase];
      assert.ok(aceptadas.includes(r.clase), `clase ${r.clase}, se esperaba ${aceptadas.join(" o ")}`);
    }
    if (c.p) {
      const secuencia = [...r.hechas, ...(r.pregunta ? [r.pregunta.campo] : [])];
      assert.deepEqual(secuencia, c.p, "secuencia de repreguntas (incluye la que queda abierta)");
    }
    if (c.cierre) assert.equal(r.cierre?.tipo, c.cierre, "cierre");
    const l = limpiar(c.t[0]);
    if (c.limpio !== undefined) assert.equal(l.limpio, c.limpio, "limpieza");
    if (c.sinCambio) assert.equal(l.cambio, false, `la limpieza no debía cambiar nada: "${l.limpio}"`);
    if (c.contiene) assert.ok(l.limpio.includes(c.contiene), `la limpieza se llevó el hecho: "${l.limpio}"`);
    if (c.lugar) assert.equal(detectar(c.t[0]).lugar, c.lugar, "celda");
  });
}
