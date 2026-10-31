// Genera docs/rubrica-codificacion.md a partir del guion: cómo se codifica cada respuesta.
// Uso: npx tsx scripts/rubrica.ts
import { writeFileSync } from "node:fs";
import guionJson from "../data/guion.json";
import type { Guion, Paso } from "../lib/tipos";
import { DIRECCION, UMBRALES } from "../lib/indices";

const g = guionJson as unknown as Guion;
const pasos: Paso[] = Object.values(g.bloques).flatMap((b) => b.pasos);
const medidos = pasos.filter((p) => p.item && p.variable);

const NOMBRE_ESCALA: Record<string, string> = { E5: "Frecuencia", A5: "Qué tanto", T5: "Termómetro" };
const OTRAS: Record<string, string> = {
  V9: "Apoyo y afrontamiento", V10: "Duelo", V17: "Modelos", V19: "Confianza institucional",
  V20: "Reconocimiento emocional", V21: "Intensidad y cronicidad", V22: "Expresión somática",
  ambito: "Ámbito", cierre: "Cierre", libre: "Espacio libre",
};

const texto = (p: Paso) => {
  const t = Array.isArray(p.texto) ? p.texto.join(" ") : p.texto ?? "";
  if (/^\{[^}]+\}$/.test(t.trim())) return "(pregunta de cierre que varía según la plática)";
  return (p.repetir ?? t).replace(/\{[^}]+\}/g, "…").replace(/\|/g, "/");
};
const tipoDato = (p: Paso) =>
  p.escala ? `Número 0–4 (${NOMBRE_ESCALA[p.escala]})${p.invertido ? " · **invertida en el índice**" : ""}`
  : p.tipo === "multiple" ? "Texto · varias categorías"
  : p.tipo === "opcion" ? "Texto · una categoría"
  : p.tipo === "abierta" ? "Sí/no escribió (el texto no se guarda)"
  : p.tipo === "numero" ? "Rango de edad (texto)"
  : p.tipo;
const opciones = (p: Paso) =>
  p.escala ? "ver escala" : (p.opciones ?? []).map((o) => `${o.label} (\`${o.id}\`)`).join(" · ") || "—";
const nombreVar = (v: string) => DIRECCION[v]?.nombre ?? OTRAS[v] ?? v;

const l: string[] = [];
l.push(`# Rúbrica de codificación de Eco (guion v${g.version})`, "");
l.push("Generada automáticamente desde el guion con `npx tsx scripts/rubrica.ts`. No se edita a mano.", "");
l.push("## Reglas", "");
l.push("1. **Sólo las escalas llevan número.** Son tres (frecuencia, qué tanto y termómetro), con cinco opciones cada una y siempre codificadas 0, 1, 2, 3, 4.");
l.push("2. **El número dice cuánto de lo que se pregunta:** más seguido, más fuerte o más. En los datos nunca se invierte.");
l.push("3. **Todo lo demás se guarda como texto**, para contar y graficar por categoría: sí/no, desde cuándo, cuánto duele, ¿crees que lo puedes lograr?, cómo te sientes ahora, emociones, zona del cuerpo, etc. En las columnas de Airtable aparece la etiqueta (\"Desde hace semanas\"); en el campo \"Respuestas (datos)\" aparece el código corto (`semanas`). Los dos se listan abajo.");
l.push("4. **Los mismos códigos significan lo mismo en todas las preguntas:** `si`, `no`, `nose` (No sé) y `nd` (Prefiero no decir).");
l.push("5. **\"No sé\" y \"Prefiero no decir\" son dato faltante:** no cuentan como 0 ni entran a los índices.");
l.push("6. **Preguntas abiertas:** sólo se registra si escribió o no. El texto nunca se guarda.");
l.push("7. **Índices 0–100:** promedio de las escalas de la variable ÷ 4 × 100. Cada índice tiene una dirección fija (ver abajo). Si una pregunta va en contra de su índice, se invierte sólo al calcularlo (4 − valor).", "");

l.push("## Escalas", "");
l.push("| Valor | Frecuencia (E5) | Qué tanto (A5) | Termómetro (T5) |", "|---|---|---|---|");
for (let i = 0; i < 5; i++) l.push(`| ${i} | ${g.escalas.E5[i].label} | ${g.escalas.A5[i].label} | ${g.escalas.T5[i].label} |`);
l.push("", "Si el joven escribe un número del 1 al 10 en el termómetro, se convierte: 1–2 → 0, 3–4 → 1, 5–6 → 2, 7–8 → 3, 9–10 → 4.", "");

l.push("## Índices", "");
l.push("| Índice | Dirección | Preguntas que entran |", "|---|---|---|");
for (const [v, d] of Object.entries(DIRECCION)) {
  const ps = medidos.filter((p) => p.variable === v && (p.escala === "E5" || p.escala === "A5"));
  l.push(`| ${v} ${d.nombre} | ${d.direccion === "riesgo" ? "Riesgo: más alto = peor" : "Protección: más alto = mejor"} | ${ps.map((p) => `\`${p.id}\`${p.invertido ? " (invertida)" : ""}`).join(", ")} |`);
}
l.push("| Malestar global | Riesgo: más alto = peor | Promedio de los índices V2, V3, V4 y V5 |");
l.push("| Cambio emocional | Positivo = bajó la intensidad | Termómetro inicial − final (−4 a 4) |", "");

l.push("## Cuándo una sesión es amarilla", "");
l.push(`- Termómetro inicial en ${g.escalas.T5[UMBRALES.termometro].label} (${UMBRALES.termometro}).`);
l.push(`- Desesperanza en ${g.escalas.E5[UMBRALES.desesperanza].label} o más (${UMBRALES.desesperanza}+).`);
l.push(`- Malestar global mayor a ${UMBRALES.malestar}.`);
l.push(`- Presión en ${g.escalas.E5[UMBRALES.presion].label} o más (${UMBRALES.presion}+).`);
l.push("- No tiene un adulto de confianza (`v9_adulto` = No).", "");
l.push("Una sesión roja (alarma) sólo registra escuela y semana.", "");

l.push("## Preguntas", "");
const vars = [...new Set(medidos.map((p) => p.variable!))];
for (const v of vars) {
  l.push(`### ${v.startsWith("V") ? `${v} ` : ""}${nombreVar(v)}`, "");
  l.push("| Pregunta | Código | Se guarda como | Opciones |", "|---|---|---|---|");
  for (const p of medidos.filter((q) => q.variable === v)) l.push(`| ${texto(p)} | \`${p.item}\` | ${tipoDato(p)} | ${opciones(p)} |`);
  l.push("");
}
l.push("### Datos generales", "", "| Pregunta | Se guarda como | Opciones |", "|---|---|---|");
for (const id of ["da_edad", "da_genero", "da_vive"]) {
  const p = pasos.find((q) => q.id === id)!;
  l.push(`| ${texto(p)} | ${tipoDato(p)} | ${id === "da_edad" ? "12 a 14 · 15 a 16 · 17 a 18 · Menor de 12 · Adulto" : opciones(p)} |`);
}
l.push("");

writeFileSync("docs/rubrica-codificacion.md", l.join("\n"));
console.log(`Rúbrica: ${medidos.length} preguntas medidas, ${Object.keys(DIRECCION).length} índices.`);
