// Datos y guiones falsos para el lado del estudiante. Nada de esto llama a un
// modelo ni guarda nada: el chat sigue un guion según lo que se escriba.

import textos from "@/config/textos.json";

export type FilaRadar = keyof typeof textos.filas;
export type Periodo = "semana" | "mes";

export const FILAS: FilaRadar[] = [
  "dinero_chamba",
  "molestan_amenazan",
  "broncas",
  "maestro",
  "otras",
];

// Mensajes serios del plantel (excluye pruebas y bromas).
export const radar: Record<Periodo, Record<FilaRadar, number>> = {
  semana: { dinero_chamba: 6, molestan_amenazan: 5, broncas: 4, maestro: 3, otras: 5 },
  mes: { dinero_chamba: 22, molestan_amenazan: 20, broncas: 18, maestro: 9, otras: 20 },
};

export const MINIMO = 5;

export function totalRadar(p: Periodo) {
  return FILAS.reduce((s, f) => s + radar[p][f], 0);
}

// --- Chat ------------------------------------------------------------------
// La lógica de repreguntas vive en lib/mock/conversacion.ts.

// Textos de ejemplo para el demo (se precargan con /contar?e=escenario).
export const ejemplos = {
  normal: "un wey afuera nos dijo que si queríamos ganar una lana fácil",
  linea: "alguien está vendiendo droga en línea a los de la escuela",
  rojo: "me dijeron que el viernes a la salida me esperan en la parada para llevar algo y que si no voy ya saben dónde vivo",
  broma: "hola prueba jaja",
  primero: "un profe le manda mensajes en la noche a una compa y le regala cosas, soy de su mismo grupo",
};
export type Escenario = keyof typeof ejemplos;

export const CODIGO_DEMO = "K7P2QX";
