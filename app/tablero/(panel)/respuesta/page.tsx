import { Cuenta, Dato, Encabezado, Resguardo, Tabla, Tarjeta } from "@/components/tablero/ui";
import { PLANTEL, respuesta } from "@/lib/mock/tablero";

export default function Respuesta() {
  const actual = respuesta[respuesta.length - 1];
  return (
    <>
      <Encabezado
        titulo="Respuesta institucional"
        subtitulo="Qué avisos rojos salieron hacia el plantel y cuánto tardaron. Es todo lo que el sistema sabe: no hay seguimiento de casos."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Dato etiqueta="Rojos avisados en septiembre" valor={<Cuenta n={actual.rojos} />} />
        <Dato etiqueta="Con riesgo inmediato" valor={<Cuenta n={actual.riesgo} />} nota="Recibieron el bloque fijo: 911 y buscar un lugar con gente" />
        <Dato etiqueta="Tiempo hasta el aviso" valor={actual.mediana} nota="Mediana. Los rojos no esperan lote" />
        <Dato etiqueta="Avisos entregados" valor="Todos" nota="Correo en el demo; Twilio en el piloto" />
      </div>

      <Tarjeta titulo={PLANTEL} subtitulo="Destinatario: cargo designado por el plantel (por confirmar)" className="mt-4">
        <Tabla
          columnas={["Mes", "Rojos avisados", "Con riesgo inmediato", "Tiempo hasta el aviso", "Entregados"]}
          filas={respuesta.map((r) => [
            <span key="m" className="capitalize">{r.mes}</span>,
            <Cuenta key="r" n={r.rojos} />,
            <Cuenta key="i" n={r.riesgo} />,
            r.mediana,
            r.entregados,
          ])}
        />
      </Tarjeta>

      <Tarjeta titulo="Qué recibe el plantel" className="mt-4">
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-t-ink-2">
          <li>El resumen de dos líneas que escribe la IA, la celda, la franja y la ruta legal fija. Nada más.</li>
          <li>Sin nombre, sin código, sin texto original, sin hora exacta.</li>
          <li>No hay forma de responderle al estudiante ni de pedir más datos.</li>
          <li>La embajada no ve el contenido del aviso; solo que salió y cuánto tardó.</li>
        </ul>
      </Tarjeta>

      <Resguardo>
        Supuesto de la cotización: CONALEP designa a una persona por plantel que recibe los avisos. Sin eso, el aviso no tiene
        destino.
      </Resguardo>
    </>
  );
}
