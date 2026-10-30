// Motor de rieles de Eco.
// El guion decide qué se pregunta y en qué orden; el motor lo recorre,
// abre módulos según la emoción y el ámbito, y aplica el protocolo de riesgo.
// Es puro: recibe un estado y devuelve uno nuevo más lo que hay que mostrar.

import type {
  Bloque, Condicion, EjercicioId, Espera, Estado, Guion, Instancia, Opcion, Paso, Respuesta, Salida,
} from "./tipos";
import { esGroseriaDirigida, filtrarIdentificadores, nivelAlarma, normalizar, pareceSinSentido } from "./seguridad";
import { calcularNivel } from "./indices";

export interface Entrada {
  /** id de opción elegida (botón). */
  opcion?: string;
  /** ids elegidos en selección múltiple. */
  opciones?: string[];
  /** texto escrito por el joven. */
  texto?: string;
  /** El clasificador de riesgo detectó una señal: activa el protocolo rojo. */
  alarma?: boolean;
  /** El modelo revisó el texto y descartó el riesgo: las frases ambiguas no activan la crisis. */
  alarmaDescartada?: boolean;
  /** El modelo ya interpretó el texto: no aplicar las reglas de palabras sobre él. */
  sinReglas?: boolean;
  /** El joven ya confirmó el espejo ("¿Es así?" → Sí). */
  confirmado?: boolean;
  /** Frase breve (del modelo) para una respuesta que no está en las opciones. */
  otro?: string;
  /** El modelo no reconoció una respuesta válida: no registrar lo escrito como "otro" ni adivinar por palabras sueltas. */
  sinOtro?: boolean;
  /** Respuesta desviada (la clasifica el modelo; sin modelo, reglas básicas). */
  desvio?: "sin_sentido" | "groseria" | "fuera_de_tema" | "no_quiere" | "se_quiere_ir" | "privacidad" | "pide_orientacion" | "insiste";
}

export interface Resultado {
  estado: Estado;
  salida: Salida[];
  /** true si la entrada quedó registrada como respuesta del paso que se esperaba. */
  respondido?: boolean;
  /** true si la entrada se trató como desvío (no se escribe puente). */
  desvio?: boolean;
  /** true si Eco pidió quitar nombres o lugares (no es una respuesta poco clara). */
  aviso?: boolean;
}

const PAUSA: Paso = { id: "_pausa", tipo: "opcion" };
const OPC_PAUSA: Opcion[] = [
  { id: "seguir", label: "Seguir" },
  { id: "terminar", label: "Terminar" },
];
const OPC_OTRODIA: Opcion[] = [
  { id: "seguir", label: "Seguir" },
  { id: "otrodia", label: "Otro día" },
];
const OPC_SALIR: Opcion[] = [
  { id: "si", label: "Sí, terminar" },
  { id: "no", label: "No, sigamos" },
];

const OPC_CONFIRMAR: Opcion[] = [
  { id: "si", label: "Sí" },
  { id: "no", label: "No exactamente" },
];
/** Bloques donde no se hace espejo corto (datos personales, consentimiento, transiciones). */
const SIN_ESPEJO = ["bienvenida", "datos", "transicion"];

// ---------- utilidades ----------

/** "a", "a y b", "a, b y c". */
export function listaNatural(xs: string[]): string {
  if (xs.length <= 1) return xs[0] ?? "";
  return `${xs.slice(0, -1).join(", ")} y ${xs[xs.length - 1]}`;
}

function minuscula(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

/** Espejo corto de lo que se entendió de una respuesta escrita: "casi nunca", "3 de 5", "un 7–8". */
function espejoCorto(p: Paso, ids: string[], opciones: Opcion[], otro: string | null): string {
  const elegidas = opciones.filter((o) => ids.includes(o.id));
  if (p.escala === "A5") return elegidas.map((o) => `${opciones.indexOf(o) + 1} de 5`).join(", ");
  if (p.escala === "T10") return `un ${elegidas[0].label.replace(/ Muy (leve|fuerte)$/, "")}`;
  const idO = idOtro(opciones);
  return listaNatural(ids.map((id) => (id === idO && otro ? otro : minuscula(opciones.find((o) => o.id === id)?.label ?? id))));
}

/** id con el que se registra "otro": la opción visible "Otro/Otra" si existe; si no, "otro". */
function idOtro(opciones: Opcion[]): string {
  return opciones.find((o) => o.id === "otro" || o.id === "otra")?.id ?? "otro";
}

/** Cómo se repite una respuesta "otro": la frase del modelo o, sin modelo, sus palabras entre comillas. */
function fraseOtro(entrada: { otro?: string; texto?: string }): string {
  if (entrada.otro) return entrada.otro;
  const t = filtrarIdentificadores(entrada.texto ?? "").texto.trim().replace(/[.!]+$/, "");
  return `«${t.length > 40 ? `${t.slice(0, 40)}…` : t}»`;
}

/** Lectura simple de sí/no escrito, para la confirmación del espejo. */
function siNo(texto: string): "si" | "no" | null {
  const t = normalizar(texto).replace(/[^a-z ]/g, "").trim();
  if (/\b(no|nel|nop|tampoco|mas bien)\b/.test(t)) return "no";
  if (/\b(si|simon|sip|aja|exacto|eso|asi es|correcto|ajam|ok|va|claro)\b/.test(t)) return "si";
  return null;
}

function codigoAleatorio(rand: () => number): string {
  let s = "";
  const abc = "abcdefghijkmnpqrstuvwxyz23456789";
  for (let i = 0; i < 10; i++) s += abc[Math.floor(rand() * abc.length)];
  return s;
}

/** Semana ISO, p. ej. "2026-W44". Sólo semana: nunca fecha exacta. */
export function semanaISO(fecha: Date): string {
  const d = new Date(Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()));
  const dia = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dia);
  const inicio = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const semana = Math.ceil(((d.getTime() - inicio.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(semana).padStart(2, "0")}`;
}

export function emocionesElegidas(estado: Estado): string[] {
  const v = estado.respuestas["en_emociones"]?.valor;
  return Array.isArray(v) ? v : [];
}

export function emocionPrincipal(g: Guion, estado: Estado): string {
  const elegidas = emocionesElegidas(estado);
  return g.ruta.prioridad.find((e) => elegidas.includes(e)) ?? "nose";
}

function opcionesDe(g: Guion, p: Paso): Opcion[] {
  if (p.tipo === "ejercicio") return [{ id: "listo", label: "Listo" }];
  if (p.tipo === "abierta" || p.tipo === "numero") return p.rapidas ?? [];
  if (p.escala) return [...g.escalas[p.escala], ...(p.opcionesExtra ?? [])];
  return p.opciones ?? [];
}

function resolverTexto(g: Guion, inst: Instancia, estado: Estado, texto: string): string {
  const elegidas = emocionesElegidas(estado);
  const una = elegidas.length === 1 && elegidas[0] !== "nose";
  return texto
    .replace("{emocion}", una ? "esa emoción" : "lo que sientes")
    .replace("{validacion}", g.validaciones[emocionPrincipal(g, estado)] ?? "")
    .replace("{preguntaCierre}", g.preguntasCierre[estado.preguntaCierre] ?? g.preguntasCierre[0])
    .replace("{orientador}", inst.orientador.nombre)
    .replace("{lugar}", inst.orientador.lugar)
    .replace("{horario}", inst.orientador.horario);
}

function ejercicioPara(g: Guion, estado: Estado, e: EjercicioId | "@emocion"): EjercicioId {
  if (e !== "@emocion") return e;
  const p = emocionPrincipal(g, estado);
  if (p === "miedo" || p === "preocupado") return "respiracion";
  if (p === "enojado") return "punos";
  if (p === "triste" || p === "vacio") return "mano";
  const intenso = (estado.respuestas["en_termometro"]?.num ?? 0) >= 9;
  if (p === "confundido" || p === "nose" || intenso) return "anclaje";
  return "respiracion";
}

// ---------- condiciones ----------

type Corta = { gte?: number; lte?: number; en?: string[]; incluye?: string[] };

function cumpleSobre(r: Respuesta | undefined, c: Corta & { respondido?: boolean }): boolean {
  if (c.respondido !== undefined) return c.respondido === !!r;
  if (!r) return false;
  if (c.gte !== undefined && !(r.num !== undefined && r.num >= c.gte)) return false;
  if (c.lte !== undefined && !(r.num !== undefined && r.num <= c.lte)) return false;
  if (c.en && !(typeof r.valor === "string" && c.en.includes(r.valor))) return false;
  if (c.incluye && !(Array.isArray(r.valor) && r.valor.some((v) => c.incluye!.includes(v)))) return false;
  return true;
}

export function evaluar(g: Guion, estado: Estado, c: Condicion): boolean {
  if ("todos" in c) return c.todos.every((x) => evaluar(g, estado, x));
  if ("alguno" in c) return c.alguno.some((x) => evaluar(g, estado, x));
  if ("no" in c) return !evaluar(g, estado, c.no);
  if ("cuenta" in c) {
    const n = c.cuenta.pasos.filter((p) => (estado.respuestas[p]?.num ?? -1) >= c.cuenta.gte).length;
    return n >= c.min;
  }
  if ("emocionPrincipal" in c) return c.emocionPrincipal.includes(emocionPrincipal(g, estado));
  if ("amarillo" in c) return calcularNivel(g, estado).nivel === "amarillo";
  if ("unaEmocion" in c) return (emocionesElegidas(estado).length === 1) === c.unaEmocion;
  return cumpleSobre(estado.respuestas[c.paso], c);
}

// ---------- ruta ----------

/** Orden de bloques tras la entrada emocional. */
export function calcularRuta(g: Guion, estado: Estado): string[] {
  const elegidas = g.ruta.prioridad.filter((e) => emocionesElegidas(estado).includes(e));
  if (elegidas.length === 0) elegidas.push("nose");
  const ambito = estado.respuestas["en_ambito"]?.valor as string | undefined;

  const candidatos: string[] = [];
  const agrega = (x: string) => { if (!candidatos.includes(x)) candidatos.push(x); };
  (g.ruta.porEmocion[elegidas[0]] ?? []).forEach(agrega);
  if (ambito) (g.ruta.porAmbito[ambito] ?? []).forEach(agrega);
  elegidas.slice(1).forEach((e) => (g.ruta.porEmocion[e] ?? []).forEach(agrega));

  const orden: string[] = [];
  const modulos: string[] = [];
  for (const x of candidatos) {
    if (g.bloques[x].clase === "modulo") {
      if (modulos.length < g.ruta.maxModulos) { modulos.push(x); orden.push(x); }
    } else orden.push(x);
  }
  for (const v of g.ruta.ordenNucleo) if (!orden.includes(v)) orden.push(v);
  for (const m of g.ruta.relleno) {
    if (modulos.length >= g.ruta.minModulos) break;
    if (!modulos.includes(m)) { modulos.push(m); orden.push(m); }
  }

  const final: string[] = [];
  let primero = true;
  for (const x of orden) {
    if (g.bloques[x].clase === "modulo") {
      if (!primero) final.push("transicion");
      primero = false;
    }
    final.push(x);
  }
  estado.modulosEnRuta = modulos;
  return [...final, "libre", "cierre"];
}

// ---------- ciclo ----------

export function crearEstado(rand: () => number = Math.random, fecha: Date = new Date(), nPreguntasCierre = 3): Estado {
  return {
    codigo: codigoAleatorio(rand),
    semana: semanaISO(fecha),
    cola: ["bienvenida", "datos", "entrada", "@ruta"],
    bloque: null,
    indice: 0,
    respuestas: {},
    textos: {},
    esperando: null,
    pausa: null,
    gruposMostrados: [],
    modulosHechos: [],
    modulosEnRuta: [],
    bloquesHechos: [],
    rojo: false,
    avisoIdentificador: false,
    recursos: [],
    completa: false,
    terminada: false,
    preguntaCierre: Math.floor(rand() * nPreguntasCierre),
    desvios: 0,
    desviosTotal: 0,
    desviosPaso: {},
    omitidas: [],
  };
}

function emitirTextos(g: Guion, inst: Instancia, estado: Estado, p: Paso, salida: Salida[]) {
  if (!p.texto) return;
  const textos = Array.isArray(p.texto) ? p.texto : [p.texto];
  for (const t of textos) {
    const texto = resolverTexto(g, inst, estado, t);
    if (!texto) continue;
    salida.push(p.estilo === "crisis" ? { tipo: "eco-crisis", texto } : { tipo: "eco", texto, reescribible: p.reescribible });
  }
}

function esperar(g: Guion, p: Paso): Espera {
  return {
    paso: p,
    opciones: opcionesDe(g, p),
    multiple: p.tipo === "multiple",
    textoLibre: p.tipo !== "ejercicio",
  };
}

function avanzar(g: Guion, inst: Instancia, estado: Estado, salida: Salida[]): void {
  for (let guarda = 0; guarda < 500; guarda++) {
    if (!estado.bloque) {
      const id = estado.cola.shift();
      if (!id) {
        estado.terminada = true;
        estado.esperando = null;
        estado.completa = estado.bloquesHechos.includes("cierre");
        return;
      }
      if (estado.rojo && !TRAS_CRISIS.includes(id)) continue;
      if (id === "@ruta") { estado.cola.unshift(...calcularRuta(g, estado)); continue; }
      const b: Bloque = g.bloques[id];
      if (b.clase === "modulo") estado.modulosHechos.push(id);
      if (b.grupo && !estado.gruposMostrados.includes(b.grupo)) {
        estado.gruposMostrados.push(b.grupo);
        const grupo = g.grupos[b.grupo];
        const contenidoPrevio = estado.bloquesHechos.some((x) => g.bloques[x].clase !== "fijo");
        if (grupo && (!grupo.noAlInicio || contenidoPrevio)) salida.push({ tipo: "eco", texto: grupo.texto });
      }
      estado.bloque = id;
      estado.indice = 0;
    }

    const b = g.bloques[estado.bloque];
    if (estado.indice >= b.pasos.length) {
      estado.bloquesHechos.push(b.id);
      estado.bloque = null;
      continue;
    }
    const p = b.pasos[estado.indice];
    if (p.si && !evaluar(g, estado, p.si)) { estado.indice++; continue; }

    emitirTextos(g, inst, estado, p, salida);
    if (p.tipo === "mensaje") { estado.indice++; continue; }
    if (p.tipo === "directorio") {
      const excluir = new Set(p.excluir ?? []);
      if (estado.rojo) excluir.add("denuncia");
      salida.push({ tipo: "directorio", excluir: [...excluir] });
      estado.indice++;
      continue;
    }
    if (p.tipo === "ejercicio") salida.push({ tipo: "ejercicio", ejercicio: ejercicioPara(g, estado, p.ejercicio ?? "respiracion") });
    const textos = p.texto ? (Array.isArray(p.texto) ? p.texto : [p.texto]) : [];
    estado.esperando = { ...esperar(g, p), pregunta: textos.map((x) => resolverTexto(g, inst, estado, x)).join(" ") };
    return;
  }
  throw new Error("El motor no avanzó: revisa el guion");
}

export function arrancar(g: Guion, inst: Instancia, estadoInicial: Estado): Resultado {
  const estado = structuredClone(estadoInicial);
  const salida: Salida[] = [];
  avanzar(g, inst, estado, salida);
  return { estado, salida };
}

function irA(estado: Estado, bloques: string[]) {
  estado.cola = bloques;
  estado.bloque = null;
  estado.esperando = null;
  estado.pausa = null;
  estado.confirmacion = undefined;
  delete estado.esperandoPrevio;
}

/** El joven aceptó seguir en el consentimiento. Sin esto no se pregunta ni se registra nada más. */
export function consintio(estado: Estado): boolean {
  return estado.respuestas["bi_consentimiento"]?.valor === "si" || estado.respuestas["bi_consentimiento2"]?.valor === "si";
}

/** Bloques permitidos después de una crisis: no se regresa al cuestionario. */
const TRAS_CRISIS = ["crisis", "salida", "otrodia"];

function activarRojo(g: Guion, inst: Instancia, estado: Estado, salida: Salida[]) {
  if (estado.rojo) {
    // Ya está en crisis: repite a dónde llamar y sigue donde iba.
    const cr2 = g.bloques.crisis.pasos.find((p) => p.id === "cr_2");
    if (cr2) emitirTextos(g, inst, estado, cr2, salida);
    return;
  }
  estado.rojo = true;
  irA(estado, ["crisis"]);
  avanzar(g, inst, estado, salida);
}

/**
 * Reconoce opciones por sus sinónimos ("coraje" → con enojo). Palabra completa, salvo las raíces
 * marcadas con * ("trist*" → triste, tristeza). Ignora lo negado ("no mucho", "no estoy triste").
 * "nose" sólo si nada más coincide.
 */
function porSinonimos(opciones: Opcion[], texto: string): string[] {
  const t = ` ${normalizar(texto).replace(/[^a-z0-9ñ ]/g, " ").replace(/\s+/g, " ").trim()} `;
  const coincide = (s: string) => {
    const raiz = s.endsWith("*");
    const f = normalizar(raiz ? s.slice(0, -1) : s);
    const patron = raiz ? ` ${f}` : ` ${f} `;
    if (!t.includes(patron)) return false;
    return !t.includes(` no${patron}`) && !t.includes(` no estoy${patron}`) && !t.includes(` no me siento${patron}`) && !t.includes(` nada${patron}`);
  };
  const hallados = opciones.filter((o) => o.sinonimos?.some(coincide)).map((o) => o.id);
  const sinNose = hallados.filter((id) => id !== "nose");
  return sinNose.length ? sinNose : hallados;
}

const NUMEROS: Record<string, number> = {
  uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10,
  once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17, dieciocho: 18,
  diecinueve: 19, veinte: 20,
};

/** Primer número en el texto, en cifra o en palabra ("15", "quince"). */
function leerNumero(texto: string): number | null {
  const t = normalizar(texto);
  const cifras = t.match(/\d{1,3}/g);
  if (cifras) return Number(cifras[cifras.length - 1]); // "del 1 al 10, como un 8" → 8
  for (const palabra of t.split(/[^a-zñ]+/)) if (NUMEROS[palabra] !== undefined) return NUMEROS[palabra];
  return null;
}

/** Escalas numéricas: "7" en el termómetro → 7–8; "4" en acuerdo → 4. */
function porNumero(p: Paso, opciones: Opcion[], texto: string): Opcion | undefined {
  const n = leerNumero(texto);
  if (n === null) return undefined;
  if (p.escala === "T10" && n >= 1 && n <= 10) return opciones[Math.min(4, Math.floor((n - 1) / 2))];
  if (p.escala === "A5" && n >= 1 && n <= 5) return opciones[n - 1];
  return undefined;
}

/** Intenta casar texto escrito con una opción (sin modelo de lenguaje). */
function casarTexto(opciones: Opcion[], texto: string): Opcion | undefined {
  const t = normalizar(texto).replace(/[^a-z0-9ñ ]/g, "");
  if (!t) return undefined;
  const exacta = opciones.find((o) => normalizar(o.label).replace(/[^a-z0-9ñ ]/g, "") === t);
  if (exacta) return exacta;
  const contiene = opciones.filter((o) => {
    const l = normalizar(o.label).replace(/[^a-z0-9ñ ]/g, "");
    return l.length > 1 && (t.includes(l) || (t.length >= 3 && l.startsWith(t)));
  });
  return contiene.length === 1 ? contiene[0] : undefined;
}

function ofrecerOtroDia(estado: Estado, texto: string, salida: Salida[]) {
  estado.pausa = "otrodia";
  estado.esperandoPrevio = estado.esperando!;
  estado.esperando = { paso: { id: "_otrodia", tipo: "opcion", texto }, opciones: OPC_OTRODIA, multiple: false, textoLibre: true, pregunta: texto };
  salida.push({ tipo: "eco", texto });
}

/** Escalera de desvíos: redirige una vez, salta en la segunda, ofrece "otro día" en la tercera de la sesión. */
/**
 * La pregunta del paso, sola y completa, para repetirla en su propia burbuja después de una redirección.
 * Toma la última oración con "?" y quita un arranque corto ("Para empezar, ¿cuántos…?" → "¿Cuántos…?").
 */
export function preguntaCorta(g: Guion, inst: Instancia, estado: Estado, p: Paso): string | null {
  if (p.repetir) return resolverTexto(g, inst, estado, p.repetir);
  if (!p.texto) return null;
  const textos = (Array.isArray(p.texto) ? p.texto : [p.texto]).map((t) => resolverTexto(g, inst, estado, t)).filter(Boolean) as string[];
  const oraciones = textos.flatMap((t) => t.split(/(?<=[.?!])\s+(?=[¿A-ZÁÉÍÓÚÑ"])/));
  const conPregunta = oraciones.filter((o) => o.includes("?"));
  let q = (conPregunta[conPregunta.length - 1] ?? textos[textos.length - 1] ?? "").trim();
  // Sólo se quitan arranques que no aportan ("Para empezar, ¿cuántos…?"); "Del 1 al 10, ¿qué tan…?" se queda entero.
  const arranque = q.match(/^(para empezar|ahora|y|va|bueno),?\s+(?=¿)/i);
  if (arranque) q = "¿" + q.charAt(arranque[0].length + 1).toUpperCase() + q.slice(arranque[0].length + 2);
  return q || null;
}

function manejarDesvio(g: Guion, inst: Instancia, estado: Estado, tipo: NonNullable<Entrada["desvio"]>, salida: Salida[]): Resultado {
  const p = estado.esperando!.paso;
  const D = g.desvios;
  const variante = (xs: string[]) => xs[(estado.desviosTotal + (estado.desviosPaso[p.id] ?? 0)) % xs.length];
  const saltar = (texto: string): Resultado => {
    estado.respuestas[p.id] = { valor: "omitida" };
    estado.omitidas.push(p.id);
    estado.esperando = null;
    salida.push({ tipo: "eco", texto });
    estado.indice++;
    avanzar(g, inst, estado, salida);
    return { estado, salida, desvio: true };
  };
  /** La redirección siempre va seguida de la pregunta, en su propia burbuja: nunca "¿me ayudas con esta?" a secas. */
  const repetirPregunta = () => {
    if (p.tipo === "ejercicio") {
      emitirTextos(g, inst, estado, p, salida);
      salida.push({ tipo: "ejercicio", ejercicio: ejercicioPara(g, estado, p.ejercicio ?? "respiracion") });
      return;
    }
    const q = preguntaCorta(g, inst, estado, p);
    if (q) salida.push({ tipo: "eco", texto: q });
  };

  switch (tipo) {
    case "no_quiere":
      if (p.noSaltar) { irA(estado, ["salida"]); avanzar(g, inst, estado, salida); return { estado, salida, desvio: true }; }
      return saltar(variante(D.saltarNoQuiere));
    case "insiste":
      // Respondió en serio pero dos veces no quedó claro: se deja pasar sin contarlo como desvío.
      // El consentimiento nunca se salta: se vuelve a preguntar.
      if (p.noSaltar) {
        salida.push({ tipo: "eco", texto: variante(D.redirigir) });
        repetirPregunta();
        return { estado, salida, desvio: true };
      }
      return saltar(variante(D.saltarInsiste));
    case "se_quiere_ir":
      ofrecerOtroDia(estado, D.seQuiereIr, salida);
      return { estado, salida, desvio: true };
    case "privacidad":
      D.privacidad.forEach((texto) => salida.push({ tipo: "eco", texto }));
      repetirPregunta();
      return { estado, salida, desvio: true };
    case "pide_orientacion":
      D.orientacion.forEach((texto) => salida.push({ tipo: "eco", texto }));
      salida.push({ tipo: "directorio", excluir: ["denuncia"] });
      repetirPregunta();
      return { estado, salida, desvio: true };
    default: {
      const texto = variante(tipo === "groseria" ? D.groseria : tipo === "fuera_de_tema" && D.fueraDeTema?.length ? D.fueraDeTema : D.redirigir);
      estado.desvios++;
      estado.desviosTotal++;
      const enPaso = (estado.desviosPaso[p.id] = (estado.desviosPaso[p.id] ?? 0) + 1);
      if (estado.desvios >= 3) {
        ofrecerOtroDia(estado, D.otroDia, salida);
        return { estado, salida, desvio: true };
      }
      if (enPaso >= 2 && !p.noSaltar) return saltar(variante(D.saltarInsiste));
      salida.push({ tipo: "eco", texto });
      repetirPregunta();
      return { estado, salida, desvio: true };
    }
  }
}

/** Sin modelo: ¿el texto es un desvío evidente? */
function desvioPorReglas(texto: string | undefined): Entrada["desvio"] | undefined {
  if (!texto) return undefined;
  if (esGroseriaDirigida(texto)) return "groseria";
  if (pareceSinSentido(texto)) return "sin_sentido";
  return undefined;
}

export function responder(g: Guion, inst: Instancia, estadoPrevio: Estado, entrada: Entrada): Resultado {
  const estado = structuredClone(estadoPrevio);
  const salida: Salida[] = [];
  if (estado.terminada || !estado.esperando) return { estado, salida };

  const texto = entrada.texto?.trim();

  // 1. Riesgo primero, en cualquier texto escrito (lista de palabras o clasificador).
  const nivel = texto ? nivelAlarma(texto, g.alarma, g.alarmaRevisar) : null;
  if (entrada.alarma || nivel === "segura" || (nivel === "revisar" && !entrada.alarmaDescartada)) {
    activarRojo(g, inst, estado, salida);
    return { estado, salida };
  }

  // 2. Pausa y salida.
  if (estado.pausa) {
    let op = entrada.opcion ?? (texto ? casarTexto(estado.esperando.opciones, texto)?.id : undefined);
    if (!op && estado.pausa === "otrodia") op = "otrodia"; // ante la duda, se respeta que hoy no es buen momento
    if (!op) { salida.push({ tipo: "eco", texto: "¿Seguimos o terminamos?" }); return { estado, salida }; }
    const modo = estado.pausa;
    estado.pausa = null;
    const continuar = ((modo === "pausa" || modo === "otrodia") && op === "seguir") || (modo === "salir" && op === "no");
    if (modo === "otrodia" && continuar) estado.desvios = 0;
    if (continuar) {
      const previo = estado.esperandoPrevio!;
      estado.esperando = previo;
      delete estado.esperandoPrevio;
      salida.push({ tipo: "eco", texto: "Va, seguimos." });
      emitirTextos(g, inst, estado, previo.paso, salida);
      if (previo.paso.tipo === "ejercicio") salida.push({ tipo: "ejercicio", ejercicio: ejercicioPara(g, estado, previo.paso.ejercicio ?? "respiracion") });
      return { estado, salida };
    }
    delete estado.esperandoPrevio;
    // Sin consentimiento o tras una crisis no hay cierre con preguntas: sólo despedida y directorio.
    const destino = modo === "otrodia" ? "otrodia" : modo === "pausa" && consintio(estado) && !estado.rojo ? "cierre" : "salida";
    irA(estado, [destino]);
    avanzar(g, inst, estado, salida);
    return { estado, salida };
  }
  if (texto) {
    const t = normalizar(texto);
    if (t === "pausa" || t === "salir") {
      estado.pausa = t;
      estado.esperandoPrevio = estado.esperando;
      estado.esperando = { paso: PAUSA, opciones: t === "pausa" ? OPC_PAUSA : OPC_SALIR, multiple: false, textoLibre: true };
      salida.push({ tipo: "eco", texto: t === "pausa" ? "Aquí espero. Cuando quieras, seguimos." : "¿Quieres terminar la plática?" });
      return { estado, salida };
    }
  }

  // 3. Confirmación del espejo ("Entiendo que hoy te sientes… ¿Es así?").
  if (estado.confirmacion) {
    const conf = estado.confirmacion;
    const op = entrada.opcion ?? (texto ? siNo(texto) : null);
    estado.confirmacion = undefined;
    estado.esperando = conf.previa;
    if (op === "si") return responder(g, inst, estado, conf.entrada);
    if (op === "no") {
      // La caja de texto sigue visible: así cualquier cosa que escriba pasa por la revisión de riesgo.
      salida.push({ tipo: "eco", texto: conf.previa.paso.espejo?.siNo ?? "Va. Elige la que se parezca más." });
      return { estado, salida };
    }
    // Escribió otra cosa: se toma como una nueva respuesta a la misma pregunta.
    return responder(g, inst, estado, entrada);
  }

  // 4. Desvío clasificado por el modelo.
  if (entrada.desvio && estado.esperando.paso.id.charAt(0) !== "_") return manejarDesvio(g, inst, estado, entrada.desvio, salida);

  // 5. Respuesta al paso actual.
  const { paso: p, opciones } = estado.esperando;
  let respuesta: Respuesta | undefined;
  let elegida: Opcion | undefined;

  if (p.tipo === "ejercicio") {
    respuesta = { valor: "listo" };
  } else if (p.tipo === "multiple") {
    const ids = new Set(entrada.opciones ?? []);
    if (texto && !entrada.sinReglas) {
      porSinonimos(opciones, texto).forEach((id) => ids.add(id));
      texto.split(/,|\by\b|\n/).forEach((x) => { const o = casarTexto(opciones, x); if (o) ids.add(o.id); });
    }
    // Lo escrito no corresponde a ninguna opción: se registra como "otro" con sus palabras.
    if (texto && !ids.size && !entrada.otro) {
      const d = desvioPorReglas(texto);
      if (d) return manejarDesvio(g, inst, estado, d, salida);
    }
    if (texto && !ids.size && p.aceptaOtro && !entrada.sinOtro) {
      ids.add(idOtro(opciones));
      estado.textos[`${p.id}:otro`] = fraseOtro(entrada);
    }
    if (texto) {
      if (p.textoPrimero) {
        // Sus propias palabras son dato (reconocimiento emocional): se guardan ya filtradas.
        estado.textos[p.id] = filtrarIdentificadores(texto).texto;
        if (!ids.size) {
          salida.push({ tipo: "eco", texto: "Gracias por ponerlo con tus palabras. ¿Se parece a alguna de estas? Puedes elegir varias." });
          return { estado, salida };
        }
      }
    }
    // "No sé cómo me siento" sólo cuenta si no nombró ninguna otra emoción.
    if (p.textoPrimero && ids.size > 1) ids.delete("nose");
    const idO = idOtro(opciones);
    const validos = [...ids].filter((id) => id === idO ? p.aceptaOtro || opciones.some((o) => o.id === id) : opciones.some((o) => o.id === id));
    if (validos.length) respuesta = { valor: validos };
  } else if (p.tipo === "abierta") {
    if (entrada.opcion) {
      elegida = opciones.find((o) => o.id === entrada.opcion);
      if (elegida) respuesta = { valor: elegida.id };
    } else if (texto) {
      const d = desvioPorReglas(texto);
      if (d) return manejarDesvio(g, inst, estado, d, salida);
      const filtro = filtrarIdentificadores(texto);
      if (filtro.encontrado && !estado.avisoIdentificador) {
        estado.avisoIdentificador = true;
        salida.push({ tipo: "eco", texto: "Gracias por confiar. Para cuidarte, no voy a guardar nombres ni lugares. ¿Me lo cuentas solo desde lo que sientes?" });
        return { estado, salida, aviso: true };
      }
      estado.textos[p.id] = filtro.texto;
      respuesta = { valor: "texto" };
    }
  } else if (p.tipo === "numero") {
    if (entrada.opcion) {
      elegida = opciones.find((o) => o.id === entrada.opcion);
      if (elegida) respuesta = { valor: elegida.id };
    } else if (texto) {
      const n = leerNumero(texto);
      const rango = n === null ? undefined : p.rangos?.find((r) => n >= r.min && n <= r.max);
      // Sólo se guarda el rango; el número exacto no sale de aquí.
      if (rango) {
        respuesta = { valor: rango.id };
        const aviso = p.avisoRango?.[rango.id];
        if (aviso) salida.push({ tipo: "eco", texto: aviso });
      }
      else if (desvioPorReglas(texto)) return manejarDesvio(g, inst, estado, desvioPorReglas(texto)!, salida);
      else {
        salida.push({ tipo: "eco", texto: "¿Me lo escribes con número? Por ejemplo: 15." });
        return { estado, salida };
      }
    }
  } else {
    if (entrada.opcion) elegida = opciones.find((o) => o.id === entrada.opcion);
    else if (texto) {
      elegida = porNumero(p, opciones, texto) ?? casarTexto(opciones, texto);
      if (elegida && entrada.sinOtro && normalizar(elegida.label) !== normalizar(texto).replace(/[.!¡]+$/, "").trim() && !porNumero(p, opciones, texto)) {
        // El modelo no la entendió: sólo vale si escribió la opción tal cual o un número de la escala.
        elegida = undefined;
      }
      if (!elegida && !entrada.sinOtro) {
        const ids = porSinonimos(opciones, texto);
        if (ids.length === 1) elegida = opciones.find((o) => o.id === ids[0]);
      }
    }
    if (!elegida && texto && !entrada.otro) {
      const d = desvioPorReglas(texto);
      if (d) return manejarDesvio(g, inst, estado, d, salida);
    }
    if (elegida) respuesta = { valor: elegida.id, num: elegida.valor };
    else if (texto && p.aceptaOtro && !entrada.sinOtro) {
      const idO = idOtro(opciones);
      respuesta = { valor: idO };
      estado.textos[`${p.id}:otro`] = fraseOtro(entrada);
    }
  }

  if (!respuesta || (Array.isArray(respuesta.valor) && respuesta.valor.length === 0)) {
    salida.push({ tipo: "eco", texto: "No te entendí bien. ¿Me ayudas eligiendo una de las opciones?" });
    return { estado, salida };
  }

  // Espejo con confirmación: la respuesta escrita se repite y se pregunta "¿Es así?" antes de registrarla.
  if (p.espejo && texto && !entrada.confirmado) {
    const ids = Array.isArray(respuesta.valor) ? respuesta.valor : [String(respuesta.valor)];
    if (ids.some((id) => !p.espejo!.sinConfirmar?.includes(id))) {
      const otro = estado.textos[`${p.id}:otro`] ?? null;
      const partes = ids.map((id) => p.espejo!.textos[id] ?? (otro && id === idOtro(opciones) ? otro : null)).filter((x): x is string => !!x);
      const pregunta = p.espejo.plantilla.replace("{opciones}", listaNatural(partes));
      estado.confirmacion = {
        entrada: Array.isArray(respuesta.valor)
          ? { opciones: ids, texto, sinReglas: true, confirmado: true, otro: entrada.otro }
          : { opcion: ids[0], texto, confirmado: true, otro: entrada.otro },
        previa: estado.esperando,
      };
      estado.esperando = {
        paso: { id: "_confirmar", tipo: "opcion", texto: pregunta },
        opciones: OPC_CONFIRMAR, multiple: false, textoLibre: true, pregunta,
      };
      salida.push({ tipo: "eco", texto: pregunta });
      return { estado, salida };
    }
  }

  estado.respuestas[p.id] = respuesta;
  estado.esperando = null;

  // Espejo corto: si escribió con sus palabras, Eco dice lo que entendió ("Va, casi nunca.").
  if (texto && !p.espejo && !p.sinEspejo && (p.tipo === "opcion" || p.tipo === "multiple") && !SIN_ESPEJO.includes(estado.bloque ?? "")) {
    const ids = Array.isArray(respuesta.valor) ? respuesta.valor : [String(respuesta.valor)];
    const literal = normalizar(opciones.filter((o) => ids.includes(o.id)).map((o) => o.label).join(" ")).replace(/[^a-z0-9ñ ]/g, "");
    if (ids.length && normalizar(texto).replace(/[^a-z0-9ñ ]/g, "") !== literal) {
      salida.push({ tipo: "eco", texto: `Va, ${espejoCorto(p, ids, opciones, estado.textos[`${p.id}:otro`] ?? null)}.` });
    }
  }

  for (const r of p.reacciones ?? []) {
    const ok = !r.si || ("paso" in r.si || "todos" in r.si || "alguno" in r.si || "no" in r.si || "cuenta" in r.si || "emocionPrincipal" in r.si || "amarillo" in r.si || "unaEmocion" in r.si
      ? evaluar(g, estado, r.si as Condicion)
      : cumpleSobre(respuesta, r.si));
    if (ok) salida.push({ tipo: "eco", texto: resolverTexto(g, inst, estado, r.texto), reescribible: true });
  }

  if (elegida?.salir) { irA(estado, ["salida"]); }
  else if (elegida?.terminar) { irA(estado, ["cierre"]); }
  else if (elegida?.fin) { estado.indice = g.bloques[estado.bloque!].pasos.length; }
  else estado.indice++;

  avanzar(g, inst, estado, salida);
  return { estado, salida, respondido: true };
}

export function registrarRecurso(estado: Estado, id: string): Estado {
  if (estado.recursos.includes(id)) return estado;
  return { ...estado, recursos: [...estado.recursos, id] };
}
