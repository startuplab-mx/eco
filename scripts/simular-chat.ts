// Simula conversaciones del chat del mockup desde la terminal.
//   node scripts/simular-chat.ts "mensaje" ["respuesta 1" ["respuesta 2"]]
//   node scripts/simular-chat.ts casos.json      (lista de { "turnos": [...] })
// Si faltan respuestas, se detiene en la pregunta abierta.

import { readFileSync } from "node:fs";
import { conversar, detectar, limpiar } from "../lib/mock/conversacion.ts";

function simular(turnos: string[]) {
  const r = conversar(turnos);
  const f = detectar(turnos[0]);
  const { limpio, cambio } = limpiar(turnos[0]);
  console.log(`\n> ${turnos[0]}`);
  if (cambio) console.log(`  limpio: ${limpio}`);
  console.log(
    `  clase: ${r.clase} · detectado: lugar=${f.lugar ?? "-"} exterior=${f.exterior} enLinea=${f.enLinea} medio=${f.medio ?? "-"} cuando=${f.cuando} oferta=${f.oferta ?? "-"} maestro=${f.maestro}`,
  );
  r.hechas.forEach((c, i) => {
    const respuesta = turnos[i + 1];
    console.log(`  pregunta ${i + 1} (${c})${respuesta ? ` → "${respuesta}"` : ""}`);
  });
  if (r.pregunta) console.log(`  ABIERTA: ${r.pregunta.texto} [${r.pregunta.opciones.join(" | ")}]`);
  if (r.cierre) console.log(`  cierre: ${r.cierre.tipo}${r.cierre.n ? ` (${r.cierre.n})` : ""}${r.cierre.rojo ? " + bloque rojo" : ""}`);
}

const args = process.argv.slice(2);
if (args.length === 1 && args[0].endsWith(".json")) {
  const casos: { turnos: string[] }[] = JSON.parse(readFileSync(args[0], "utf8"));
  casos.forEach((c) => simular(c.turnos));
} else if (args.length > 0) {
  simular(args);
} else {
  console.log('Uso: node scripts/simular-chat.ts "mensaje" ["respuesta" ...] | casos.json');
}
