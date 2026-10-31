// Envía el resumen anónimo al servidor para guardarlo. Nunca manda texto escrito por el joven.
import type { Estado, Guion, Instancia } from "./tipos";
import { resumen } from "./indices";
import { consintio } from "./motor";

export type Guardado = {
  fila: string | null; rojoEnviado: boolean; finalEnviado: boolean; ultimo?: string;
  /** Cuándo fue el último guardado bueno y con cuántas respuestas. */
  ultimaVez?: number; respuestasGuardadas?: number;
  /** Cola: los envíos salen de uno en uno, para que un parcial viejo nunca pise al final. */
  cola?: Promise<void>;
};
export const guardadoNuevo = (): Guardado => ({ fila: null, rojoEnviado: false, finalEnviado: false });

const hora = () => new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
/** Durante la plática se guarda lo que haya, como máximo cada 20 segundos. */
const CADA_MS = 20_000;
const ESPERAS_MS = [0, 2_000, 6_000];

/**
 * Decide si hay que guardar y lo hace.
 * - Rojo: una sola vez, sólo escuela y semana (el servidor borra lo parcial que hubiera).
 * - Fin de la sesión con consentimiento: guarda (o actualiza) la fila completa.
 * - Durante la plática ("turno"): guarda lo que haya si hay respuestas nuevas y pasaron 20 segundos.
 * - "cierre": la página se oculta o se cierra; guarda lo que haya hasta ahí.
 * Si falla, reintenta dos veces; si el final falla, se vuelve a intentar en el siguiente aviso.
 */
export function guardarSiToca(
  g: Guion, inst: Instancia, estado: Estado, memo: Guardado, motivo: "turno" | "cierre",
): Promise<void> {
  const paso = (memo.cola ?? Promise.resolve()).then(() => intentar(g, inst, estado, memo, motivo));
  memo.cola = paso.catch(() => {});
  return memo.cola;
}

async function intentar(g: Guion, inst: Instancia, estado: Estado, memo: Guardado, motivo: "turno" | "cierre"): Promise<void> {
  if (memo.rojoEnviado) return;
  const nRespuestas = Object.keys(estado.respuestas).length;
  let final = false;
  if (estado.rojo) final = true;
  else if (!consintio(estado) || memo.finalEnviado) return;
  else if (estado.terminada) final = true;
  else if (motivo === "turno") {
    const nuevas = nRespuestas > (memo.respuestasGuardadas ?? 0);
    if (!nuevas || Date.now() - (memo.ultimaVez ?? 0) < CADA_MS) return;
  }

  const r = resumen(g, inst, estado);
  for (const espera of ESPERAS_MS) {
    if (espera) await new Promise((ok) => setTimeout(ok, espera));
    try {
      const res = await fetch("/api/guardar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo: estado.codigo, resumen: r, filaPrevia: memo.fila }),
        // Permite que el envío termine aunque la página se esté cerrando.
        keepalive: true,
      });
      const d = (await res.json().catch(() => ({}))) as { fila?: string; error?: string; rojo?: boolean; guardado?: boolean };
      if (d.fila) memo.fila = d.fila;
      if (res.ok) {
        if (estado.rojo) memo.rojoEnviado = true;
        else if (final) memo.finalEnviado = true;
        memo.ultimaVez = Date.now();
        memo.respuestasGuardadas = nRespuestas;
        memo.ultimo = `${hora()} · ${d.rojo ? "sesión roja registrada" : d.guardado === false ? "sin consentimiento: no se guarda" : estado.terminada ? "sesión completa guardada" : "guardado parcial"}`;
        return;
      }
      memo.ultimo = `${hora()} · error ${res.status} ${d.error ?? ""}`;
      if (res.status === 400 || res.status === 403) return; // pedido inválido: reintentar no ayuda
    } catch {
      memo.ultimo = `${hora()} · sin conexión`;
    }
  }
}
