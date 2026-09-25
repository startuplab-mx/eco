"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, CircleCheck, OctagonAlert } from "lucide-react";
import { MINIMO } from "@/lib/mock/tablero";
import { Cuenta, Leyenda } from "./ui";

export const SERIES = ["var(--s1)", "var(--s2)", "var(--s3)", "var(--s4)", "var(--s5)"];

function useAncho<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [ancho, setAncho] = useState(0);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setAncho(e.contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, ancho] as const;
}

function techo(max: number, paso: number) {
  return Math.max(paso, Math.ceil(max / paso) * paso);
}

// Barra vertical con extremo redondeado (4px) y base recta.
function barraV(x: number, y: number, w: number, h: number, r = 4) {
  r = Math.min(r, h, w / 2);
  return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`;
}

function Tooltip({ x, y, children }: { x: number; y: number; children: ReactNode }) {
  return (
    <div
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-t-border bg-t-surface px-3 py-2 text-xs shadow-lg"
      style={{ left: x, top: y - 8 }}
    >
      {children}
    </div>
  );
}

// --- Columnas de una sola serie ---------------------------------------------

export function Columnas({
  datos,
  unidad,
  alto = 220,
}: {
  datos: { etiqueta: string; valor: number; detalle?: string }[];
  unidad: string;
  alto?: number;
}) {
  const [ref, ancho] = useAncho<HTMLDivElement>();
  const [activo, setActivo] = useState<number | null>(null);
  const m = { t: 24, r: 8, b: 26, l: 30 };
  const w = Math.max(0, ancho - m.l - m.r);
  const h = alto - m.t - m.b;
  const max = techo(Math.max(...datos.map((d) => d.valor)), 10);
  const ticks = Array.from({ length: max / 10 + 1 }, (_, i) => i * 10);
  const banda = w / datos.length;
  const bw = Math.min(24, banda * 0.55);
  const y = (v: number) => m.t + h - (v / max) * h;

  return (
    <div ref={ref} className="relative">
      {ancho > 0 && (
        <svg width={ancho} height={alto} role="img" aria-label={`${unidad} por semana`}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={m.l} x2={ancho - m.r} y1={y(t)} y2={y(t)} stroke={t === 0 ? "var(--t-axis)" : "var(--t-grid)"} />
              <text x={m.l - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-t-muted text-[11px] tabular">
                {t}
              </text>
            </g>
          ))}
          {datos.map((d, i) => {
            const cx = m.l + banda * i + banda / 2;
            const ultimo = i === datos.length - 1;
            return (
              <g key={d.etiqueta}>
                <path
                  d={barraV(cx - bw / 2, y(d.valor), bw, y(0) - y(d.valor))}
                  fill="var(--s1)"
                  opacity={activo === null || activo === i ? 1 : 0.45}
                />
                {ultimo && (
                  <text x={cx} y={y(d.valor) - 6} textAnchor="middle" className="fill-t-ink text-[12px] font-semibold tabular">
                    {d.valor}
                  </text>
                )}
                <text x={cx} y={alto - 8} textAnchor="middle" className="fill-t-muted text-[11px]">
                  {d.etiqueta}
                </text>
                <rect
                  x={m.l + banda * i}
                  y={m.t}
                  width={banda}
                  height={h}
                  fill="transparent"
                  onMouseEnter={() => setActivo(i)}
                  onMouseLeave={() => setActivo(null)}
                />
              </g>
            );
          })}
        </svg>
      )}
      {activo !== null && (
        <Tooltip x={m.l + banda * activo + banda / 2} y={y(datos[activo].valor)}>
          <p className="text-t-muted">{datos[activo].detalle ?? datos[activo].etiqueta}</p>
          <p className="mt-0.5 font-semibold text-t-ink">
            {datos[activo].valor} {unidad}
          </p>
        </Tooltip>
      )}
    </div>
  );
}

// --- Barras horizontales (lista) ----------------------------------------------

export function BarrasH({
  datos,
  resaltar,
  anchoEtiqueta = "w-44",
}: {
  datos: { nombre: string; n: number; nota?: string }[];
  resaltar?: number;
  anchoEtiqueta?: string;
}) {
  const max = Math.max(...datos.map((d) => d.n));
  return (
    <ul className="space-y-2.5">
      {datos.map((d, i) => {
        const visible = d.n >= MINIMO;
        const color = resaltar === undefined || resaltar === i ? "var(--s1)" : "var(--t-neutral)";
        return (
          <li key={d.nombre} className="flex items-center gap-3 text-sm">
            <span className={`${anchoEtiqueta} shrink-0 text-t-ink-2`}>{d.nombre}</span>
            <span className="flex flex-1 items-center gap-2">
              {visible ? (
                <span className="h-3.5 rounded-r" style={{ width: `${(d.n / max) * 100}%`, background: color }} />
              ) : (
                <span className="oculta h-3.5 w-6 rounded-r border border-t-grid" />
              )}
              <Cuenta n={d.n} className="font-medium" />
            </span>
          </li>
        );
      })}
    </ul>
  );
}

// --- Barras apiladas horizontales -----------------------------------------------

export function BarrasApiladas({
  datos,
  series,
}: {
  datos: { nombre: string; valores: number[] }[];
  series: readonly string[];
}) {
  const [activo, setActivo] = useState<{ fila: number; serie: number } | null>(null);
  const totales = datos.map((d) => d.valores.reduce((a, b) => a + b, 0));
  const max = Math.max(...totales);
  return (
    <div className="space-y-4">
      <Leyenda items={series.map((s, i) => ({ nombre: s, color: SERIES[i] }))} />
      <ul className="space-y-3">
        {datos.map((d, fi) => (
          <li key={d.nombre} className="flex items-center gap-3 text-sm">
            <span className="w-32 shrink-0 text-t-ink-2">{d.nombre}</span>
            <span className="flex flex-1 items-center gap-2">
              <span className="flex h-4 gap-[2px]" style={{ width: `${(totales[fi] / max) * 100}%` }}>
                {d.valores.map((v, si) =>
                  v === 0 ? null : (
                    <span
                      key={si}
                      className="relative h-full last:rounded-r"
                      style={{
                        flexGrow: v,
                        background: SERIES[si],
                        opacity: activo === null || (activo.fila === fi && activo.serie === si) ? 1 : 0.45,
                      }}
                      onMouseEnter={() => setActivo({ fila: fi, serie: si })}
                      onMouseLeave={() => setActivo(null)}
                    >
                      {activo?.fila === fi && activo.serie === si && (
                        <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-t-border bg-t-surface px-3 py-2 text-xs shadow-lg">
                          <span className="block text-t-muted">
                            {d.nombre} · {series[si]}
                          </span>
                          <span className="font-semibold text-t-ink">{v} reportes</span>
                        </span>
                      )}
                    </span>
                  ),
                )}
              </span>
              <span className="font-medium tabular">{totales[fi]}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// --- Líneas ----------------------------------------------------------------------

export function Lineas({
  etiquetas,
  series,
  alto = 220,
}: {
  etiquetas: string[];
  series: { nombre: string; valores: number[] }[];
  alto?: number;
}) {
  const [ref, ancho] = useAncho<HTMLDivElement>();
  const [activo, setActivo] = useState<number | null>(null);
  const m = { t: 16, r: 110, b: 26, l: 30 };
  const w = Math.max(0, ancho - m.l - m.r);
  const h = alto - m.t - m.b;
  const max = techo(Math.max(...series.flatMap((s) => s.valores)), 5);
  const ticks = Array.from({ length: max / 5 + 1 }, (_, i) => i * 5);
  const x = (i: number) => m.l + (etiquetas.length === 1 ? w / 2 : (i / (etiquetas.length - 1)) * w);
  const y = (v: number) => m.t + h - (v / max) * h;
  const ult = etiquetas.length - 1;

  return (
    <div ref={ref} className="relative">
      <div className="mb-3">
        <Leyenda items={series.map((s, i) => ({ nombre: s.nombre, color: SERIES[i] }))} />
      </div>
      {ancho > 0 && (
        <svg
          width={ancho}
          height={alto}
          role="img"
          aria-label="Evolución mensual por plataforma"
          onMouseLeave={() => setActivo(null)}
          onMouseMove={(e) => {
            const bx = e.currentTarget.getBoundingClientRect().left;
            const px = e.clientX - bx;
            const i = Math.round(((px - m.l) / w) * ult);
            setActivo(Math.max(0, Math.min(ult, i)));
          }}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line x1={m.l} x2={m.l + w} y1={y(t)} y2={y(t)} stroke={t === 0 ? "var(--t-axis)" : "var(--t-grid)"} />
              <text x={m.l - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-t-muted text-[11px] tabular">
                {t}
              </text>
            </g>
          ))}
          {etiquetas.map((e, i) => (
            <text key={e} x={x(i)} y={alto - 8} textAnchor="middle" className="fill-t-muted text-[11px]">
              {e}
            </text>
          ))}
          {activo !== null && <line x1={x(activo)} x2={x(activo)} y1={m.t} y2={m.t + h} stroke="var(--t-axis)" />}
          {series.map((s, si) => (
            <g key={s.nombre}>
              <polyline
                points={s.valores.map((v, i) => `${x(i)},${y(v)}`).join(" ")}
                fill="none"
                stroke={SERIES[si]}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              <circle cx={x(ult)} cy={y(s.valores[ult])} r={4} fill={SERIES[si]} stroke="var(--t-surface)" strokeWidth={2} />
              {activo !== null && activo !== ult && (
                <circle cx={x(activo)} cy={y(s.valores[activo])} r={4} fill={SERIES[si]} stroke="var(--t-surface)" strokeWidth={2} />
              )}
              <text x={x(ult) + 10} y={y(s.valores[ult])} dy="0.32em" className="fill-t-ink-2 text-[12px]">
                {s.nombre} <tspan className="fill-t-ink font-semibold">{s.valores[ult]}</tspan>
              </text>
            </g>
          ))}
        </svg>
      )}
      {activo !== null && (
        <Tooltip x={x(activo)} y={m.t + 40}>
          <p className="mb-1 text-t-muted">{etiquetas[activo]}</p>
          {series.map((s, si) => (
            <p key={s.nombre} className="flex items-center gap-2 text-t-ink-2">
              <span className="size-2 rounded-full" style={{ background: SERIES[si] }} />
              {s.nombre}
              <span className="ml-auto pl-3 font-semibold text-t-ink tabular">{s.valores[activo]}</span>
            </p>
          ))}
        </Tooltip>
      )}
    </div>
  );
}

// --- Embudo: periodo anterior contra actual -------------------------------------

export function Embudo({
  etapas,
  anterior,
  actual,
  nombres,
}: {
  etapas: readonly string[];
  anterior: number[];
  actual: number[];
  nombres: [string, string];
}) {
  const max = Math.max(...anterior, ...actual);
  const Barra = ({ n, color }: { n: number; color: string }) => (
    <span className="flex items-center gap-2">
      {n >= MINIMO ? (
        <span className="h-2.5 rounded-r" style={{ width: `${(n / max) * 100}%`, background: color }} />
      ) : (
        <span className="oculta h-2.5 w-5 rounded-r border border-t-grid" />
      )}
      <Cuenta n={n} className="text-xs font-medium" />
    </span>
  );
  return (
    <div className="space-y-4">
      <Leyenda
        items={[
          { nombre: nombres[0], color: "var(--t-neutral)" },
          { nombre: nombres[1], color: "var(--s1)" },
        ]}
      />
      <ol className="space-y-3">
        {etapas.map((e, i) => (
          <li key={e} className="flex items-center gap-3 text-sm">
            <span className="w-24 shrink-0 capitalize text-t-ink-2">
              <span className="mr-1.5 text-t-muted tabular">{i + 1}</span>
              {e}
            </span>
            <span className="flex-1 space-y-1">
              <Barra n={anterior[i]} color="var(--t-neutral)" />
              <Barra n={actual[i]} color="var(--s1)" />
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

// --- Gravedad (estado: siempre con icono y etiqueta) ------------------------------

export function Gravedad({ verde, amarillo, rojo }: { verde: number; amarillo: number; rojo: number }) {
  const total = verde + amarillo + rojo;
  const niveles = [
    { nombre: "Verde", n: verde, color: "var(--good)", Icono: CircleCheck },
    { nombre: "Amarillo", n: amarillo, color: "var(--warning)", Icono: AlertTriangle },
    { nombre: "Rojo", n: rojo, color: "var(--critical)", Icono: OctagonAlert },
  ];
  return (
    <div className="space-y-4">
      <div className="flex h-4 gap-[2px]">
        {niveles.map((nv) => (
          <span
            key={nv.nombre}
            className="h-full first:rounded-l last:rounded-r"
            style={{ flexGrow: nv.n, background: nv.color }}
            title={`${nv.nombre}: ${nv.n}`}
          />
        ))}
      </div>
      <ul className="grid grid-cols-3 gap-3 text-sm">
        {niveles.map(({ nombre, n, color, Icono }) => (
          <li key={nombre}>
            <span className="flex items-center gap-1.5 text-t-ink-2">
              <Icono className="size-4" style={{ color }} aria-hidden />
              {nombre}
            </span>
            <span className="mt-0.5 block text-xl font-semibold tabular">{n}</span>
            <span className="text-xs text-t-muted">{Math.round((n / total) * 100)} %</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
