import type { ReactNode } from "react";
import { EyeOff } from "lucide-react";
import { MINIMO } from "@/lib/mock/tablero";

export function Encabezado({ titulo, subtitulo, children }: { titulo: string; subtitulo?: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{titulo}</h1>
        {subtitulo && <p className="mt-1 max-w-2xl text-sm text-t-ink-2">{subtitulo}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function Tarjeta({
  titulo,
  subtitulo,
  children,
  className = "",
  accion,
}: {
  titulo?: string;
  subtitulo?: string;
  children: ReactNode;
  className?: string;
  accion?: ReactNode;
}) {
  return (
    <section className={`rounded-xl border border-t-border bg-t-surface p-5 ${className}`}>
      {(titulo || accion) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            {titulo && <h2 className="text-[15px] font-semibold">{titulo}</h2>}
            {subtitulo && <p className="mt-0.5 text-sm text-t-muted">{subtitulo}</p>}
          </div>
          {accion}
        </div>
      )}
      {children}
    </section>
  );
}

export function Dato({
  etiqueta,
  valor,
  nota,
}: {
  etiqueta: string;
  valor: ReactNode;
  nota?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-t-border bg-t-surface p-4">
      <p className="text-sm text-t-ink-2">{etiqueta}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight">{valor}</p>
      {nota && <p className="mt-1 text-xs text-t-muted">{nota}</p>}
    </div>
  );
}

// Conteo con la regla del mínimo: de 1 a 4 no se muestra.
export function Cuenta({ n, className = "" }: { n: number; className?: string }) {
  if (n >= MINIMO) return <span className={`tabular ${className}`}>{n.toLocaleString("es-MX")}</span>;
  return (
    <span className={`inline-flex items-center gap-1 text-t-muted ${className}`} title="Menos de 5 registros: no se muestra">
      <EyeOff className="size-3.5" aria-hidden />
      &lt; 5
    </span>
  );
}

export function Segmentado<T extends string>({
  opciones,
  valor,
  onCambio,
  etiqueta,
}: {
  opciones: { id: T; nombre: string }[];
  valor: T;
  onCambio: (v: T) => void;
  etiqueta: string;
}) {
  return (
    <div role="radiogroup" aria-label={etiqueta} className="flex rounded-lg border border-t-border bg-t-surface p-0.5 text-sm">
      {opciones.map((o) => (
        <button
          key={o.id}
          role="radio"
          aria-checked={valor === o.id}
          onClick={() => onCambio(o.id)}
          className={`rounded-md px-3 py-1.5 font-medium ${
            valor === o.id ? "bg-t-ink text-t-page" : "text-t-ink-2 hover:bg-t-hover"
          }`}
        >
          {o.nombre}
        </button>
      ))}
    </div>
  );
}

export function Leyenda({ items }: { items: { nombre: string; color: string; rayado?: boolean }[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-t-ink-2">
      {items.map((i) => (
        <li key={i.nombre} className="flex items-center gap-1.5">
          <span
            className={`size-2.5 rounded-sm ${i.rayado ? "oculta border border-t-axis" : ""}`}
            style={i.rayado ? undefined : { background: i.color }}
          />
          {i.nombre}
        </li>
      ))}
    </ul>
  );
}

export function VerTabla({ children }: { children: ReactNode }) {
  return (
    <details className="mt-4 text-sm">
      <summary className="cursor-pointer select-none text-t-muted hover:text-t-ink">Ver como tabla</summary>
      <div className="mt-3 overflow-x-auto">{children}</div>
    </details>
  );
}

export function Tabla({ columnas, filas }: { columnas: string[]; filas: ReactNode[][] }) {
  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-t-border text-t-muted">
          {columnas.map((c) => (
            <th key={c} className="py-2 pr-4 font-medium">
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {filas.map((f, i) => (
          <tr key={i} className="border-b border-t-border last:border-0">
            {f.map((c, j) => (
              <td key={j} className="py-2.5 pr-4 align-top">
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function Resguardo({ children }: { children: ReactNode }) {
  return (
    <p className="mt-8 flex items-start gap-2 border-t border-t-border pt-4 text-xs text-t-muted">
      <EyeOff className="mt-px size-3.5 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  );
}
