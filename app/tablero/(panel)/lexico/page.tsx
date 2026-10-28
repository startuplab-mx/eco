import lexico from "@/config/lexico.json";
import ColaLexico from "@/components/tablero/ColaLexico";
import { Encabezado, Resguardo, Tarjeta } from "@/components/tablero/ui";

export default function Lexico() {
  return (
    <>
      <Encabezado
        titulo="Léxico"
        subtitulo="Términos que los estudiantes repiten y el sistema todavía no entiende. Se revisa una vez al mes; es la única intervención humana."
      />
      <ColaLexico />
      <Tarjeta titulo="Léxico vigente" subtitulo={`Versión ${lexico.version} · config/lexico.json`} className="mt-4">
        <ul className="flex flex-wrap gap-2">
          {lexico.terminos.map((t) => (
            <li key={t.termino} className="rounded-full border border-t-border px-3 py-1 text-sm" title={t.significado}>
              {t.termino}
            </li>
          ))}
        </ul>
      </Tarjeta>
      <Resguardo>Se proponen términos con 3 o más apariciones en 30 días. Se muestran sin el mensaje donde aparecieron.</Resguardo>
    </>
  );
}
