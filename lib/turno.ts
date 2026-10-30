// Un turno de la plática: lo que el joven responde → motor → (IA) → lo que Eco dice.
// El motor manda. La IA sólo (1) revisa riesgo y entiende texto libre, y
// (2) reescribe reacciones y validaciones. Si la IA falla o tarda, se usa el guion.

import type { Estado, Guion, Instancia, Salida } from "./tipos";
import { responder, type Entrada } from "./motor";
import { filtrarIdentificadores, normalizar } from "./seguridad";
import type { ServicioIA } from "./ia-tipos";

export interface Mensaje {
  quien: "eco" | "joven";
  texto: string;
}

export interface ResultadoTurno {
  estado: Estado;
  salida: Salida[];
  /** Para medir: cuántas veces se usó la IA y cuántas se cayó al guion. */
  uso: { llamadas: number; respaldos: number; puentes: number };
}


export async function turno(
  g: Guion,
  inst: Instancia,
  estado: Estado,
  entrada: Entrada,
  ia: ServicioIA | null,
  historial: Mensaje[],
): Promise<ResultadoTurno> {
  const uso = { llamadas: 0, respaldos: 0, puentes: 0 };
  const esp = estado.esperando;
  const texto = entrada.texto?.trim();
  const comando = texto && ["pausa", "salir"].includes(normalizar(texto));
  let final: Entrada = entrada;

  // 1. Texto escrito: revisar riesgo, clasificar y entender a qué opción corresponde.
  let repregunta: string | null = null;
  let modeloSinRiesgo = false;
  if (ia && esp && texto && !comando && esp.paso.tipo !== "ejercicio") {
    uso.llamadas++;
    const r = await ia.interpretar({
      codigo: estado.codigo,
      pregunta: esp.pregunta ?? "",
      tipo: esp.paso.tipo as "opcion",
      opciones: esp.opciones.map((o) => ({ id: o.id, label: o.label })),
      texto: filtrarIdentificadores(texto).texto,
    });
    const aceptaOtro = !!esp.paso.aceptaOtro && !!r?.otro;
    modeloSinRiesgo = !!r && !r.riesgo;
    if (!r) uso.respaldos++; // sin modelo: las reglas de palabras se encargan
    else if (r.riesgo) final = { alarma: true };
    else if (estado.pausa) {
      // Pausa, "salir" u "otro día": el riesgo ya se revisó; la opción la decide el motor.
      final = r.opciones[0] ? { opcion: r.opciones[0], texto } : entrada;
    } else if (estado.confirmacion) {
      // Confirmando el espejo: sí/no lo resuelve el motor; si escribió otra cosa, es una nueva respuesta.
      // El texto se conserva para que la lista de alarma lo revise.
      final = r.opciones[0] ? { opcion: r.opciones[0], texto } : entrada;
    } else if (r.tipo && r.tipo !== "responde" && !r.opciones.length && !r.otro && !entrada.opciones?.length && !(esp.paso.tipo === "numero" && /\d/.test(texto))) {
      // (Un número en una pregunta de número nunca es desvío: lo lee el motor, aunque esté fuera de rango.)
      // Desvío: sin sentido, grosería, fuera de tema, no quiere, se quiere ir, privacidad, orientación.
      final = { texto, desvio: r.tipo };
    } else if (esp.paso.tipo === "multiple") {
      // Lo que entendió el modelo manda; el texto se conserva (sus propias palabras).
      final = r.opciones.length
        ? { texto, opciones: [...(entrada.opciones ?? []), ...r.opciones], sinReglas: true }
        : aceptaOtro
          ? { texto, opciones: entrada.opciones, sinReglas: true, otro: r.otro! }
          : { texto, opciones: entrada.opciones, sinOtro: true };
      repregunta = r.repregunta;
    } else if (esp.paso.tipo === "opcion" && !entrada.opcion) {
      // Se conserva el texto para el espejo y para que la lista de alarma lo revise.
      final = r.opciones[0] ? { opcion: r.opciones[0], texto } : aceptaOtro ? { texto, otro: r.otro! } : { texto, sinOtro: true };
      repregunta = r.repregunta;
    }
  }

  // Si el modelo revisó el texto y no vio riesgo, las frases ambiguas de la lista no activan la crisis.
  if (modeloSinRiesgo && texto && !final.alarma) final = { ...final, alarmaDescartada: true };
  let res = responder(g, inst, estado, final);

  // Respuesta escrita que no se entendió: se repregunta una vez; a la segunda se deja pasar.
  const sinEntender =
    !!texto && !comando && !!esp && esp.paso.id.charAt(0) !== "_" && !res.respondido && !res.desvio && !res.aviso &&
    !res.estado.confirmacion && !res.estado.rojo && !res.estado.pausa && res.estado.esperando?.paso.id === esp.paso.id;
  if (sinEntender) {
    const clave = `?${esp!.paso.id}`;
    if ((estado.desviosPaso[clave] ?? 0) >= 1) {
      res = responder(g, inst, estado, { desvio: "insiste" });
    } else {
      res = {
        ...res,
        estado: { ...res.estado, desviosPaso: { ...res.estado.desviosPaso, [clave]: 1 } },
        salida: repregunta ? [{ tipo: "eco", texto: repregunta }] : res.salida,
      };
    }
  }
  let salida = res.salida;

  // 2. Reescribir reacciones y validaciones (nunca en crisis, nunca preguntas ni textos fijos).
  const inicio = salida.findIndex((s) => s.tipo === "eco" && s.reescribible);
  // Sin reacción del guion, sólo se escribe puente después de una respuesta abierta (no en datos ni escalas).
  const huboTextoLibre = !!texto && !comando && res.respondido && !res.desvio && esp?.paso.tipo === "abierta";
  if (ia && !res.estado.rojo && !res.desvio && !final.desvio && res.respondido && (inicio >= 0 || huboTextoLibre)) {
    let fin = inicio;
    while (fin >= 0 && fin < salida.length && salida[fin].tipo === "eco" && (salida[fin] as { reescribible?: boolean }).reescribible) fin++;
    const base = inicio >= 0 ? salida.slice(inicio, fin).map((s) => ("texto" in s ? s.texto : "")) : [];
    const desde = inicio >= 0 ? fin : 0;
    const siguiente = salida.slice(desde).find((s) => s.tipo === "eco") as { texto: string } | undefined;

    uso.llamadas++;
    const r = await ia.redactar({
      codigo: estado.codigo,
      historial: historial.slice(-5).map((m) => ({
        quien: m.quien,
        texto: m.quien === "joven" ? filtrarIdentificadores(m.texto).texto : m.texto,
      })),
      base,
      siguiente: siguiente?.texto ?? null,
    });
    if (!r) uso.respaldos++;
    else if (r.puente !== null) {
      const puente: Salida[] = r.puente ? [{ tipo: "eco", texto: r.puente }] : [];
      if (r.puente) uso.puentes++;
      salida = inicio >= 0
        ? [...salida.slice(0, inicio), ...puente, ...salida.slice(fin)]
        : [...puente, ...salida];
    } else uso.respaldos++;
  }

  return { estado: res.estado, salida, uso };
}

/** Últimas fallas de la IA en este navegador (para el panel de prueba). Nunca incluye texto del joven. */
export const fallasIA: string[] = [];
function anotarFalla(ruta: string, motivo: string) {
  fallasIA.push(`${ruta.replace("/api/", "")}: ${motivo}`);
  if (fallasIA.length > 8) fallasIA.shift();
}

/** Implementación para el navegador: llama a las rutas del servidor con tiempo límite. */
export function iaPorHTTP(): ServicioIA {
  async function post<T>(ruta: string, cuerpo: unknown, tiempoMs: number): Promise<T | null> {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), tiempoMs);
    try {
      const r = await fetch(ruta, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cuerpo),
        signal: ctrl.signal,
      });
      if (!r.ok) {
        const e = (await r.json().catch(() => ({}))) as { error?: string };
        anotarFalla(ruta, `${r.status} ${e.error ?? ""}`);
        return null;
      }
      return (await r.json()) as T;
    } catch (e) {
      anotarFalla(ruta, (e as Error).name === "AbortError" ? `tardó más de ${tiempoMs / 1000} s` : "sin conexión");
      return null;
    } finally {
      clearTimeout(t);
    }
  }
  return {
    interpretar: (p) => post("/api/interpretar", p, 9000),
    redactar: (p) => post("/api/redactar", p, 6000),
  };
}
