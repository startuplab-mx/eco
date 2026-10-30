import { interpretar, iaDisponible, registrarFalla } from "@/lib/ia-servidor";
import { revisar, corto } from "@/lib/servidor/guardia";
import { filtrarIdentificadores } from "@/lib/seguridad";
import type { PedidoInterpretar } from "@/lib/ia-tipos";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!iaDisponible()) return Response.json({ error: "sin_ia" }, { status: 503 });
  let cuerpo: Partial<PedidoInterpretar>;
  try { cuerpo = await req.json(); } catch { return Response.json({ error: "json" }, { status: 400 }); }
  const motivo = revisar(req, cuerpo.codigo);
  if (motivo) return Response.json({ error: motivo }, { status: 429 });

  const pedido: PedidoInterpretar = {
    codigo: cuerpo.codigo!,
    pregunta: corto(cuerpo.pregunta, 400),
    tipo: (["opcion", "multiple", "abierta", "numero", "ejercicio"] as const).find((t) => t === cuerpo.tipo) ?? "opcion",
    opciones: Array.isArray(cuerpo.opciones)
      ? cuerpo.opciones.slice(0, 20).map((o) => ({ id: corto(o?.id, 40), label: corto(o?.label, 80) }))
      : [],
    // Se vuelve a filtrar aquí por si el navegador no lo hizo.
    texto: filtrarIdentificadores(corto(cuerpo.texto, 600)).texto,
  };
  try {
    const r = await interpretar(pedido);
    return r ? Response.json(r) : Response.json({ error: "modelo" }, { status: 502 });
  } catch (e) {
    registrarFalla("interpretar", e);
    // No se registra el contenido: sólo que falló.
    return Response.json({ error: "modelo" }, { status: 502 });
  }
}
