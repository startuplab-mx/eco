import Encabezado from "@/components/estudiante/Encabezado";
import Chat from "@/components/estudiante/Chat";
import { ejemplos, type Escenario } from "@/lib/mock/estudiante";

// ?e=normal|rojo|broma|primero precarga un texto de ejemplo para el demo.
export default async function PaginaContar({ searchParams }: PageProps<"/contar">) {
  const { e } = await searchParams;
  const inicial = typeof e === "string" && e in ejemplos ? ejemplos[e as Escenario] : "";
  return (
    <>
      <Encabezado atras="/" />
      <Chat inicial={inicial} />
    </>
  );
}
