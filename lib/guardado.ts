// Envía el resumen anónimo al servidor para guardarlo. Nunca manda texto escrito por el joven.
import type { Estado, Guion, Instancia } from "./tipos";
import { resumen } from "./indices";
import { consintio } from "./motor";

export type Guardado = { fila: string | null; rojoEnviado: boolean; finalEnviado: boolean };
export const guardadoNuevo = (): Guardado => ({ fila: null, rojoEnviado: false, finalEnviado: false });

/**
 * Decide si hay que guardar y lo hace.
 * - Rojo: una sola vez, sólo escuela y semana (el servidor borra lo parcial que hubiera).
 * - Fin de la sesión con consentimiento: guarda (o actualiza) la fila completa.
 * - "cierre": la página se oculta o se cierra; guarda lo que haya hasta ahí.
 */
export async function guardarSiToca(
  g: Guion, inst: Instancia, estado: Estado, memo: Guardado, motivo: "turno" | "cierre",
): Promise<void> {
  if (memo.rojoEnviado) return;
  let enviar = false;
  if (estado.rojo) { enviar = true; memo.rojoEnviado = true; }
  else if (!consintio(estado) || memo.finalEnviado) return;
  else if (estado.terminada) { enviar = true; memo.finalEnviado = true; }
  else if (motivo === "cierre") enviar = true;
  if (!enviar) return;

  const r = resumen(g, inst, estado);
  try {
    const res = await fetch("/api/guardar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ codigo: estado.codigo, resumen: r, filaPrevia: memo.fila }),
      // Permite que el envío termine aunque la página se esté cerrando.
      keepalive: true,
    });
    const d = (await res.json().catch(() => ({}))) as { fila?: string };
    if (d.fila) memo.fila = d.fila;
  } catch {
    // Sin conexión: no se reintenta para no duplicar. Se pierde sólo esta sesión.
  }
}
