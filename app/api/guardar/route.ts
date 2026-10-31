// Guarda el resumen anónimo de la sesión. La escuela sale de la configuración del servidor, no del navegador.
import instJson from "@/config/instancia.json";
import type { Instancia } from "@/lib/tipos";
import type { ResumenSesion } from "@/lib/indices";
import { revisar } from "@/lib/servidor/guardia";
import { airtableDisponible, camposSesion, guardarSesion, registrarRoja } from "@/lib/servidor/airtable";

export const runtime = "nodejs";
const inst = instJson as Instancia;

type Pedido = { codigo?: string; resumen?: Partial<ResumenSesion>; filaPrevia?: string | null };

export async function POST(req: Request) {
  if (!airtableDisponible()) return Response.json({ error: "sin_airtable" }, { status: 503 });
  let cuerpo: Pedido;
  try { cuerpo = await req.json(); } catch { return Response.json({ error: "json" }, { status: 400 }); }
  const rechazo = revisar(req, cuerpo, "guardar");
  if (rechazo) return Response.json({ error: rechazo.error }, { status: rechazo.status });
  const r = cuerpo.resumen;
  if (!r || typeof r !== "object" || r.codigo !== cuerpo.codigo) return Response.json({ error: "resumen" }, { status: 400 });

  try {
    if (r.nivel === "rojo") {
      await registrarRoja(inst.escuela, typeof cuerpo.filaPrevia === "string" ? cuerpo.filaPrevia : null);
      return Response.json({ ok: true, rojo: true });
    }
    // Sin consentimiento no se guarda nada.
    if (r.consintio !== true) return Response.json({ ok: true, guardado: false });
    const fila = await guardarSesion(camposSesion(r, inst.escuela));
    return Response.json({ ok: true, fila });
  } catch (e) {
    // Sin contenido de la sesión en el registro de errores: sólo el motivo.
    console.error(`[eco:guardar] ${String((e as Error).message).slice(0, 200)}`);
    return Response.json({ error: "airtable" }, { status: 502 });
  }
}
