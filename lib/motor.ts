// Motor de rieles de Eco.
// El guion decide qué se pregunta y en qué orden; el motor lo recorre,
// abre módulos según la emoción y el ámbito, y aplica el protocolo de riesgo.
// Es puro: recibe un estado y devuelve uno nuevo más lo que hay que mostrar.

import type {
  Bloque, Condicion, EjercicioId, Espera, Estado, Guion, Instancia, Opcion, Paso, Respuesta, Salida,
} from "./tipos";
import { filtrarIdentificadores, hayAlarma, normalizar } from "./seguridad";
import { calcularNivel } from "./indices";

export interface Entrada {
  /** id de opción elegida (botón). */
  opcion?: string;
  /** ids elegidos en selección múltiple. */
  opciones?: string[];
  /** texto escrito por el joven. */
  texto?: string;
}

export interface Resultado {
  estado: Estado;
  salida: Salida[];
}

const PAUSA: Paso = { id: "_pausa", tipo: "opcion" };
const OPC_PAUSA: Opcion[] = [
  { id: "seguir", label: "Seguir" },
  { id: "terminar", label: "Terminar" },
];
const OPC_SALIR: Opcion[] = [
  { id: "si", label: "Sí, terminar" },
  { id: "no", label: "No, sigamos" },
];

// ---------- utilidades ----------

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
  if (p.tipo === "abierta") return p.rapidas ?? [];
  if (p.escala) return g.escalas[p.escala];
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
  };
}

function emitirTextos(g: Guion, inst: Instancia, estado: Estado, p: Paso, salida: Salida[]) {
  if (!p.texto) return;
  const textos = Array.isArray(p.texto) ? p.texto : [p.texto];
  for (const t of textos) {
    const texto = resolverTexto(g, inst, estado, t);
    if (!texto) continue;
    salida.push(p.estilo === "crisis" ? { tipo: "eco-crisis", texto } : { tipo: "eco", texto });
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
      salida.push({ tipo: "directorio", excluir: p.excluir ?? [] });
      estado.indice++;
      continue;
    }
    if (p.tipo === "ejercicio") salida.push({ tipo: "ejercicio", ejercicio: ejercicioPara(g, estado, p.ejercicio ?? "respiracion") });
    estado.esperando = esperar(g, p);
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
}

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

/** Intenta casar texto escrito con una opción (sin modelo de lenguaje). */
function casarTexto(opciones: Opcion[], texto: string): Opcion | undefined {
  const t = normalizar(texto).replace(/[^a-z0-9ñ ]/g, "");
  if (!t) return undefined;
  const exacta = opciones.find((o) => normalizar(o.label).replace(/[^a-z0-9ñ ]/g, "") === t);
  if (exacta) return exacta;
  const contiene = opciones.filter((o) => {
    const l = normalizar(o.label).replace(/[^a-z0-9ñ ]/g, "");
    return l.length > 1 && (t.includes(l) || l.startsWith(t));
  });
  return contiene.length === 1 ? contiene[0] : undefined;
}

export function responder(g: Guion, inst: Instancia, estadoPrevio: Estado, entrada: Entrada): Resultado {
  const estado = structuredClone(estadoPrevio);
  const salida: Salida[] = [];
  if (estado.terminada || !estado.esperando) return { estado, salida };

  const texto = entrada.texto?.trim();

  // 1. Riesgo primero, en cualquier texto escrito.
  if (texto && hayAlarma(texto, g.alarma)) {
    activarRojo(g, inst, estado, salida);
    return { estado, salida };
  }

  // 2. Pausa y salida.
  if (estado.pausa) {
    const op = entrada.opcion ?? (texto ? casarTexto(estado.esperando.opciones, texto)?.id : undefined);
    if (!op) { salida.push({ tipo: "eco", texto: "¿Seguimos o terminamos?" }); return { estado, salida }; }
    const modo = estado.pausa;
    estado.pausa = null;
    const continuar = (modo === "pausa" && op === "seguir") || (modo === "salir" && op === "no");
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
    irA(estado, modo === "pausa" ? ["cierre"] : ["salida"]);
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

  // 3. Respuesta al paso actual.
  const { paso: p, opciones } = estado.esperando;
  let respuesta: Respuesta | undefined;
  let elegida: Opcion | undefined;

  if (p.tipo === "ejercicio") {
    respuesta = { valor: "listo" };
  } else if (p.tipo === "multiple") {
    let ids = entrada.opciones ?? [];
    if (!ids.length && texto) {
      ids = texto.split(/,|\by\b|\n/).map((x) => casarTexto(opciones, x)?.id).filter((x): x is string => !!x);
    }
    if (ids.length) respuesta = { valor: ids.filter((id) => opciones.some((o) => o.id === id)) };
  } else if (p.tipo === "abierta") {
    if (entrada.opcion) {
      elegida = opciones.find((o) => o.id === entrada.opcion);
      if (elegida) respuesta = { valor: elegida.id };
    } else if (texto) {
      const filtro = filtrarIdentificadores(texto);
      if (filtro.encontrado && !estado.avisoIdentificador) {
        estado.avisoIdentificador = true;
        salida.push({ tipo: "eco", texto: "Gracias por confiar. Para cuidarte, no voy a guardar nombres ni lugares. ¿Me lo cuentas solo desde lo que sientes?" });
        return { estado, salida };
      }
      estado.textos[p.id] = filtro.texto;
      respuesta = { valor: "texto" };
    }
  } else {
    elegida = entrada.opcion ? opciones.find((o) => o.id === entrada.opcion) : texto ? casarTexto(opciones, texto) : undefined;
    if (elegida) respuesta = { valor: elegida.id, num: elegida.valor };
  }

  if (!respuesta || (Array.isArray(respuesta.valor) && respuesta.valor.length === 0)) {
    salida.push({ tipo: "eco", texto: "No te entendí bien. ¿Me ayudas eligiendo una de las opciones?" });
    return { estado, salida };
  }

  estado.respuestas[p.id] = respuesta;
  estado.esperando = null;

  for (const r of p.reacciones ?? []) {
    const ok = !r.si || ("paso" in r.si || "todos" in r.si || "alguno" in r.si || "no" in r.si || "cuenta" in r.si || "emocionPrincipal" in r.si || "amarillo" in r.si || "unaEmocion" in r.si
      ? evaluar(g, estado, r.si as Condicion)
      : cumpleSobre(respuesta, r.si));
    if (ok) salida.push({ tipo: "eco", texto: resolverTexto(g, inst, estado, r.texto) });
  }

  if (elegida?.salir) { irA(estado, ["salida"]); }
  else if (elegida?.terminar) { irA(estado, ["cierre"]); }
  else if (elegida?.fin) { estado.indice = g.bloques[estado.bloque!].pasos.length; }
  else estado.indice++;

  avanzar(g, inst, estado, salida);
  return { estado, salida };
}

export function registrarRecurso(estado: Estado, id: string): Estado {
  if (estado.recursos.includes(id)) return estado;
  return { ...estado, recursos: [...estado.recursos, id] };
}
