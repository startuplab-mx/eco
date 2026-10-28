import { BarrasApiladas, Lineas } from "@/components/tablero/graficas";
import { Encabezado, Resguardo, Tabla, Tarjeta, VerTabla } from "@/components/tablero/ui";
import { evolucion, meses, plataformas, plataformasOcultas, TIPOS_CONTENIDO } from "@/lib/mock/tablero";

export default function Canales() {
  return (
    <>
      <Encabezado
        titulo="Canales digitales"
        subtitulo="Por qué plataforma llega el contacto y qué tipo de contenido se reporta."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Tarjeta titulo="Plataforma y tipo de contenido" subtitulo="Últimos 90 días · reportes con señal de reclutamiento">
          <BarrasApiladas datos={plataformas} series={TIPOS_CONTENIDO} />
          <p className="mt-4 text-xs text-t-muted">
            Con menos de 5 reportes, sin mostrar: {plataformasOcultas.join(", ")}. Los cruces plataforma × contenido con menos de 5
            también se ocultan.
          </p>
          <VerTabla>
            <Tabla
              columnas={["Plataforma", ...TIPOS_CONTENIDO]}
              filas={plataformas.map((p) => [p.nombre, ...p.valores.map((v) => (v === 0 ? "< 5" : v))])}
            />
          </VerTabla>
        </Tarjeta>
        <Tarjeta titulo="Evolución mensual" subtitulo="Reportes por plataforma, junio a septiembre">
          <Lineas etiquetas={meses} series={evolucion} />
          <VerTabla>
            <Tabla columnas={["Plataforma", ...meses]} filas={evolucion.map((s) => [s.nombre, ...s.valores])} />
          </VerTabla>
        </Tarjeta>
      </div>
      <Resguardo>Sin enlaces, cuentas ni capturas. Solo la plataforma y el tipo de contenido que la IA etiquetó.</Resguardo>
    </>
  );
}
