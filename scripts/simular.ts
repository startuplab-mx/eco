// Recorre miles de conversaciones al azar para encontrar callejones sin salida.
// Uso: npm run simular [n]
import guionJson from "../data/guion.json";
import instJson from "../config/instancia.json";
import type { Estado, Guion, Instancia, Salida } from "../lib/tipos";
import { arrancar, crearEstado, responder, type Entrada } from "../lib/motor";
import { resumen } from "../lib/indices";

const g = guionJson as unknown as Guion;
const inst = instJson as Instancia;
const N = Number(process.argv[2] ?? 3000);

let semilla = 42;
const rand = () => ((semilla = (semilla * 1664525 + 1013904223) % 4294967296) / 4294967296);
const elige = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)];

const conteo = { verde: 0, amarillo: 0, rojo: 0, completas: 0, turnos: [] as number[], modulos: {} as Record<string, number> };
const textosLibres = ["no se", "me siento cansado de todo", "Juan me dijo que fuera", "vivo en calle Hidalgo 23", "me quiero morir", "pausa", "salir", "asdf"];

for (let i = 0; i < N; i++) {
  let { estado, salida } = arrancar(g, inst, crearEstado(rand));
  let turnos = 0;
  const vistos: Salida[] = [...salida];
  while (!estado.terminada) {
    if (++turnos > 200) throw new Error(`Sesión ${i} no termina`);
    const esp = estado.esperando!;
    let entrada: Entrada;
    const r = rand();
    if (r < 0.04) entrada = { texto: elige(textosLibres) };
    else if (esp.paso.tipo === "numero") entrada = rand() < 0.8 ? { texto: String(10 + Math.floor(rand() * 10)) } : { opcion: elige(esp.opciones).id };
    else if (esp.paso.tipo === "abierta") entrada = rand() < 0.5 ? { texto: "me gusta el futbol" } : { opcion: elige(esp.opciones).id };
    else if (esp.multiple) entrada = { opciones: esp.opciones.filter(() => rand() < 0.3).map((o) => o.id).concat(elige(esp.opciones).id) };
    else entrada = { opcion: elige(esp.opciones).id };
    ({ estado, salida } = responder(g, inst, estado, entrada));
    vistos.push(...salida);
  }
  for (const s of vistos) if ("texto" in s && /\{\w+\}/.test(s.texto)) throw new Error(`Marcador sin resolver: ${s.texto}`);
  const res = resumen(g, inst, estado as Estado);
  if (!["12-14", "15-16", "17-18", "menor_12", "adulto", "nd", null].includes(res.edad)) throw new Error(`Edad mal guardada: ${res.edad}`);
  if (JSON.stringify(res).match(/Juan|Hidalgo|futbol/)) throw new Error("Texto libre se filtró al resumen");
  conteo[res.nivel]++;
  if (res.completa) { conteo.completas++; conteo.turnos.push(turnos); }
  for (const m of res.modulos) conteo.modulos[m] = (conteo.modulos[m] ?? 0) + 1;
}

const t = conteo.turnos.sort((a, b) => a - b);
console.log(`${N} sesiones simuladas sin errores.`);
console.log(`Niveles: verde ${conteo.verde} · amarillo ${conteo.amarillo} · rojo ${conteo.rojo} · completas ${conteo.completas}`);
console.log(`Respuestas por sesión completa: mínimo ${t[0]}, mediana ${t[Math.floor(t.length / 2)]}, máximo ${t[t.length - 1]}`);
console.log("Módulos abiertos:", conteo.modulos);
