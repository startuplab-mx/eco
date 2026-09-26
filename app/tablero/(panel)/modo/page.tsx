import EmbudoZonas from "@/components/tablero/EmbudoZonas";
import { BarrasH } from "@/components/tablero/graficas";
import { Cuenta, Encabezado, Resguardo, Tabla, Tarjeta } from "@/components/tablero/ui";
import { dirigidaA, MINIMO, ofertaPorDestino, ofertas, porFranja, pruebas } from "@/lib/mock/tablero";

export default function ModoOperar() {
  return (
    <>
      <Encabezado
        titulo="Modo de operar"
        subtitulo="Cómo avanza el proceso por zona, qué se ofrece, qué se pide como prueba y cuándo pasa."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <EmbudoZonas />
        <Tarjeta titulo="Qué se ofrece y cuánto" subtitulo="Últimas 8 semanas · monto típico según los reportes">
          <Tabla
            columnas={["Tipo de oferta", "Reportes", "Monto típico"]}
            filas={ofertas.map((o) => [
              o.tipo,
              <Cuenta key="n" n={o.n} />,
              o.n >= MINIMO ? o.monto : <span className="text-t-muted">—</span>,
            ])}
          />
        </Tarjeta>
        <Tarjeta titulo="Qué se pide como prueba" subtitulo="Tarea de prueba reportada · últimas 8 semanas">
          <BarrasH datos={pruebas.map((p) => ({ nombre: p.tarea, n: p.n }))} anchoEtiqueta="w-52" />
        </Tarjeta>
        <Tarjeta titulo="A quién va dirigida" subtitulo="Según lo que cuentan de otras personas · últimas 8 semanas">
          <BarrasH datos={dirigidaA.map((d) => ({ nombre: d.a, n: d.n }))} anchoEtiqueta="w-28" />
          <div className="mt-5 border-t border-t-border pt-4">
            <p className="mb-2 text-sm text-t-muted">Oferta más reportada</p>
            <Tabla
              columnas={["Dirigida", "Oferta", "Reportes"]}
              filas={ofertaPorDestino.map((o) => [o.a, o.oferta, <Cuenta key="n" n={o.n} />])}
            />
          </div>
          <p className="mt-4 text-xs text-t-muted">
            A chavas el enganche llega más por una relación, regalos y fotos; a chavos, por avisar y llevar paquetes. El
            sistema nunca registra si quien escribe es chava o chavo.
          </p>
        </Tarjeta>
        <Tarjeta titulo="Cuándo pasa" subtitulo="Franja del día · últimas 8 semanas">
          <BarrasH datos={porFranja.map((f) => ({ nombre: f.franja, n: f.n }))} resaltar={1} anchoEtiqueta="w-32" />
          <p className="mt-4 text-xs text-t-muted">La franja vespertina coincide con la salida del turno matutino.</p>
        </Tarjeta>
      </div>
      <Resguardo>Franjas, no horas. Montos redondeados a partir de lo que cuentan los estudiantes.</Resguardo>
    </>
  );
}
