// Protecciones básicas de las rutas de IA: origen, tamaño y ritmo de llamadas.
// El límite de gasto en la consola de Anthropic es la protección de fondo.
import "server-only";

const POR_IP = 600; // por minuto; una escuela comparte IP, por eso es alto
const POR_SESION = 200; // llamadas por código de sesión
const ventanas = new Map<string, { n: number; hasta: number }>();
const sesiones = new Map<string, number>();

export function revisar(req: Request, codigo: unknown): string | null {
  const origen = req.headers.get("origin");
  const host = req.headers.get("host");
  if (origen && host && new URL(origen).host !== host) return "origen";
  if (typeof codigo !== "string" || !/^[a-z0-9]{10}$/.test(codigo)) return "codigo";

  const ip = (req.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim();
  const ahora = Date.now();
  const v = ventanas.get(ip);
  if (!v || v.hasta < ahora) ventanas.set(ip, { n: 1, hasta: ahora + 60_000 });
  else if (++v.n > POR_IP) return "ritmo";

  const n = (sesiones.get(codigo) ?? 0) + 1;
  sesiones.set(codigo, n);
  if (n > POR_SESION) return "sesion";
  if (sesiones.size > 20_000) sesiones.clear();
  return null;
}

export function corto(texto: unknown, max: number): string {
  return typeof texto === "string" ? texto.slice(0, max) : "";
}
