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
    if (!r) uso.respaldos++;
    else if (r.riesgo) final = { alarma: true };
    else if (esp.paso.tipo === "multiple") {
      // Se conserva el texto (sus propias palabras) y se suman las opciones que entendió el modelo.
      final = { texto, opciones: [...(entrada.opciones ?? []), ...r.opciones] };
    } else if (esp.paso.tipo === "opcion" && !entrada.opcion) {
      // Primero se intenta con las reglas; si no alcanzan, se usa lo que entendió el modelo.
      const local = responder(g, inst, estado, entrada);
      if (!local.respondido) {
        if (r.opciones[0]) final = { opcion: r.opciones[0] };
        else {
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

/** Implementación para el navegador: llama a las rutas del servidor con tiempo límite. */
export function iaPorHTTP(tiempoMs = 4500): ServicioIA {
  async function post<T>(ruta: string, cuerpo: unknown): Promise<T | null> {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), tiempoMs);
    try {
      const r = await fetch(ruta, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cuerpo),
        signal: ctrl.signal,
      });
      return r.ok ? ((await r.json()) as T) : null;
    } catch {
      return null;
    } finally {
      clearTimeout(t);
    }
  }
  return {
    interpretar: (p) => post("/api/interpretar", p),
    redactar: (p) => post("/api/redactar", p),
  };
}
