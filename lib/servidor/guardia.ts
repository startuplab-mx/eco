// Protecciones básicas de las rutas de IA: origen, tamaño y ritmo de llamadas.
// El límite de gasto en la consola de Anthropic es la protección de fondo.
import "server-only";

const POR_IP = 600; // por minuto; una escuela comparte IP, por eso es alto
const POR_SESION = 200; // llamadas por código de sesión
const ventanas = new Map<string, { n: number; hasta: number }>();
const sesiones = new Map<string, number>();

export type Rechazo = { error: string; status: number };

function mismoOrigen(origen: string | null, host: string | null): boolean {
  if (!origen || !host) return true; // peticiones del mismo sitio sin cabecera Origin
  if (origen === "null") return false;
  try {
    return new URL(origen).host === host;
  } catch {
    return false;
  }
}

/** Revisa la petición. Devuelve null si pasa, o el error y código HTTP para responder. */
export function revisar(req: Request, cuerpo: unknown): Rechazo | null {
  if (!mismoOrigen(req.headers.get("origin"), req.headers.get("host"))) return { error: "origen", status: 403 };
  if (!cuerpo || typeof cuerpo !== "object") return { error: "cuerpo", status: 400 };
  const codigo = (cuerpo as { codigo?: unknown }).codigo;
  if (typeof codigo !== "string" || !/^[a-z0-9]{10}$/.test(codigo)) return { error: "codigo", status: 400 };

  const ip = (req.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim();
  const ahora = Date.now();
  if (ventanas.size > 5_000) for (const [k, w] of ventanas) if (w.hasta < ahora) ventanas.delete(k);
  const v = ventanas.get(ip);
  if (!v || v.hasta < ahora) ventanas.set(ip, { n: 1, hasta: ahora + 60_000 });
  else if (++v.n > POR_IP) return { error: "ritmo", status: 429 };

  const n = (sesiones.get(codigo) ?? 0) + 1;
  sesiones.set(codigo, n);
  if (n > POR_SESION) return { error: "sesion", status: 429 };
  if (sesiones.size > 20_000) sesiones.clear();
  return null;
}

export function corto(texto: unknown, max: number): string {
  return typeof texto === "string" ? texto.slice(0, max) : "";
}
