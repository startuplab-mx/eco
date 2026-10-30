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

/** La entrada se entendió: quedó registrada o quedó en confirmación del espejo. */
function entendido(r: { respondido?: boolean; estado: Estado }): boolean {
  return !!r.respondido || !!r.estado.confirmacion;
}

const NO_ENTENDI = "No te entendí bien. ¿Me ayudas eligiendo una de las opciones?";

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

  // 1. Texto escrito: revisar riesgo y entender a qué opción corresponde.
  if (ia && esp && texto && !comando && !estado.pausa && esp.paso.tipo !== "ejercicio") {
    uso.llamadas++;
    const r = await ia.interpretar({
      codigo: estado.codigo,
      pregunta: esp.pregunta ?? "",
      tipo: esp.paso.tipo as "opcion",
      opciones: esp.opciones.map((o) => ({ id: o.id, label: o.label })),
      texto: filtrarIdentificadores(texto).texto,
    });
    if (!r) uso.respaldos++; // sin modelo: las reglas de palabras se encargan
    else if (r.riesgo) final = { alarma: true };
    else if (estado.confirmacion) {
      // Confirmando el espejo: sí/no lo resuelve el motor; si escribió otra cosa, es una nueva respuesta.
      final = r.opciones[0] ? { opcion: r.opciones[0] } : entrada;
    }
    else if (esp.paso.tipo === "multiple") {
      // Lo que entendió el modelo manda; el texto se conserva (sus propias palabras).
      final = r.opciones.length
        ? { texto, opciones: [...(entrada.opciones ?? []), ...r.opciones], sinReglas: true }
        : r.otro && esp.paso.aceptaOtro
          ? { texto, opciones: entrada.opciones, sinReglas: true, otro: r.otro }
          : { texto, opciones: entrada.opciones };
    } else if (esp.paso.tipo === "opcion" && !entrada.opcion) {
      // Se conserva el texto para que Eco haga el espejo de lo que entendió.
      if (r.opciones[0]) final = { opcion: r.opciones[0], texto };
      else if (r.otro && esp.paso.aceptaOtro) final = { texto, otro: r.otro };
      else {
        const local = responder(g, inst, estado, entrada);
        // La lista de alarma siempre gana: si las reglas activaron el protocolo rojo, se respeta.
        if (local.estado.rojo) return { estado: local.estado, salida: local.salida, uso };
        if (!entendido(local)) {
          // Ni el modelo ni las reglas lo entendieron: se repregunta sin avanzar.
          return { estado, salida: [{ tipo: "eco", texto: r.repregunta ?? NO_ENTENDI }], uso };
        }
      }
    }
  }

  const res = responder(g, inst, estado, final);
  let salida = res.salida;

  // 2. Reescribir reacciones y validaciones (nunca en crisis, nunca preguntas ni textos fijos).
  const inicio = salida.findIndex((s) => s.tipo === "eco" && s.reescribible);
  // Sin reacción del guion, sólo se escribe puente después de una respuesta abierta (no en datos ni escalas).
  const huboTextoLibre = !!texto && !comando && res.respondido && esp?.paso.tipo === "abierta";
  if (ia && !res.estado.rojo && res.respondido && (inicio >= 0 || huboTextoLibre)) {
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
