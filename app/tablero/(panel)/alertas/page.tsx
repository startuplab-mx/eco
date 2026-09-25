import Alertas from "@/components/tablero/Alertas";
import { Encabezado, Resguardo } from "@/components/tablero/ui";

export default function PaginaAlertas() {
  return (
    <>
      <Encabezado
        titulo="Alertas de patrón"
        subtitulo="Fichas que se generan solas cuando se cumple una regla. La ficha es lo único que sale del sistema; es la misma para la embajada y para CONALEP."
      />
      <Alertas />
      <Resguardo>
        Las fichas no traen texto libre, nombres ni códigos. Si los reportantes nombran a un grupo, la ficha solo dice que lo
        nombraron. En el piloto, cada alerta nueva también llega por correo.
      </Resguardo>
    </>
  );
}
