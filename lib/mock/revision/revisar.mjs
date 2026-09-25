// Revisión adversarial del chat (180 casos). Correr: node lib/mock/revision/revisar.mjs

import { conversar, detectar, limpiar } from "../conversacion.ts";
import { CASOS as A } from "./casos.mjs";
import { CASOS as B } from "./casos2.mjs";
const CASOS = [...A, ...B];

let ok = 0, mal = 0;
const fallas = [];
for (const c of CASOS) {
  const r = conversar(c.t);
  const f = detectar(c.t[0]);
  const l = limpiar(c.t[0]);
  const errores = [];
  if (c.clase) {
    const acept = Array.isArray(c.clase) ? c.clase : [c.clase];
    if (!acept.includes(r.clase)) errores.push(`clase=${r.clase} (esperado ${acept.join("/")})`);
  }
  if (c.p) {
    const seq = [...r.hechas, ...(r.pregunta ? [r.pregunta.campo + "*"] : [])];
    const seqCmp = seq.map((x) => x.replace("*", ""));
    if (JSON.stringify(seqCmp) !== JSON.stringify(c.p)) errores.push(`preguntas=[${seq}] (esperado [${c.p}])  (*=abierta)`);
  }
  if (c.cierre && r.cierre?.tipo !== c.cierre) errores.push(`cierre=${r.cierre?.tipo} (esperado ${c.cierre})`);
  if (c.limpio !== undefined && l.limpio !== c.limpio) errores.push(`limpio="${l.limpio}" (esperado "${c.limpio}")`);
  if (c.sinCambio && l.cambio) errores.push(`limpio="${l.limpio}" (no debía cambiar)`);
  if (errores.length) { mal++; fallas.push({ id: c.id, t: c.t, errores, f, hechas: r.hechas, abierta: r.pregunta?.campo, cierre: r.cierre }); }
  else ok++;
}
for (const x of fallas) console.log(`${x.id} ${JSON.stringify(x.t)}\n   ${x.errores.join(" | ")}`);
console.log(`\nTotal ${CASOS.length}: pasan ${ok}, fallan ${mal}`);

