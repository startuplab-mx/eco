import { iaDisponible, registrarFalla } from "@/lib/ia-servidor";
import { conversar } from "@/lib/servidor/conversar";
import { revisar, corto } from "@/lib/servidor/guardia";
import { filtrarIdentificadores } from "@/lib/seguridad";
import type { PedidoConversar } from "@/lib/ia-tipos";

export const runtime = "nodejs";
export const maxDuration = 60;

const ID = /^[a-z0-9_]{2,30}$/;
const lista = (x: unknown, max: number) => (Array.isArray(x) ? x.filter((v) => typeof v === "string" && ID.test(v)).slice(0, max) : []);

export async function POST(req: Request) {
  if (!iaDisponible()) return Response.json({ error: "sin_ia" }, { status: 503 });
  let c: Partial<PedidoConversar>;
  try { c = await req.json(); } catch { return Response.json({ error: "json" }, { status: 400 }); }
  const rechazo = revisar(req, c);
  if (rechazo) return Response.json({ error: rechazo.error }, { status: rechazo.status });

  const pedido: PedidoConversar = {
    codigo: c.codigo!,
    historial: Array.isArray(c.historial)
      ? c.historial.slice(-16).map((m) => ({
          quien: m?.quien === "eco" ? "eco" : "joven",
          // Se vuelve a filtrar aquí por si el navegador no lo hizo.
          texto: m?.quien === "eco" ? corto(m?.texto, 500) : filtrarIdentificadores(corto(m?.texto, 600)).texto,
        }))
      : [],
    texto: typeof c.texto === "string" && c.texto.trim() ? filtrarIdentificadores(corto(c.texto, 600)).texto : null,
    item: typeof c.item === "string" && ID.test(c.item) ? c.item : null,
    cubiertos: lista(c.cubiertos, 120),
    opcionales: Array.isArray(c.opcionales) ? c.opcionales.filter((x) => typeof x === "string" && /^[A-I]$/.test(x)).slice(0, 9) : [],
    turnos: Math.max(0, Math.min(100, Number(c.turnos) || 0)),
    maxTurnos: Math.max(5, Math.min(60, Number(c.maxTurnos) || 40)),
    respiracion: c.respiracion === "pendiente" || c.respiracion === "ofrecida" ? c.respiracion : "no",
    ejercicios: lista(c.ejercicios, 10),
    ofrecidos: lista(c.ofrecidos, 10),
  };
  try {
    return Response.json(await conversar(pedido));
  } catch (e) {
    registrarFalla("conversar", e);
    return Response.json({ error: "modelo" }, { status: 502 });
  }
}
