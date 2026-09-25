import Mapa from "@/components/tablero/Mapa";
import { Encabezado, Resguardo } from "@/components/tablero/ui";

export default function PaginaMapa() {
  return (
    <>
      <Encabezado
        titulo="Mapa físico"
        subtitulo="Dónde se reporta el reclutamiento alrededor del plantel. Celdas gruesas elegidas por el estudiante; nunca coordenadas ni GPS."
      />
      <Mapa />
      <Resguardo>
        Sin puntos individuales. Una celda con menos de 5 reportes en el periodo aparece rayada y sin detalles.
      </Resguardo>
    </>
  );
}
