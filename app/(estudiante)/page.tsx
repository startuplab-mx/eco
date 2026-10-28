import Link from "next/link";
import textos from "@/config/textos.json";
import Encabezado from "@/components/estudiante/Encabezado";
import Radar from "@/components/estudiante/Radar";

export default function PaginaRadar() {
  return (
    <>
      <Encabezado />
      <main className="flex flex-1 flex-col gap-6 px-4 pt-2">
        <Radar />
        <div className="sticky bottom-0 mt-auto space-y-1 bg-gradient-to-t from-e-bg from-70% to-transparent pb-4 pt-6">
          <Link
            href="/contar"
            className="block rounded-2xl bg-e-acento py-4 text-center font-display text-lg font-bold text-e-acento-ink active:scale-[0.99]"
          >
            {textos.boton_contar}
          </Link>
        </div>
      </main>
    </>
  );
}
