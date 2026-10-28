import { Download } from "lucide-react";
import { Encabezado, Resguardo, Tabla, Tarjeta } from "@/components/tablero/ui";
import { accesos } from "@/lib/mock/tablero";

export default function Accesos() {
  return (
    <>
      <Encabezado
        titulo="Registro de accesos"
        subtitulo="Quién vio qué vista y cuándo. Este registro se entrega a CONALEP."
      >
        <button
          disabled
          title="Mockup: sin función"
          className="inline-flex items-center gap-2 rounded-lg border border-t-border px-3 py-1.5 text-sm font-medium text-t-muted"
        >
          <Download className="size-4" /> Exportar para CONALEP
        </button>
      </Encabezado>
      <Tarjeta>
        <Tabla
          columnas={["Fecha", "Franja", "Usuario", "Vista"]}
          filas={accesos.map((a) => [a.fecha, a.franja, a.usuario, a.vista])}
        />
      </Tarjeta>
      <Resguardo>Como en los mensajes, el registro guarda fecha y franja, no la hora exacta.</Resguardo>
    </>
  );
}
