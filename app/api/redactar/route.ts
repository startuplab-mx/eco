import { redactar, iaDisponible, registrarFalla } from "@/lib/ia-servidor";
import { revisar, corto } from "@/lib/servidor/guardia";
import { filtrarIdentificadores } from "@/lib/seguridad";
import type { PedidoRedactar } from "@/lib/ia-tipos";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!iaDisponible()) return Response.json({ error: "sin_ia" }, { status: 503 });
  let cuerpo: Partial<PedidoRedactar>;
  try { cuerpo = await req.json(); } catch { return Response.json({ error: "json" }, { status: 400 }); }
  const rechazo = revisar(req, cuerpo);
  if (rechazo) return Response.json({ error: rechazo.error }, { status: rechazo.status });

  const pedido: PedidoRedactar = {
    codigo: cuerpo.codigo!,
    historial: Array.isArray(cuerpo.historial)
      ? cuerpo.historial.slice(-6).map((m) => ({
          quien: m?.quien === "eco" ? "eco" : "joven",
          texto: filtrarIdentificadores(corto(m?.texto, 400)).texto,
        }))
      : [],
    base: Array.isArray(cuerpo.base) ? cuerpo.base.slice(0, 3).map((b) => corto(b, 300)) : [],
    siguiente: cuerpo.siguiente ? corto(cuerpo.siguiente, 400) : null,
  };
  try {
    const r = await redactar(pedido);
    return r ? Response.json(r) : Response.json({ error: "modelo" }, { status: 502 });
  } catch (e) {
    registrarFalla("redactar", e);
    return Response.json({ error: "modelo" }, { status: 502 });
  }
}
