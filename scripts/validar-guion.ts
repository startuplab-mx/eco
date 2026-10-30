// Revisa que el guion sea coherente: ids únicos, condiciones que apuntan
// a pasos existentes, rutas que apuntan a bloques existentes.
// Uso: npm run validar
import guionJson from "../data/guion.json";
import type { Condicion, Guion } from "../lib/tipos";

const g = guionJson as unknown as Guion;
const errores: string[] = [];
const ids = new Set<string>();

for (const b of Object.values(g.bloques)) {
  for (const p of b.pasos) {
    if (ids.has(p.id)) errores.push(`Paso repetido: ${p.id}`);
    ids.add(p.id);
    const tieneOpciones = p.escala || p.opciones?.length;
    if ((p.tipo === "opcion" || p.tipo === "multiple") && !tieneOpciones) errores.push(`${p.id}: sin opciones`);
    if (p.tipo === "abierta" && !p.rapidas?.some((o) => o.id === "prefiero" || o.id === "nada"))
      errores.push(`${p.id}: abierta sin "Prefiero no escribir"`);
  }
}

function revisa(c: Condicion, donde: string) {
  if ("todos" in c) return c.todos.forEach((x) => revisa(x, donde));
  if ("alguno" in c) return c.alguno.forEach((x) => revisa(x, donde));
  if ("no" in c) return revisa(c.no, donde);
  if ("cuenta" in c) return c.cuenta.pasos.forEach((p) => ids.has(p) || errores.push(`${donde}: paso inexistente ${p}`));
  if ("paso" in c && !ids.has(c.paso)) errores.push(`${donde}: paso inexistente ${c.paso}`);
}
for (const b of Object.values(g.bloques)) {
  for (const p of b.pasos) {
    if (p.si) revisa(p.si, p.id);
    for (const r of p.reacciones ?? []) if (r.si && "paso" in r.si) revisa(r.si as Condicion, p.id);
  }
}

const rutas = [...Object.values(g.ruta.porEmocion), ...Object.values(g.ruta.porAmbito), g.ruta.relleno, g.ruta.ordenNucleo].flat();
for (const x of rutas) if (!g.bloques[x]) errores.push(`Ruta apunta a bloque inexistente: ${x}`);
for (const e of g.ruta.prioridad) {
  if (!g.ruta.porEmocion[e]) errores.push(`Emoción sin ruta: ${e}`);
  if (!g.validaciones[e]) errores.push(`Emoción sin validación: ${e}`);
}
const opcEmo = g.bloques.entrada.pasos.find((p) => p.id === "en_emociones")!.opciones!.map((o) => o.id);
for (const e of opcEmo) if (!g.ruta.prioridad.includes(e)) errores.push(`Emoción sin prioridad: ${e}`);

const nItems = Object.values(g.bloques).flatMap((b) => b.pasos).filter((p) => p.item).length;
const nucleo = g.ruta.ordenNucleo.flatMap((v) => g.bloques[v].pasos).filter((p) => p.item).length;
console.log(`Guion v${g.version}: ${Object.keys(g.bloques).length} bloques, ${ids.size} pasos, ${nItems} ítems (${nucleo} en el núcleo V1–V9).`);
if (errores.length) {
  console.error(errores.join("\n"));
  process.exit(1);
}
console.log("Sin errores.");
