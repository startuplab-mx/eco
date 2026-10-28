import { BarrasH, Columnas, Gravedad } from "@/components/tablero/graficas";
import { Dato, Encabezado, Resguardo, Tabla, Tarjeta, VerTabla } from "@/components/tablero/ui";
import { filasMes, gravedadMes, resumen, semanas } from "@/lib/mock/tablero";

export default function Resumen() {
  const r = resumen;
  const cambio = Math.round(((r.seriosSemana - r.promedio4Semanas) / r.promedio4Semanas) * 100);
  const filtrado = Math.round((r.filtradosMes / r.recibidosMes) * 100);

  return (
    <>
      <Encabezado titulo="Resumen" subtitulo="Lo que se reportó en el plantel. Solo agregados; ningún mensaje individual." />

      <div className="grid gap-4 lg:grid-cols-[1.3fr_2fr]">
        <section className="rounded-xl border border-t-border bg-t-surface p-6">
          <p className="text-sm text-t-ink-2">Intentos de reclutamiento reportados en septiembre</p>
          <p className="mt-2 text-6xl font-semibold tracking-tight">{r.reclutamientoMes}</p>
          <p className="mt-2 text-sm text-t-muted">
            Agosto: {r.reclutamientoMesAnterior}. Incluye los que la IA marcó como probables aunque nadie use la palabra.
          </p>
        </section>
        <div className="grid grid-cols-2 gap-4">
          <Dato
            etiqueta="Mensajes serios esta semana"
            valor={r.seriosSemana}
            nota={`${cambio >= 0 ? "+" : ""}${cambio} % frente al promedio de las 4 semanas previas`}
          />
          <Dato etiqueta="Filtrados como prueba o broma" valor={`${filtrado} %`} nota={`${r.filtradosMes} de ${r.recibidosMes} recibidos en septiembre`} />
          <Dato etiqueta="Rojos en septiembre" valor={r.rojosMes} nota="Todos avisados al plantel" />
          <Dato etiqueta="Alertas de patrón nuevas" valor={r.alertasNuevas} nota="Sin revisar" />
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Tarjeta titulo="Mensajes serios por semana" subtitulo="Últimas 8 semanas · excluye pruebas y bromas">
          <Columnas
            unidad="mensajes serios"
            datos={semanas.map((s) => ({ etiqueta: s.semana, valor: s.serios, detalle: `Semana del ${s.semana}` }))}
          />
          <VerTabla>
            <Tabla columnas={["Semana", "Mensajes serios"]} filas={semanas.map((s) => [s.semana, s.serios])} />
          </VerTabla>
        </Tarjeta>

        <Tarjeta titulo="Por fila del radar" subtitulo="Septiembre · lo mismo que ven los estudiantes">
          <BarrasH datos={filasMes} resaltar={0} />
          <p className="mt-4 text-xs text-t-muted">
            &ldquo;Dinero o chamba&rdquo; es la fila donde cae el reclutamiento. Al estudiante no se le explica.
          </p>
        </Tarjeta>
      </div>

      <Tarjeta titulo="Por gravedad" subtitulo="Septiembre · clasificación interna, nunca visible para el estudiante" className="mt-4">
        <Gravedad {...gravedadMes} />
      </Tarjeta>

      <Resguardo>
        El tablero no muestra texto libre, mensajes individuales, nombres ni horas exactas. Todo conteo menor a 5 sale
        como &ldquo;&lt; 5&rdquo;.
      </Resguardo>
    </>
  );
}
